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

CREATE TABLE IF NOT EXISTS public.fardamentos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  allowed_units JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_patentes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fardamentos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.fardamentos TO service_role;
GRANT ALL ON public.fardamentos TO authenticated;
GRANT ALL ON public.fardamentos TO anon;

CREATE TABLE IF NOT EXISTS public.armamentos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  min_patente TEXT NOT NULL,
  allowed_units JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.armamentos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.armamentos TO service_role;
GRANT ALL ON public.armamentos TO authenticated;
GRANT ALL ON public.armamentos TO anon;

CREATE TABLE IF NOT EXISTS public.viaturas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  prefix TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_patente TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.viaturas TO service_role;
GRANT ALL ON public.viaturas TO authenticated;
GRANT ALL ON public.viaturas TO anon;

CREATE TABLE IF NOT EXISTS public.prisoes (
  id TEXT PRIMARY KEY,
  preso_nome TEXT NOT NULL,
  preso_rg TEXT NOT NULL,
  motivo TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  oficial_nome TEXT NOT NULL,
  oficial_qra TEXT NOT NULL,
  oficial_id UUID NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.prisoes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.prisoes TO service_role;
GRANT ALL ON public.prisoes TO authenticated;
GRANT ALL ON public.prisoes TO anon;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  who_id UUID NOT NULL,
  who_qra TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO anon;

CREATE TABLE IF NOT EXISTS public.registro_unidades (
  id TEXT PRIMARY KEY,
  oficial_id UUID NOT NULL,
  oficial_qra TEXT NOT NULL,
  oficial_username TEXT NOT NULL,
  unidade TEXT NOT NULL,
  requerente_id UUID NOT NULL,
  requerente_qra TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.registro_unidades ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.registro_unidades TO service_role;
GRANT ALL ON public.registro_unidades TO authenticated;
GRANT ALL ON public.registro_unidades TO anon;

CREATE TABLE IF NOT EXISTS public.promocoes (
  id TEXT PRIMARY KEY,
  oficial_id UUID NOT NULL,
  oficial_username TEXT NOT NULL,
  oficial_qra TEXT NOT NULL,
  cargo_anterior TEXT NOT NULL,
  cargo_novo TEXT NOT NULL,
  observacao TEXT,
  creator_id UUID NOT NULL,
  creator_qra TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.promocoes TO service_role;
GRANT ALL ON public.promocoes TO authenticated;
GRANT ALL ON public.promocoes TO anon;

CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id TEXT PRIMARY KEY,
  oficial_id UUID NOT NULL,
  oficial_qra TEXT NOT NULL,
  oficial_username TEXT NOT NULL,
  tipo TEXT NOT NULL,
  envolvidos TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ocorrencias TO service_role;
GRANT ALL ON public.ocorrencias TO authenticated;
GRANT ALL ON public.ocorrencias TO anon;

CREATE TABLE IF NOT EXISTS public.punicoes_administrativas (
  id TEXT PRIMARY KEY,
  oficial_id UUID NOT NULL,
  oficial_qra TEXT NOT NULL,
  oficial_username TEXT NOT NULL,
  motivo TEXT NOT NULL,
  tipo_advertencia TEXT,
  creator_id UUID NOT NULL,
  creator_qra TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa',
  recorrida BOOLEAN NOT NULL DEFAULT FALSE,
  recurso_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.punicoes_administrativas ADD COLUMN IF NOT EXISTS tipo_advertencia TEXT;
ALTER TABLE public.punicoes_administrativas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.punicoes_administrativas TO service_role;
GRANT ALL ON public.punicoes_administrativas TO authenticated;
GRANT ALL ON public.punicoes_administrativas TO anon;

CREATE TABLE IF NOT EXISTS public.civis_status (
  nome TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'limpo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.civis_status ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.civis_status TO service_role;
GRANT ALL ON public.civis_status TO authenticated;
GRANT ALL ON public.civis_status TO anon;
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
