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
