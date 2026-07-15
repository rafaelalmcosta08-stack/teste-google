import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/admin/usuarios — lista todos os usuários com perfil
export async function GET() {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtra apenas usuarios com username em user_metadata (usuarios do sistema)
  const usuarios = (data?.users ?? [])
    .filter((u) => u.user_metadata?.username)
    .map((u) => ({
      id: u.id,
      username: u.user_metadata.username,
      qra: u.user_metadata.qra ?? null,
      patente: u.user_metadata.patente ?? null,
      status: u.user_metadata.status ?? 'pendente',
      role: u.user_metadata.role ?? 'user',
      created_at: u.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ usuarios })
}

// PATCH /api/admin/usuarios — atualiza status ou role de um usuário
export async function PATCH(req: NextRequest) {
  const { id, status, role } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID ausente.' }, { status: 400 })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  // Lê os metadados atuais do usuário
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(id)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  const metaAtual = userData.user.user_metadata ?? {}
  const novoMeta: Record<string, unknown> = { ...metaAtual }

  if (status !== undefined) novoMeta.status = status
  if (role !== undefined) novoMeta.role = role

  const { error: updateError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: novoMeta,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Tenta também atualizar na tabela profiles se existir (best-effort)
  if (status !== undefined) {
    await admin.from('profiles').update({ status }).eq('id', id).then(() => {}).catch(() => {})
  }
  if (role !== undefined) {
    await admin.from('profiles').update({ role }).eq('id', id).then(() => {}).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
