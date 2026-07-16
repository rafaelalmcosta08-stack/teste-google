import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'ocorrencias-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Ocorrencia {
  id: string
  oficialId: string
  oficialQra: string
  oficialUsername: string
  tipo: string
  envolvidos: string
  descricao: string
  dataHora: string
  createdAt: string
}

async function readOcorrencias(): Promise<Ocorrencia[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin
        .from('ocorrencias')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          oficialId: row.oficial_id,
          oficialQra: row.oficial_qra,
          oficialUsername: row.oficial_username,
          tipo: row.tipo,
          envolvidos: row.envolvidos,
          descricao: row.descricao,
          dataHora: row.data_hora || row.created_at || new Date().toISOString(),
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

async function writeOcorrencia(ocorrencia: Ocorrencia, list: Ocorrencia[]) {
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('ocorrencias').insert({
        id: ocorrencia.id,
        oficial_id: ocorrencia.oficialId,
        oficial_qra: ocorrencia.oficialQra,
        oficial_username: ocorrencia.oficialUsername,
        tipo: ocorrencia.tipo,
        envolvidos: ocorrencia.envolvidos,
        descricao: ocorrencia.descricao,
        data_hora: ocorrencia.dataHora,
        created_at: ocorrencia.createdAt
      })
    } catch (_) {}
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8')
}

export async function GET(req: NextRequest) {
  try {
    const list = await readOcorrencias()
    return NextResponse.json({ ocorrencias: list })
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

  const body = await req.json()
  const { oficialId, tipo, envolvidos, descricao } = body

  if (!oficialId || !tipo || !envolvidos || !descricao) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
  }

  // Fetch the officer who is responsible (autocomplete chosen user or requester themselves)
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(oficialId)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Oficial responsável não encontrado.' }, { status: 404 })
  }

  const oficialMeta = userData.user.user_metadata ?? {}
  const nowStr = new Date().toISOString()

  const newOcorrencia: Ocorrencia = {
    id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oficialId,
    oficialQra: oficialMeta.qra || oficialMeta.username || 'Oficial',
    oficialUsername: oficialMeta.username || '',
    tipo,
    envolvidos,
    descricao,
    dataHora: nowStr,
    createdAt: nowStr
  }

  const list = await readOcorrencias()
  list.unshift(newOcorrencia)
  await writeOcorrencia(newOcorrencia, list)

  // Log audit
  try {
    const { writeAuditLog } = await import('@/lib/audit')
    const updaterQra = requesterMeta.qra || requesterMeta.username || 'Oficial'
    await writeAuditLog({
      whoId: requester.id,
      whoQra: updaterQra,
      action: 'REGISTRO_OCORRENCIA',
      targetUser: newOcorrencia.oficialQra,
      description: `Registrou nova ocorrência de tipo [${tipo}]. Envolvidos: ${envolvidos}`
    })
  } catch (_) {}

  // Trigger real-time broadcast
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('ocorrencias-update', { ocorrencia: newOcorrencia })
  } catch (_) {}

  return NextResponse.json({ success: true, ocorrencia: newOcorrencia })
}
