import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'avisos-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Aviso {
  id: string
  title: string
  content: string
  creatorId: string
  creatorQra: string
  createdAt: string
  readBy: string[]
}

async function readAvisos(): Promise<Aviso[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin.from('avisos').select('*')
      if (!error && data) {
        // Table exists! Let's check if we should migrate local data
        if (data.length === 0) {
          try {
            const localContent = await fs.readFile(DATA_FILE, 'utf8')
            const localAvisos = JSON.parse(localContent) as Aviso[]
            if (localAvisos.length > 0) {
              const toInsert = localAvisos.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                creator_id: a.creatorId,
                creator_qra: a.creatorQra,
                created_at: a.createdAt,
                read_by: a.readBy || []
              }))
              await admin.from('avisos').insert(toInsert)
              return localAvisos
            }
          } catch (_) {
            // No local data or error reading it, ignore
          }
        }
        // Map database columns back to camelCase properties
        return data.map((row: any) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          creatorId: row.creator_id,
          creatorQra: row.creator_qra,
          createdAt: row.created_at || new Date().toISOString(),
          readBy: Array.isArray(row.read_by) ? row.read_by : []
        }))
      }
    } catch (err) {
      console.error('Database avisos read error:', err)
    }
  }

  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    return []
  }
}

async function writeAvisos(avisos: Aviso[]) {
  const admin = getAdminClient()
  if (admin) {
    try {
      const toInsert = avisos.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        creator_id: a.creatorId,
        creator_qra: a.creatorQra,
        created_at: a.createdAt,
        read_by: a.readBy || []
      }))

      const ids = avisos.map(a => a.id)
      if (ids.length > 0) {
        await admin.from('avisos').delete().not('id', 'in', `(${ids.join(',')})`)
        await admin.from('avisos').upsert(toInsert)
      } else {
        await admin.from('avisos').delete().neq('id', 'placeholder_nonexistent')
      }
    } catch (err) {
      console.error('Database avisos write error:', err)
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(avisos, null, 2), 'utf8')
}

async function broadcastUpdate() {
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('avisos-updated', {})
  } catch (err) {
    console.error('Failed to broadcast avisos update', err)
  }
}

export async function GET(req: NextRequest) {
  const avisos = await readAvisos()
  // Sort from newest to oldest
  const sorted = [...avisos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ avisos: sorted })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  if (requesterMeta.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado. Acesso pendente ou revogado.' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  const myCargos: string[] = requesterMeta.cargo ?? []
  const isAltoComando = myCargos.includes('Alto Comando') || requesterMeta.role === 'admin'

  const avisos = await readAvisos()

  if (action === 'create') {
    if (!isAltoComando) {
      return NextResponse.json({ error: 'Apenas membros do Alto Comando podem publicar avisos.' }, { status: 403 })
    }

    const { title, content } = body
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Preencha o título e o conteúdo do aviso.' }, { status: 400 })
    }

    const newAviso: Aviso = {
      id: Math.random().toString(36).substring(2, 15),
      title: title.trim(),
      content: content.trim(),
      creatorId: requester.id,
      creatorQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      createdAt: new Date().toISOString(),
      readBy: [requester.id], // Creator has read it by default
    }

    avisos.push(newAviso)
    await writeAvisos(avisos)
    await broadcastUpdate()

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'PUBLICA_AVISO',
        targetUser: 'Geral',
        description: `Publicou um novo aviso: "${newAviso.title}"`
      })
    } catch (e) {
      console.error('Failed to write audit log for notice create:', e)
    }

    return NextResponse.json({ success: true, aviso: newAviso })
  }

  if (action === 'edit') {
    const { id, title, content } = body
    const avisoIndex = avisos.findIndex(a => a.id === id)
    if (avisoIndex === -1) {
      return NextResponse.json({ error: 'Aviso não encontrado.' }, { status: 404 })
    }

    const aviso = avisos[avisoIndex]
    const canManage = isAltoComando || aviso.creatorId === requester.id

    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão para editar este aviso.' }, { status: 403 })
    }

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Preencha o título e o conteúdo do aviso.' }, { status: 400 })
    }

    aviso.title = title.trim()
    aviso.content = content.trim()

    await writeAvisos(avisos)
    await broadcastUpdate()

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EDICAO_AVISO',
        targetUser: 'Geral',
        description: `Editou o aviso: "${aviso.title}"`
      })
    } catch (e) {
      console.error('Failed to write audit log for notice edit:', e)
    }

    return NextResponse.json({ success: true, aviso })
  }

  if (action === 'delete') {
    const { id } = body
    const avisoIndex = avisos.findIndex(a => a.id === id)
    if (avisoIndex === -1) {
      return NextResponse.json({ error: 'Aviso não encontrado.' }, { status: 404 })
    }

    const aviso = avisos[avisoIndex]
    const canManage = isAltoComando || aviso.creatorId === requester.id

    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão para excluir este aviso.' }, { status: 403 })
    }

    avisos.splice(avisoIndex, 1)
    await writeAvisos(avisos)
    await broadcastUpdate()

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EXCLUSAO_AVISO',
        targetUser: 'Geral',
        description: `Excluiu o aviso: "${aviso.title}"`
      })
    } catch (e) {
      console.error('Failed to write audit log for notice delete:', e)
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'mark-read') {
    const { id } = body
    const avisoIndex = avisos.findIndex(a => a.id === id)
    if (avisoIndex === -1) {
      return NextResponse.json({ error: 'Aviso não encontrado.' }, { status: 404 })
    }

    const aviso = avisos[avisoIndex]
    if (!aviso.readBy.includes(requester.id)) {
      aviso.readBy.push(requester.id)
      await writeAvisos(avisos)
      await broadcastUpdate()
    }

    return NextResponse.json({ success: true, aviso })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
