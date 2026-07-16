import { NextRequest, NextResponse } from 'next/server'

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  qra TEXT,
  patente TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilita RLS mas NÃO força para service_role (service_role bypassa por padrão no Supabase)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove todas as policies antigas
DROP POLICY IF EXISTS "usuario_le_proprio" ON public.profiles;
DROP POLICY IF EXISTS "usuario_edita_proprio" ON public.profiles;
DROP POLICY IF EXISTS "usuario_insere_proprio" ON public.profiles;
DROP POLICY IF EXISTS "admin_delete" ON public.profiles;
DROP POLICY IF EXISTS "service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "admin_le_tudo" ON public.profiles;

-- Policy: usuário autenticado lê o próprio perfil
CREATE POLICY "usuario_le_proprio"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: admin lê todos os perfis
CREATE POLICY "admin_le_tudo"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: usuário autenticado edita o próprio perfil
CREATE POLICY "usuario_edita_proprio"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: usuário autenticado insere o próprio perfil
CREATE POLICY "usuario_insere_proprio"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: admin deleta qualquer perfil
CREATE POLICY "admin_delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Concede todas as permissões ao service_role (necessário para operações server-side)
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Tabelas adicionais para persistência de dados
CREATE TABLE IF NOT EXISTS public.avisos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  creator_id UUID NOT NULL,
  creator_qra TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.avisos TO service_role;
GRANT ALL ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO anon;

CREATE TABLE IF NOT EXISTS public.cursos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  vagas_limit INTEGER NOT NULL,
  creator_id UUID NOT NULL,
  creator_qra TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instructor_id UUID NOT NULL,
  instructor_qra TEXT,
  subscribers JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluations JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cursos TO service_role;
GRANT ALL ON public.cursos TO authenticated;
GRANT ALL ON public.cursos TO anon;

CREATE TABLE IF NOT EXISTS public.editais (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  unidade TEXT NOT NULL,
  link_formulario TEXT NOT NULL,
  end_date TEXT NOT NULL,
  creator_id UUID NOT NULL,
  creator_qra TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscribers JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluations JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.editais TO service_role;
GRANT ALL ON public.editais TO authenticated;
GRANT ALL ON public.editais TO anon;

CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  canal TEXT NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  qra TEXT NOT NULL,
  patente TEXT NOT NULL,
  cargo TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.chats TO service_role;
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chats TO anon;
`

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const managementToken = req.nextUrl.searchParams.get('pat')

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL não definida.' }, { status: 500 })
  }

  if (!managementToken) {
    return NextResponse.json(
      { error: 'Passe ?pat=<seu_personal_access_token> na URL.' },
      { status: 401 }
    )
  }

  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    return NextResponse.json({ error: 'Não foi possível extrair o project ref da URL.' }, { status: 500 })
  }

  // Executa via Supabase Management API — único endpoint que aceita DDL com PAT
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managementToken}`,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    }
  )

  const mgmtBody = await mgmtRes.text()
  let mgmtJson: unknown
  try { mgmtJson = JSON.parse(mgmtBody) } catch { mgmtJson = mgmtBody }

  if (!mgmtRes.ok) {
    return NextResponse.json(
      {
        error: 'Falha ao executar migração via Management API.',
        status: mgmtRes.status,
        detail: mgmtJson,
        hint: mgmtRes.status === 401
          ? 'Token inválido ou sem permissão. Gere um Personal Access Token em supabase.com/dashboard/account/tokens'
          : undefined,
      },
      { status: 500 }
    )
  }

  // Confirma que a tabela existe via REST API com service_role
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let tableExists = false
  if (serviceKey) {
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    })
    tableExists = checkRes.ok
  }

  return NextResponse.json({
    success: true,
    message: 'Migração executada com sucesso! Tabela profiles criada com RLS e políticas.',
    tableExists,
    migrationResponse: mgmtJson,
    projectRef,
  })
}
