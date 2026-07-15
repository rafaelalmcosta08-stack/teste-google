import { NextRequest, NextResponse } from 'next/server'

const GRANT_SQL = `
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
`

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const managementToken = req.nextUrl.searchParams.get('pat')

  if (!supabaseUrl || !managementToken) {
    return NextResponse.json(
      { error: 'Passe ?pat=<seu_personal_access_token> na URL.' },
      { status: 401 }
    )
  }

  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    return NextResponse.json({ error: 'Não foi possível extrair o project ref.' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managementToken}`,
      },
      body: JSON.stringify({ query: GRANT_SQL }),
    }
  )

  const body = await res.text()
  let json: unknown
  try { json = JSON.parse(body) } catch { json = body }

  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao executar GRANT.', detail: json }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'GRANTs aplicados com sucesso!', detail: json })
}
