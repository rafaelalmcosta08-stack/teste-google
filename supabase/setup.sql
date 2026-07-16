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

