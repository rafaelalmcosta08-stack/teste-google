import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'punicoes-data.json')
const CHATS_FILE = path.join(process.cwd(), 'chats-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Punicao {
  id: string
  oficialId: string
  oficialQra: string
  oficialUsername: string
  motivo: string
  tipoAdvertencia: string
  creatorId: string
  creatorQra: string
  status: 'ativa' | 'mantida' | 'removida'
  recorrida: boolean
  recursoStatus?: 'pendente' | 'mantido' | 'removido'
  createdAt: string
}

async function readPunicoes(): Promise<Punicao[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin
        .from('punicoes_administrativas')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        return data.map((row: any) => {
          let motivoText = row.motivo || ''
          let tipoAdv = row.tipo_advertencia || '1º Advertência'
          
          // Fallback parsing from [Tipo] Motivo if column is missing or null
          if (!row.tipo_advertencia && motivoText.startsWith('[')) {
            const endIdx = motivoText.indexOf(']')
            if (endIdx > 0) {
              tipoAdv = motivoText.substring(1, endIdx)
              motivoText = motivoText.substring(endIdx + 1).trim()
            }
          }

          return {
            id: row.id,
            oficialId: row.oficial_id,
            oficialQra: row.oficial_qra,
            oficialUsername: row.oficial_username,
            motivo: motivoText,
            tipoAdvertencia: tipoAdv,
            creatorId: row.creator_id,
            creatorQra: row.creator_qra,
            status: row.status,
            recorrida: row.recorrida,
            recursoStatus: row.recurso_status || undefined,
            createdAt: row.created_at || new Date().toISOString()
          }
        })
      }
    } catch (_) {}
  }
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (_) {
    return []
  }
}

async function writePunicoesList(list: Punicao[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8')
}

async function saveNewPunicao(punicao: Punicao) {
  const admin = getAdminClient()
  if (admin) {
    try {
      // First try to insert with tipo_advertencia
      const { error } = await admin.from('punicoes_administrativas').insert({
        id: punicao.id,
        oficial_id: punicao.oficialId,
        oficial_qra: punicao.oficialQra,
        oficial_username: punicao.oficialUsername,
        motivo: punicao.motivo,
        tipo_advertencia: punicao.tipoAdvertencia,
        creator_id: punicao.creatorId,
        creator_qra: punicao.creatorQra,
        status: punicao.status,
        recorrida: punicao.recorrida,
        recurso_status: punicao.recursoStatus || null,
        created_at: punicao.createdAt
      })

      // If column is missing in older DBs, retry by encoding tipoAdvertencia inside the motivo column
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        await admin.from('punicoes_administrativas').insert({
          id: punicao.id,
          oficial_id: punicao.oficialId,
          oficial_qra: punicao.oficialQra,
          oficial_username: punicao.oficialUsername,
          motivo: `[${punicao.tipoAdvertencia}] ${punicao.motivo}`,
          creator_id: punicao.creatorId,
          creator_qra: punicao.creatorQra,
          status: punicao.status,
          recorrida: punicao.recorrida,
          recurso_status: punicao.recursoStatus || null,
          created_at: punicao.createdAt
        })
      }
    } catch (_) {}
  }
  const list = await readPunicoes()
  // Ensure we don't end up with local file duplicate of the new punicao
  const filteredList = list.filter(p => p.id !== punicao.id)
  filteredList.unshift(punicao)
  await writePunicoesList(filteredList)
}

async function updatePunicaoInDB(punicao: Punicao) {
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('punicoes_administrativas').update({
        status: punicao.status,
        recorrida: punicao.recorrida,
        recurso_status: punicao.recursoStatus || null
      }).eq('id', punicao.id)
    } catch (_) {}
  }
  const list = await readPunicoes()
  const idx = list.findIndex(p => p.id === punicao.id)
  if (idx !== -1) {
    list[idx] = punicao
    await writePunicoesList(list)
  }
}

async function deletePunicaoInDB(id: string) {
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('punicoes_administrativas').delete().eq('id', id)
    } catch (_) {}
  }
  const list = await readPunicoes()
  const filtered = list.filter(p => p.id !== id)
  await writePunicoesList(filtered)
}

// Helper to inject recourse system chat messages directly
async function addSystemChatMessage(canal: string, content: string) {
  try {
    const newMessage = {
      id: Math.random().toString(36).substring(2, 15),
      canal,
      userId: '00000000-0000-0000-0000-000000000000',
      username: 'Sistema',
      qra: 'SISTEMA',
      patente: 'Corregedoria',
      cargo: 'Sistema',
      content,
      createdAt: new Date().toISOString()
    }
    
    let currentChats: any[] = []
    try {
      const fileContent = await fs.readFile(CHATS_FILE, 'utf8')
      currentChats = JSON.parse(fileContent)
    } catch (_) {}
    
    currentChats.push(newMessage)
    await fs.writeFile(CHATS_FILE, JSON.stringify(currentChats, null, 2), 'utf8')

    const admin = getAdminClient()
    if (admin) {
      await admin.from('chats').insert({
        id: newMessage.id,
        canal,
        user_id: newMessage.userId,
        username: newMessage.username,
        qra: newMessage.qra,
        patente: newMessage.patente,
        cargo: newMessage.cargo,
        content,
        created_at: newMessage.createdAt
      }).catch(() => {})
    }

    // Broadcast
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('chat-message', { canal, message: newMessage })
  } catch (e) {
    console.error('Failed to write system chat message:', e)
  }
}

export async function GET(req: NextRequest) {
  try {
    const list = await readPunicoes()
    return NextResponse.json({ punicoes: list })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Servidor incompleto.' }, { status: 500 })
  }

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  const cargos = requesterMeta.cargo || []
  const isDiretorCorregedoria = cargos.includes('Diretor Corregedoria') || requesterMeta.role === 'admin'

  if (!isDiretorCorregedoria) {
    return NextResponse.json({ error: 'Apenas o Diretor da Corregedoria pode aplicar punições.' }, { status: 403 })
  }

  const body = await req.json()
  const { oficialId, motivo, tipoAdvertencia } = body

  const selectedTipo = tipoAdvertencia || '1º Advertência'

  if (!oficialId || !motivo) {
    return NextResponse.json({ error: 'Oficial e Motivo são obrigatórios.' }, { status: 400 })
  }

  // Get target user
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(oficialId)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Oficial não encontrado.' }, { status: 404 })
  }

  const targetMeta = userData.user.user_metadata ?? {}
  const targetCargosRaw = targetMeta.cargo || []
  const targetCargos = Array.isArray(targetCargosRaw)
    ? targetCargosRaw
    : typeof targetCargosRaw === 'string'
      ? [targetCargosRaw]
      : []

  const targetAdvertenciasRaw = targetMeta.advertencia || []
  const targetAdvertencias = Array.isArray(targetAdvertenciasRaw)
    ? targetAdvertenciasRaw
    : typeof targetAdvertenciasRaw === 'string'
      ? [targetAdvertenciasRaw]
      : []

  let updatedCargos = [...targetCargos]
  if (!updatedCargos.includes('Sob Advertência')) {
    updatedCargos.push('Sob Advertência')
  }

  let updatedAdvertencias = [...targetAdvertencias]
  if (!updatedAdvertencias.includes(selectedTipo)) {
    updatedAdvertencias.push(selectedTipo)
  }

  // Update target user's metadata in a single step
  await admin.auth.admin.updateUserById(oficialId, {
    user_metadata: {
      ...targetMeta,
      cargo: updatedCargos,
      advertencia: updatedAdvertencias
    }
  })

  const newPunicao: Punicao = {
    id: 'pun_' + Math.random().toString(36).substring(2, 11),
    oficialId,
    oficialQra: targetMeta.qra || targetMeta.username || 'Oficial',
    oficialUsername: targetMeta.username || '',
    motivo,
    tipoAdvertencia: selectedTipo,
    creatorId: requester.id,
    creatorQra: requesterMeta.qra || requesterMeta.username || 'Diretor Corregedoria',
    status: 'ativa',
    recorrida: false,
    createdAt: new Date().toISOString()
  }

  await saveNewPunicao(newPunicao)

  // Write audit log
  try {
    const { writeAuditLog } = await import('@/lib/audit')
    await writeAuditLog({
      whoId: requester.id,
      whoQra: requesterMeta.qra || requesterMeta.username || 'Diretor Corregedoria',
      action: 'PUNICAO_ADMINISTRATIVA',
      targetUser: newPunicao.oficialQra,
      description: `Aplicou punição administrativa. Motivo: ${motivo}`
    })
  } catch (_) {}

  // SSE update
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('punicoes-update', { punicao: newPunicao })
  } catch (_) {}

  return NextResponse.json({ success: true, punicao: newPunicao })
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Servidor incompleto.' }, { status: 500 })
  }

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  const requesterCargos = requesterMeta.cargo || []

  const body = await req.json()
  const { action, punicaoId, decisao } = body

  if (!punicaoId || !action) {
    return NextResponse.json({ error: 'punicaoId e action são obrigatórios.' }, { status: 400 })
  }

  const punicoes = await readPunicoes()
  const punicao = punicoes.find(p => p.id === punicaoId)

  if (!punicao) {
    return NextResponse.json({ error: 'Punição não encontrada.' }, { status: 404 })
  }

  if (action === 'recorrer') {
    // Check if requester is the punished official
    if (requester.id !== punicao.oficialId) {
      return NextResponse.json({ error: 'Apenas o oficial punido pode recorrer desta punição.' }, { status: 403 })
    }

    if (punicao.recorrida) {
      return NextResponse.json({ error: 'Você já recorreu desta punição.' }, { status: 400 })
    }

    punicao.recorrida = true
    punicao.recursoStatus = 'pendente'

    await updatePunicaoInDB(punicao)

    const canalName = `recurso_${punicao.id}`
    await addSystemChatMessage(
      canalName,
      `🚨 RECURSO INICIADO: O oficial ${punicao.oficialQra} recorreu de sua punição administrativa por "${punicao.motivo}". Diretor da Corregedoria e Alto Comando analisarão a contestação neste chat privado.`
    )

    try {
      const { broadcastEvent } = await import('@/app/api/events/route')
      broadcastEvent('punicoes-update', { punicao })
    } catch (_) {}

    return NextResponse.json({ success: true, punicao })
  }

  if (action === 'decidir') {
    const isAltoComando = requesterCargos.includes('Alto Comando') || requesterMeta.role === 'admin'
    const isDiretorCorregedoria = requesterCargos.includes('Diretor Corregedoria')

    if (!isAltoComando && !isDiretorCorregedoria) {
      return NextResponse.json({ error: 'Apenas o Alto Comando ou Diretor Corregedoria podem decidir recursos.' }, { status: 403 })
    }

    if (!decisao || !['manter', 'remover'].includes(decisao)) {
      return NextResponse.json({ error: 'Decisão inválida. Escolha "manter" ou "remover".' }, { status: 400 })
    }

    const canalName = `recurso_${punicao.id}`

    if (decisao === 'manter') {
      punicao.status = 'mantida'
      punicao.recursoStatus = 'mantido'
      await updatePunicaoInDB(punicao)

      await addSystemChatMessage(
        canalName,
        `❌ DECISÃO FINAL: O recurso foi INDEFERIDO por ${requesterMeta.qra || requesterMeta.username}. A punição administrativa permanece ATIVA de forma irrecorrível. Este chat foi encerrado e travado.`
      )

      // Audit log
      try {
        const { writeAuditLog } = await import('@/lib/audit')
        await writeAuditLog({
          whoId: requester.id,
          whoQra: requesterMeta.qra || requesterMeta.username || 'Corregedoria',
          action: 'DECISAO_RECURSO',
          targetUser: punicao.oficialQra,
          description: `Indeferiu o recurso administrativo de ${punicao.oficialQra}. Punição mantida.`
        })
      } catch (_) {}

    } else if (decisao === 'remover') {
      // Defer recourse, remove tag/status "Sob Advertência" from official, delete punicao
      punicao.status = 'removida'
      punicao.recursoStatus = 'removido'

      // Remove "Sob Advertência" and the specific warning type from target official metadata
      const { data: targetUserData } = await admin.auth.admin.getUserById(punicao.oficialId)
      if (targetUserData?.user) {
        const targetMeta = targetUserData.user.user_metadata ?? {}
        const targetCargos = targetMeta.cargo || []
        const updatedCargos = targetCargos.filter((c: string) => c !== 'Sob Advertência')

        const targetAdvertencias = targetMeta.advertencia || []
        const updatedAdvertencias = targetAdvertencias.filter((a: string) => a !== punicao.tipoAdvertencia)

        await admin.auth.admin.updateUserById(punicao.oficialId, {
          user_metadata: { 
            ...targetMeta, 
            cargo: updatedCargos,
            advertencia: updatedAdvertencias
          }
        })
      }

      await addSystemChatMessage(
        canalName,
        `✅ DECISÃO FINAL: O recurso foi DEFERIDO por ${requesterMeta.qra || requesterMeta.username}. A punição foi ANULADA e a advertência "Sob Advertência" foi removida com sucesso. Este caso foi encerrado e arquivado.`
      )

      // Delete punição from DB completely
      await deletePunicaoInDB(punicao.id)

      // Audit log
      try {
        const { writeAuditLog } = await import('@/lib/audit')
        await writeAuditLog({
          whoId: requester.id,
          whoQra: requesterMeta.qra || requesterMeta.username || 'Corregedoria',
          action: 'DECISAO_RECURSO',
          targetUser: punicao.oficialQra,
          description: `Deferiu o recurso administrativo de ${punicao.oficialQra}. Punição removida.`
        })
      } catch (_) {}
    }

    try {
      const { broadcastEvent } = await import('@/app/api/events/route')
      broadcastEvent('punicoes-update', { punicao })
    } catch (_) {}

    return NextResponse.json({ success: true, punicao })
  }

  return NextResponse.json({ error: 'Ação não suportada.' }, { status: 400 })
}
