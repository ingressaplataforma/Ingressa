-- =============================================================
-- Ingressa — Bloco 1: tabelas + RLS
-- Rodar no SQL Editor do Supabase (não executar pelo app).
-- =============================================================

-- -----------------------------------------------------------
-- 1. Tabela organizador
-- -----------------------------------------------------------
create table if not exists public.organizador (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  documento   text not null default '',
  telefone    text,
  criado_em   timestamptz not null default now()
);

-- RLS
alter table public.organizador enable row level security;

create policy "organizador_select_proprio"
  on public.organizador for select
  using (auth.uid() = id);

create policy "organizador_insert_proprio"
  on public.organizador for insert
  with check (auth.uid() = id);

create policy "organizador_update_proprio"
  on public.organizador for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------
-- 2. Tabela lista_espera
-- -----------------------------------------------------------
create table if not exists public.lista_espera (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  origem      text,
  criado_em   timestamptz not null default now(),
  constraint lista_espera_email_unique unique (email)
);

-- RLS
alter table public.lista_espera enable row level security;

-- Qualquer visitante (anon) pode inserir seu próprio e-mail
create policy "lista_espera_insert_anon"
  on public.lista_espera for insert
  to anon
  with check (true);

-- SELECT bloqueado para todos via RLS (nenhuma política SELECT = nenhum acesso)
-- Só o painel do Supabase (service_role) consegue ler os e-mails.
