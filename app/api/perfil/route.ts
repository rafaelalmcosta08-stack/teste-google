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

  if (tableData) {
    return NextResponse.json({ profile: tableData })
  }

  // Fallback: lê do user_metadata (funciona sempre, sem GRANT)
  const { data: userData, error } = await admin.auth.admin.getUserById(userId)
  if (error || !userData?.user) return NextResponse.json({ profile: null })

  const meta = userData.user.user_metadata ?? {}
  if (!meta.username) return NextResponse.json({ profile: null })

  return NextResponse.json({
    profile: {
      id: userData.user.id,
      username: meta.username,
      qra: meta.qra ?? null,
      patente: meta.patente ?? null,
      status: meta.status ?? 'pendente',
      role: meta.role ?? 'user',
      created_at: userData.user.created_at,
    },
  })
}
