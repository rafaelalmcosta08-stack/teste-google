import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/perfil?id=<userId>
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('id')
  if (!userId) return NextResponse.json({ profile: null })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ profile: null })

  // Tenta buscar na tabela profiles primeiro
  const { data: tableData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  // Lê do user_metadata para obter os campos hierárquicos completos
  const { data: userData, error } = await admin.auth.admin.getUserById(userId)
  
  if (!userData?.user) {
    if (tableData) {
      return NextResponse.json({
        profile: {
          ...tableData,
          cargo: [],
          unidade_administrativa: 'Sem Efetividade',
          unidade_operacional: 'Sem Efetividade',
          status_atividade: 'Ativo',
          last_login_at: null,
          status_atividade_override_at: null,
          cursos: [],
          advertencia: [],
        }
      })
    }
    return NextResponse.json({ profile: null })
  }

  const meta = userData.user.user_metadata ?? {}
  if (!meta.username && !tableData) return NextResponse.json({ profile: null })

  return NextResponse.json({
    profile: {
      id: userData.user.id,
      username: meta.username || tableData?.username || '',
      qra: meta.qra ?? tableData?.qra ?? null,
      patente: meta.patente ?? tableData?.patente ?? null,
      status: meta.status ?? tableData?.status ?? 'pendente',
      role: meta.role ?? tableData?.role ?? 'user',
      created_at: userData.user.created_at || tableData?.created_at,
      cargo: meta.cargo ?? [],
      unidade_administrativa: meta.unidade_administrativa ?? 'Sem Efetividade',
      unidade_operacional: meta.unidade_operacional ?? 'Sem Efetividade',
      status_atividade: meta.status_atividade ?? 'Ativo',
      last_login_at: meta.last_login_at ?? null,
      status_atividade_override_at: meta.status_atividade_override_at ?? null,
      cursos: meta.cursos ?? [],
      advertencia: meta.advertencia ?? [],
      discord_username: meta.discord_username ?? null,
      discord_id: meta.discord_id ?? null,
      allowed_by: meta.allowed_by ?? null,
      game_id: meta.game_id ?? null,
    },
  })
}
