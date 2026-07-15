import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/admin/corrigir
// Corrige um usuário órfão (criado sem user_metadata) definindo username, status e role
export async function POST(req: NextRequest) {
  const { userId, username, qra, patente, status, role } = await req.json()

  if (!userId || !username) {
    return NextResponse.json({ error: 'userId e username são obrigatórios.' }, { status: 400 })
  }

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })
  }

  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(userId)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  const metaAtual = userData.user.user_metadata ?? {}

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...metaAtual,
      username: username.trim(),
      qra: qra?.trim() || null,
      patente: patente?.trim() || null,
      status: status ?? 'aprovado',
      role: role ?? 'user',
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
