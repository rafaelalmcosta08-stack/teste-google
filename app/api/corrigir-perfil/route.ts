import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/corrigir-perfil
// Insere um perfil para um usuário que já existe no Auth mas não tem linha em profiles.
// Chamado automaticamente pelo frontend quando o login retorna "Perfil não encontrado".
export async function POST(req: NextRequest) {
  const { userId, username } = await req.json()

  if (!userId || !username) {
    return NextResponse.json({ error: 'userId e username são obrigatórios.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verifica se o usuário realmente existe no Auth
  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)
  if (authError || !authUser.user) {
    return NextResponse.json({ error: 'Usuário não encontrado no Auth.' }, { status: 404 })
  }

  // Verifica se o perfil já existe
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Perfil já existe.', alreadyExists: true })
  }

  // Cria o perfil com status pendente
  const { error: insertError } = await adminClient.from('profiles').insert({
    id: userId,
    username: username.trim(),
    status: 'pendente',
    role: 'user',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
