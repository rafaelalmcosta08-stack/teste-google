-- Tabela de perfis de usuário
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  qra text,
  patente text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

-- Usuário pode ver o próprio perfil
create policy "usuario ve proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Admin vê todos os perfis
create policy "admin ve todos perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admin pode atualizar qualquer perfil
create policy "admin atualiza perfis"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Inserção é feita pelo próprio usuário no signup (via service_role ou após criação)
create policy "usuario insere proprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Tabelas adicionais para persistência de dados
create table if not exists public.avisos (
  id text primary key,
  title text not null,
  content text not null,
  creator_id uuid not null,
  creator_qra text not null,
  created_at timestamptz not null default now(),
  read_by jsonb not null default '[]'::jsonb
);
alter table public.avisos enable row level security;
grant all on public.avisos to service_role;
grant all on public.avisos to authenticated;
grant all on public.avisos to anon;

create table if not exists public.cursos (
  id text primary key,
  title text not null,
  description text not null,
  requirements text,
  start_date text not null,
  end_date text not null,
  vagas_limit integer not null,
  creator_id uuid not null,
  creator_qra text not null,
  created_at timestamptz not null default now(),
  instructor_id uuid not null,
  instructor_qra text,
  subscribers jsonb not null default '[]'::jsonb,
  read_by jsonb not null default '[]'::jsonb,
  evaluations jsonb not null default '{}'::jsonb
);
alter table public.cursos enable row level security;
grant all on public.cursos to service_role;
grant all on public.cursos to authenticated;
grant all on public.cursos to anon;

create table if not exists public.editais (
  id text primary key,
  title text not null,
  description text not null,
  requirements text,
  unidade text not null,
  link_formulario text not null,
  end_date text not null,
  creator_id uuid not null,
  creator_qra text not null,
  created_at timestamptz not null default now(),
  subscribers jsonb not null default '[]'::jsonb,
  evaluations jsonb not null default '{}'::jsonb
);
alter table public.editais enable row level security;
grant all on public.editais to service_role;
grant all on public.editais to authenticated;
grant all on public.editais to anon;

create table if not exists public.chats (
  id text primary key,
  canal text not null,
  user_id uuid not null,
  username text not null,
  qra text not null,
  patente text not null,
  cargo text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chats enable row level security;
grant all on public.chats to service_role;
grant all on public.chats to authenticated;
grant all on public.chats to anon;

create table if not exists public.fardamentos (
  id text primary key,
  name text not null,
  photo_url text,
  code text not null,
  category text not null,
  allowed_units jsonb not null default '[]'::jsonb,
  allowed_patentes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.fardamentos enable row level security;
grant all on public.fardamentos to service_role;
grant all on public.fardamentos to authenticated;
grant all on public.fardamentos to anon;

create table if not exists public.armamentos (
  id text primary key,
  name text not null,
  photo_url text,
  code text not null,
  category text not null,
  min_patente text not null,
  allowed_units jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.armamentos enable row level security;
grant all on public.armamentos to service_role;
grant all on public.armamentos to authenticated;
grant all on public.armamentos to anon;

create table if not exists public.viaturas (
  id text primary key,
  name text not null,
  photo_url text,
  prefix text not null,
  unit text not null,
  min_patente text not null,
  created_at timestamptz not null default now()
);
alter table public.viaturas enable row level security;
grant all on public.viaturas to service_role;
grant all on public.viaturas to authenticated;
grant all on public.viaturas to anon;

create table if not exists public.prisoes (
  id text primary key,
  preso_nome text not null,
  preso_rg text not null,
  motivo text not null,
  data_hora timestamptz not null default now(),
  oficial_nome text not null,
  oficial_qra text not null,
  oficial_id uuid not null,
  observacoes text,
  created_at timestamptz not null default now()
);
alter table public.prisoes enable row level security;
grant all on public.prisoes to service_role;
grant all on public.prisoes to authenticated;
grant all on public.prisoes to anon;

create table if not exists public.registro_unidades (
  id text primary key,
  oficial_id uuid not null,
  oficial_qra text not null,
  oficial_username text not null,
  unidade text not null,
  requerente_id uuid not null,
  requerente_qra text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado')),
  created_at timestamptz not null default now()
);
alter table public.registro_unidades enable row level security;
grant all on public.registro_unidades to service_role;
grant all on public.registro_unidades to authenticated;
grant all on public.registro_unidades to anon;


