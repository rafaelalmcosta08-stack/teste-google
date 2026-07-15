import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const info: Record<string, unknown> = {
    supabaseUrl: supabaseUrl ?? 'NAO DEFINIDA',
    anonKey_presente: !!anonKey,
    anonKey_prefixo: anonKey?.substring(0, 30),
    serviceRoleKey_presente: !!serviceRoleKey,
    serviceRoleKey_prefixo: serviceRoleKey?.substring(0, 30),
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ...info, erro: 'Variaveis ausentes — configure no painel Vercel > Vars' })
  }

  // Tenta fazer um SELECT na tabela profiles usando service_role
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.from('profiles').select('count').limit(1)

  return NextResponse.json({
    ...info,
    teste_select_profiles: error ? { erro: error.message, code: error.code } : { ok: true, data },
  })
}
