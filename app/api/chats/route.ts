import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'chats-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface ChatMessage {
  id: string
  canal: string
  userId: string
  username: string
  qra: string
  patente: string
  cargo: string
  content: string
  createdAt: string
}

async function readMessages(): Promise<ChatMessage[]> {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    return []
  }
}

async function writeMessages(messages: ChatMessage[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), 'utf8')
}

async function getProfile(userId: string) {
  const admin = getAdminClient()
  if (!admin) return null
  try {
    const { data: userData } = await admin.auth.admin.getUserById(userId)
    if (!userData?.user) return null
    const meta = userData.user.user_metadata ?? {}
    return {
      id: userData.user.id,
      username: meta.username || '',
      qra: meta.qra ?? null,
      patente: meta.patente ?? null,
      status: meta.status ?? 'pendente',
      role: meta.role ?? 'user',
      cargo: meta.cargo ?? [],
      unidade_administrativa: meta.unidade_administrativa ?? 'Sem Efetividade',
      unidade_operacional: meta.unidade_operacional ?? 'Sem Efetividade',
    }
  } catch (e) {
    console.error('Error fetching profile in chat API:', e)
    return null
  }
}

export function hasCanalAccess(profile: any, canal: string): boolean {
  if (!profile || profile.status !== 'aprovado') return false
  if (profile.role === 'admin') return true

  const cargos: string[] = profile.cargo || []
  const unidade: string = profile.unidade_operacional || ''

  switch (canal) {
    case 'geral':
      return true
    case 'apm':
      return cargos.some((c: string) =>
        ['Instrutor Treinamento Operacional', 'Instrutor De Cursos e Recrutamentos', 'Supervisor APM', 'Diretor APM', 'Alto Comando'].includes(c)
      )
    case 'bope':
      return unidade.toUpperCase() === 'BOPE'
    case 'core':
      return unidade.toUpperCase() === 'CORE'
    case 'gaep':
      return unidade.toUpperCase() === 'GAEP'
    case 'gtm':
      return unidade.toUpperCase() === 'GTM'
    case 'gar':
      return unidade.toUpperCase() === 'GAR'
    case 'alto-comando':
      return cargos.some((c: string) => ['Alto Comando'].includes(c))
    default:
      return false
  }
}

export async function GET(req: NextRequest) {
  const canal = req.nextUrl.searchParams.get('canal')
  const before = req.nextUrl.searchParams.get('before')
  const limitStr = req.nextUrl.searchParams.get('limit') || '50'
  const limit = parseInt(limitStr, 10)

  if (!canal) {
    return NextResponse.json({ error: 'Canal é obrigatório.' }, { status: 400 })
  }

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

  const profile = await getProfile(requester.id)
  if (!profile || !hasCanalAccess(profile, canal)) {
    return NextResponse.json({ error: 'Você não tem permissão para acessar este canal.' }, { status: 403 })
  }

  const allMessages = await readMessages()
  let filtered = allMessages.filter((m) => m.canal === canal)

  // Sort initially chronologically to easily slice
  filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // If "before" is specified, get only messages created before that ISO timestamp
  if (before) {
    filtered = filtered.filter((m) => new Date(m.createdAt).getTime() < new Date(before).getTime())
  }

  // Slice the last N messages
  const paginated = filtered.slice(-limit)

  return NextResponse.json({ messages: paginated })
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

  const profile = await getProfile(requester.id)
  if (!profile || profile.status !== 'aprovado') {
    return NextResponse.json({ error: 'Seu acesso está inativo ou pendente.' }, { status: 403 })
  }

  const body = await req.json()
  const { canal, content } = body

  if (!canal || !content?.trim()) {
    return NextResponse.json({ error: 'Campos canal e content são obrigatórios.' }, { status: 400 })
  }

  if (!hasCanalAccess(profile, canal)) {
    return NextResponse.json({ error: 'Você não tem permissão para enviar mensagens neste canal.' }, { status: 403 })
  }

  const patenteExibicao = profile.patente || 'Recruta'
  const cargoExibicao = profile.cargo && profile.cargo.length > 0 ? profile.cargo[0] : patenteExibicao

  const newMessage: ChatMessage = {
    id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    canal,
    userId: requester.id,
    username: profile.username,
    qra: profile.qra || profile.username,
    patente: patenteExibicao,
    cargo: cargoExibicao,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }

  const allMessages = await readMessages()
  allMessages.push(newMessage)

  // Avoid file ballooning indefinitely (keep last 5000 messages total)
  if (allMessages.length > 5000) {
    allMessages.splice(0, allMessages.length - 5000)
  }

  await writeMessages(allMessages)

  // Broadcast the update in real-time to everyone via SSE
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('chat-message', { canal, message: newMessage })
  } catch (err) {
    console.error('Failed to broadcast chat message via SSE:', err)
  }

  return NextResponse.json({ success: true, message: newMessage })
}
