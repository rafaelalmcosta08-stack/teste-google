import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const CURSOS_DATA_FILE = path.join(process.cwd(), 'cursos-data.json')
const EDITAIS_DATA_FILE = path.join(process.cwd(), 'editais-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  const cargos: string[] = requesterMeta.cargo ?? []
  const isAltoComando = cargos.includes('Alto Comando') || requesterMeta.role === 'admin'

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Acesso negado. Apenas o Alto Comando possui acesso a estes dados.' }, { status: 403 })
  }

  // 1. Fetch Users from Supabase Auth List Users
  let usuarios: any[] = []
  try {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (!error && data) {
      usuarios = (data.users ?? [])
        .filter((u) => u.user_metadata?.username)
        .map((u) => {
          const meta = u.user_metadata ?? {}
          const now = new Date()
          const lastLoginStr = meta.last_login_at || u.created_at || new Date(0).toISOString()
          const lastLogin = new Date(lastLoginStr)
          const overrideStr = meta.status_atividade_override_at
          const overrideDate = overrideStr ? new Date(overrideStr) : null
          
          const referenciaDate = overrideDate && overrideDate > lastLogin ? overrideDate : lastLogin
          const diffTime = Math.abs(now.getTime() - referenciaDate.getTime())
          const diffDays = diffTime / (1000 * 60 * 60 * 24)
          
          let statusAtividadeCalculado = meta.status_atividade ?? 'Ativo'
          if (diffDays >= 15) {
            statusAtividadeCalculado = 'Inativo'
          }

          return {
            id: u.id,
            username: meta.username,
            qra: meta.qra ?? null,
            patente: meta.patente ?? null,
            status: meta.status ?? 'pendente',
            role: meta.role ?? 'user',
            created_at: u.created_at,
            cargo: meta.cargo ?? [],
            unidade_administrativa: meta.unidade_administrativa ?? 'Sem Efetividade',
            unidade_operacional: meta.unidade_operacional ?? 'Sem Efetividade',
            status_atividade: statusAtividadeCalculado,
            last_login_at: meta.last_login_at ?? null,
            cursos: meta.cursos ?? [],
            advertencia: meta.advertencia ?? [],
            discord_username: meta.discord_username ?? null,
            discord_id: meta.discord_id ?? null,
            allowed_by: meta.allowed_by ?? null,
            game_id: meta.game_id ?? null,
          }
        })
    }
  } catch (err) {
    console.error('Error fetching users in visao-geral api:', err)
  }

  // 2. Fetch Cursos from database or JSON
  let cursos: any[] = []
  try {
    const { data, error } = await admin.from('cursos').select('*')
    if (!error && data) {
      cursos = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        vagasLimit: row.vagas_limit,
        subscribers: Array.isArray(row.subscribers) ? row.subscribers : [],
        evaluations: row.evaluations || {}
      }))
    } else {
      const localContent = await fs.readFile(CURSOS_DATA_FILE, 'utf8')
      cursos = JSON.parse(localContent)
    }
  } catch (_) {
    try {
      const localContent = await fs.readFile(CURSOS_DATA_FILE, 'utf8')
      cursos = JSON.parse(localContent)
    } catch (_) {}
  }

  // 3. Fetch Editais from database or JSON
  let editais: any[] = []
  try {
    const { data, error } = await admin.from('editais').select('*')
    if (!error && data) {
      editais = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        unidade: row.unidade,
        endDate: row.end_date,
        subscribers: Array.isArray(row.subscribers) ? row.subscribers : [],
        evaluations: row.evaluations || {}
      }))
    } else {
      const localContent = await fs.readFile(EDITAIS_DATA_FILE, 'utf8')
      editais = JSON.parse(localContent)
    }
  } catch (_) {
    try {
      const localContent = await fs.readFile(EDITAIS_DATA_FILE, 'utf8')
      editais = JSON.parse(localContent)
    } catch (_) {}
  }

  return NextResponse.json({
    success: true,
    usuarios,
    cursos,
    editais
  })
}
