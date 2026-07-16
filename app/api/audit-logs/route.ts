import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readAuditLogs } from '@/lib/audit'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getProfile(userId: string) {
  const admin = getAdminClient()
  if (!admin) return null
  try {
    const { data } = await admin.from('profiles').select('*').eq('id', userId).single()
    return data
  } catch (_) {
    return null
  }
}

export async function GET(req: NextRequest) {
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

  // Get requester profile and check roles
  const requesterMeta = requester.user_metadata ?? {}
  const profile = await getProfile(requester.id)
  
  const isAdmin = requesterMeta.role === 'admin' || profile?.role === 'admin'
  const cargos: string[] = requesterMeta.cargo || profile?.cargo || []
  const isAltoComando = cargos.includes('Alto Comando') || isAdmin

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Acesso negado. Apenas o Alto Comando pode visualizar os logs de auditoria.' }, { status: 403 })
  }

  try {
    const logs = await readAuditLogs()
    return NextResponse.json({ success: true, logs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao ler os logs.' }, { status: 500 })
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
  const profile = await getProfile(requester.id)
  const whoQra = requesterMeta.qra || profile?.qra || requesterMeta.username || profile?.username || 'Oficial'

  const { action, targetUser, description } = await req.json()

  if (!action || !description) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  try {
    const { writeAuditLog } = await import('@/lib/audit')
    await writeAuditLog({
      whoId: requester.id,
      whoQra,
      action,
      targetUser: targetUser || 'Sistema',
      description
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao gravar o log.' }, { status: 500 })
  }
}
