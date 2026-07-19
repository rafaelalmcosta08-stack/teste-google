import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveImageUrl } from '@/lib/image-resolver'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Viatura {
  id: string
  name: string
  photoUrl: string | null
  prefix: string
  unit: string
  minPatente: string
  createdAt: string
}

async function readViaturas(): Promise<Viatura[]> {
  const admin = getAdminClient()
  if (!admin) return []
  try {
    const { data, error } = await admin
      .from('viaturas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      photoUrl: row.photo_url,
      prefix: row.prefix,
      unit: row.unit,
      minPatente: row.min_patente,
      createdAt: row.created_at || new Date().toISOString()
    }))
  } catch (err) {
    console.error('Database viaturas read error:', err)
    return []
  }
}

export async function GET(req: NextRequest) {
  const viaturas = await readViaturas()
  return NextResponse.json({ viaturas })
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

  const myCargos: string[] = requesterMeta.cargo ?? []
  const isAltoComando = myCargos.includes('Alto Comando') || requesterMeta.role === 'admin'

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Apenas membros do Alto Comando podem gerenciar viaturas.' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const { name, photoUrl, prefix, unit, minPatente } = body
    if (!name?.trim() || !unit?.trim() || !minPatente) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const resolvedPhotoUrl = await resolveImageUrl(photoUrl || '')
    const finalPrefix = prefix?.trim() || `VT-${Math.floor(100 + Math.random() * 900)}`
    const minPatenteStr = Array.isArray(minPatente) ? JSON.stringify(minPatente) : String(minPatente).trim()

    const newViatura = {
      id: Math.random().toString(36).substring(2, 15),
      name: name.trim(),
      photo_url: resolvedPhotoUrl || null,
      prefix: finalPrefix,
      unit: unit.trim(),
      min_patente: minPatenteStr,
      created_at: new Date().toISOString()
    }

    const { error } = await admin.from('viaturas').insert(newViatura)
    if (error) {
      return NextResponse.json({ error: 'Erro ao inserir no banco de dados.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'CADASTRO_VIATURA',
        targetUser: 'Geral',
        description: `Cadastrou a viatura: "${newViatura.name}" (${newViatura.prefix})`
      })
    } catch (e) {
      console.error('Failed to write audit log for viatura create:', e)
    }

    return NextResponse.json({ success: true, viatura: newViatura })
  }

  if (action === 'edit') {
    const { id, name, photoUrl, prefix, unit, minPatente } = body
    if (!id) {
      return NextResponse.json({ error: 'ID da viatura é obrigatório.' }, { status: 400 })
    }

    const resolvedPhotoUrl = await resolveImageUrl(photoUrl || '')
    const finalPrefix = prefix?.trim() || `VT-${Math.floor(100 + Math.random() * 900)}`
    const minPatenteStr = Array.isArray(minPatente) ? JSON.stringify(minPatente) : minPatente ? String(minPatente).trim() : 'Recruta'

    const updated = {
      name: name?.trim(),
      photo_url: resolvedPhotoUrl || null,
      prefix: finalPrefix,
      unit: unit?.trim(),
      min_patente: minPatenteStr,
    }

    const { error } = await admin.from('viaturas').update(updated).eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar viatura.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EDICAO_VIATURA',
        targetUser: 'Geral',
        description: `Editou a viatura: "${updated.name}" (${updated.prefix})`
      })
    } catch (e) {
      console.error('Failed to write audit log for viatura edit:', e)
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'ID da viatura é obrigatório.' }, { status: 400 })
    }

    const { error } = await admin.from('viaturas').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao excluir viatura.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EXCLUSAO_VIATURA',
        targetUser: 'Geral',
        description: `Excluiu a viatura com ID: ${id}`
      })
    } catch (e) {
      console.error('Failed to write audit log for viatura delete:', e)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
