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
    .map((u) => {
      const meta = u.user_metadata ?? {}
      
      // Regra de negócio: calcular status_atividade automático
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
        status_atividade_override_at: meta.status_atividade_override_at ?? null,
        cursos: meta.cursos ?? [],
        advertencia: meta.advertencia ?? [],
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ usuarios })
}

// PATCH /api/admin/usuarios — atualiza status ou role de um usuário
export async function PATCH(req: NextRequest) {
  const {
    id,
    status,
    role,
    patente,
    cargo,
    unidade_administrativa,
    unidade_operacional,
    status_atividade,
    status_atividade_override_at,
    cursos,
    advertencia,
    last_login_at,
  } = await req.json()
  
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
  if (patente !== undefined) novoMeta.patente = patente
  if (cargo !== undefined) novoMeta.cargo = cargo
  if (unidade_administrativa !== undefined) novoMeta.unidade_administrativa = unidade_administrativa
  if (unidade_operacional !== undefined) novoMeta.unidade_operacional = unidade_operacional
  if (status_atividade !== undefined) novoMeta.status_atividade = status_atividade
  if (status_atividade_override_at !== undefined) novoMeta.status_atividade_override_at = status_atividade_override_at
  if (cursos !== undefined) novoMeta.cursos = cursos
  if (advertencia !== undefined) novoMeta.advertencia = advertencia
  if (last_login_at !== undefined) novoMeta.last_login_at = last_login_at

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
  if (patente !== undefined) {
    await admin.from('profiles').update({ patente }).eq('id', id).then(() => {}).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
