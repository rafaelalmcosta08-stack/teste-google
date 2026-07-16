import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'promocoes-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const PATENTES = [
  'Coronel',
  'Tenente-Coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aluno Oficial',
  'Sub Tenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Cabo',
  'Soldado',
  'Recruta',
]

export interface Promocao {
  id: string
  oficialId: string
  oficialUsername: string
  oficialQra: string
  cargoAnterior: string
  cargoNovo: string
  observacao?: string
  creatorId: string
  creatorQra: string
  createdAt: string
}

async function readPromocoes(): Promise<Promocao[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin
        .from('promocoes')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          oficialId: row.oficial_id,
          oficialUsername: row.oficial_username,
          oficialQra: row.oficial_qra,
          cargoAnterior: row.cargo_anterior,
          cargoNovo: row.cargo_novo,
          observacao: row.observacao || '',
          creatorId: row.creator_id,
          creatorQra: row.creator_qra,
          createdAt: row.created_at || new Date().toISOString()
        }))
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

async function writePromocao(promocao: Promocao, list: Promocao[]) {
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('promocoes').insert({
        id: promocao.id,
        oficial_id: promocao.oficialId,
        oficial_username: promocao.oficialUsername,
        oficial_qra: promocao.oficialQra,
        cargo_anterior: promocao.cargoAnterior,
        cargo_novo: promocao.cargoNovo,
        observacao: promocao.observacao || '',
        creator_id: promocao.creatorId,
        creator_qra: promocao.creatorQra,
        created_at: promocao.createdAt
      })
    } catch (_) {}
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8')
}

export async function GET(req: NextRequest) {
  try {
    const promocoes = await readPromocoes()
    return NextResponse.json({ promocoes })
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
  const isAltoComando = cargos.includes('Alto Comando') || requesterMeta.role === 'admin'

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Apenas membros do Alto Comando podem publicar promoções.' }, { status: 403 })
  }

  const body = await req.json()
  const { oficialId, cargoNovo, observacao } = body

  if (!oficialId || !cargoNovo) {
    return NextResponse.json({ error: 'Os campos oficialId e cargoNovo são obrigatórios.' }, { status: 400 })
  }

  // Fetch promoted official
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(oficialId)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Oficial não encontrado.' }, { status: 404 })
  }

  const metaAtual = userData.user.user_metadata ?? {}
  const cargoAnterior = PATENTES.includes(cargoNovo)
    ? (metaAtual.patente || 'Recruta')
    : (metaAtual.cargo && metaAtual.cargo.length > 0 ? metaAtual.cargo[0] : 'Nenhum')

  // Prepare updated metadata
  const updatedMeta = { ...metaAtual }
  const isPatente = PATENTES.includes(cargoNovo)

  if (isPatente) {
    updatedMeta.patente = cargoNovo
  } else {
    updatedMeta.cargo = [cargoNovo]
  }

  // Update target user
  const { error: updateError } = await admin.auth.admin.updateUserById(oficialId, {
    user_metadata: updatedMeta,
  })

  if (updateError) {
    return NextResponse.json({ error: `Erro ao atualizar perfil do oficial: ${updateError.message}` }, { status: 500 })
  }

  // Best-effort database updates
  if (isPatente) {
    await admin.from('profiles').update({ patente: cargoNovo }).eq('id', oficialId).then(() => {}).catch(() => {})
  }

  // Save audit log
  try {
    const { writeAuditLog } = await import('@/lib/audit')
    const targetQra = metaAtual.qra || metaAtual.username || 'Oficial'
    const updaterQra = requesterMeta.qra || requesterMeta.username || 'Alto Comando'

    await writeAuditLog({
      whoId: requester.id,
      whoQra: updaterQra,
      action: isPatente ? 'ALTERACAO_PATENTE' : 'ALTERACAO_CARGO',
      targetUser: targetQra,
      description: `Promovido de ${cargoAnterior} para ${cargoNovo}. Obs: ${observacao || 'Nenhuma'}`
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }

  const newPromocao: Promocao = {
    id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oficialId,
    oficialUsername: metaAtual.username || '',
    oficialQra: metaAtual.qra || metaAtual.username || 'Oficial',
    cargoAnterior,
    cargoNovo,
    observacao: observacao || '',
    creatorId: requester.id,
    creatorQra: requesterMeta.qra || requesterMeta.username || 'Alto Comando',
    createdAt: new Date().toISOString()
  }

  const currentList = await readPromocoes()
  currentList.unshift(newPromocao)
  await writePromocao(newPromocao, currentList)

  // Notify everyone in real-time
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('promocoes-update', { promocao: newPromocao })
  } catch (_) {}

  return NextResponse.json({ success: true, promocao: newPromocao })
}
