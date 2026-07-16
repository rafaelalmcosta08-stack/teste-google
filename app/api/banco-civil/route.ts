import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const STATUS_FILE = path.join(process.cwd(), 'civis_status-data.json')
const PRISOES_FILE = path.join(process.cwd(), 'prisoes-data.json')
const OCORRENCIAS_FILE = path.join(process.cwd(), 'ocorrencias-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getCivilStatuses(): Promise<Record<string, string>> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin.from('civis_status').select('*')
      if (!error && data) {
        const statuses: Record<string, string> = {}
        data.forEach((row: any) => {
          statuses[row.nome.toLowerCase().trim()] = row.status
        })
        return statuses
      }
    } catch (_) {}
  }
  try {
    const content = await fs.readFile(STATUS_FILE, 'utf8')
    return JSON.parse(content)
  } catch (_) {
    return {}
  }
}

async function saveCivilStatus(nome: string, status: string) {
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('civis_status').upsert({
        nome: nome.trim(),
        status: status,
        updated_at: new Date().toISOString()
      })
    } catch (_) {}
  }
  const statuses = await getCivilStatuses()
  statuses[nome.toLowerCase().trim()] = status
  await fs.writeFile(STATUS_FILE, JSON.stringify(statuses, null, 2), 'utf8')
}

// Helper to read local prisoes as backup
async function readPrisoes(): Promise<any[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin.from('prisoes').select('*')
      if (!error && data) return data
    } catch (_) {}
  }
  try {
    const content = await fs.readFile(PRISOES_FILE, 'utf8')
    return JSON.parse(content)
  } catch (_) {
    return []
  }
}

// Helper to read local ocorrencias as backup
async function readOcorrencias(): Promise<any[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin.from('ocorrencias').select('*')
      if (!error && data) return data
    } catch (_) {}
  }
  try {
    const content = await fs.readFile(OCORRENCIAS_FILE, 'utf8')
    return JSON.parse(content)
  } catch (_) {
    return []
  }
}

export async function GET(req: NextRequest) {
  const nomeQuery = req.nextUrl.searchParams.get('nome') || ''
  const search = nomeQuery.trim().toLowerCase()

  if (!search) {
    return NextResponse.json({ error: 'Parâmetro nome é obrigatório.' }, { status: 400 })
  }

  try {
    const [statuses, allPrisoes, allOcorrencias] = await Promise.all([
      getCivilStatuses(),
      readPrisoes(),
      readOcorrencias()
    ])

    // Find occurrences where civil name is mentioned
    const matchedOcorrencias = allOcorrencias.filter((o: any) => {
      const env = (o.envolvidos || o.envolvidos_nome || '').toLowerCase()
      return env.includes(search)
    }).map((o: any) => ({
      id: o.id,
      tipo: o.tipo,
      descricao: o.descricao,
      envolvidos: o.envolvidos || o.envolvidos_nome,
      oficialQra: o.oficial_qra || o.oficialQra || 'Oficial',
      dataHora: o.data_hora || o.dataHora || o.created_at || new Date().toISOString()
    }))

    // Find prisons (antecedentes)
    const matchedPrisoes = allPrisoes.filter((p: any) => {
      const name = (p.preso_nome || '').toLowerCase()
      const rg = (p.preso_rg || '').toLowerCase()
      return name.includes(search) || rg.includes(search)
    }).map((p: any) => ({
      id: p.id,
      presoNome: p.preso_nome,
      presoRg: p.preso_rg,
      motivo: p.motivo,
      observacoes: p.observacoes,
      oficialQra: p.oficial_qra || p.oficialQra,
      dataHora: p.data_hora || p.created_at || new Date().toISOString()
    }))

    // Determine status (limpo / procurado)
    // Check if there is an exact status mapping, otherwise search partial or default to 'limpo'
    let status = 'limpo'
    if (statuses[search]) {
      status = statuses[search]
    } else {
      // Find matching key
      const key = Object.keys(statuses).find(k => k.includes(search) || search.includes(k))
      if (key) {
        status = statuses[key]
      }
    }

    return NextResponse.json({
      nome: nomeQuery,
      status,
      ocorrencias: matchedOcorrencias,
      antecedentes: matchedPrisoes
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nome, status } = body

    if (!nome || !status) {
      return NextResponse.json({ error: 'nome e status são obrigatórios.' }, { status: 400 })
    }

    await saveCivilStatus(nome, status)
    return NextResponse.json({ success: true, nome, status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
