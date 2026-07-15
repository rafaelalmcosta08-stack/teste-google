import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  const { usuario, qra, patente, senha, discord_username, discord_id, allowed_by, game_id } = await req.json()

  if (!usuario?.trim() || !senha || !discord_username?.trim() || !discord_id?.trim() || !allowed_by?.trim() || !game_id?.trim()) {
    return NextResponse.json({ error: 'Campos obrigatórios de cadastro ausentes.' }, { status: 400 })
  }

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  const username = usuario.trim().toLowerCase()
  const email = `${username}@policialegacy.internal`

  // Verifica se username já está em uso (via listUsers)
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const jaExiste = listData?.users?.some((u) => u.email === email)
  if (jaExiste) {
    return NextResponse.json({ error: 'Este usuário já está cadastrado.' }, { status: 409 })
  }

  // Cria o usuário no Auth com os dados do perfil em user_metadata
  // Não depende de tabela profiles nem de GRANT — funciona sempre
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      username: usuario.trim(),
      qra: qra?.trim() || null,
      patente: patente?.trim() || null,
      status: 'pendente',
      role: 'user',
      discord_username: discord_username?.trim() || null,
      discord_id: discord_id?.trim() || null,
      allowed_by: allowed_by?.trim() || null,
      game_id: game_id?.trim() || null,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    )
  }

  // Tenta também inserir na tabela profiles (se tiver permissão)
  // Se falhar, não é crítico — os dados já estão em user_metadata
  await admin.from('profiles').insert({
    id: data.user.id,
    username: usuario.trim(),
    qra: qra?.trim() || null,
    patente: patente?.trim() || null,
    status: 'pendente',
    role: 'user',
    discord_username: discord_username?.trim() || null,
    discord_id: discord_id?.trim() || null,
    allowed_by: allowed_by?.trim() || null,
    game_id: game_id?.trim() || null,
  }).then(() => {}).catch(() => {})

  return NextResponse.json({ success: true })
}
