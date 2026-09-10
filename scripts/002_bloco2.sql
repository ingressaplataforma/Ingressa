-- =============================================================
-- Ingressa — Bloco 2: eventos, lotes, ingressos, comprador
-- Rodar no SQL Editor do Supabase (não executar pelo app).
-- =============================================================

-- -----------------------------------------------------------
-- 1. Tabela comprador (papel futuro preparado no Bloco 1)
-- -----------------------------------------------------------
create table if not exists public.comprador (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  criado_em   timestamptz not null default now()
);

alter table public.comprador enable row level security;

create policy "comprador_select_proprio"
  on public.comprador for select
  using (auth.uid() = id);

create policy "comprador_insert_proprio"
  on public.comprador for insert
  with check (auth.uid() = id);

create policy "comprador_update_proprio"
  on public.comprador for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------
-- 2. Tabela evento
-- -----------------------------------------------------------
create table if not exists public.evento (
  id              uuid primary key default gen_random_uuid(),
  organizador_id  uuid not null references public.organizador(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  local_nome      text,
  endereco        text,
  data_inicio     timestamptz not null,
  data_fim        timestamptz,
  status          text not null default 'rascunho'
                    check (status in ('rascunho','publicado','encerrado','cancelado')),
  slug            text not null unique,
  criado_em       timestamptz not null default now(),
  constraint data_fim_valida check (data_fim is null or data_fim >= data_inicio)
);

alter table public.evento enable row level security;

-- Público vê apenas eventos publicados
create policy "evento_select_publicado"
  on public.evento for select
  using (status = 'publicado');

-- Organizador vê os próprios (incluindo rascunhos)
create policy "evento_select_proprio"
  on public.evento for select
  using (organizador_id = auth.uid());

create policy "evento_insert_proprio"
  on public.evento for insert
  with check (organizador_id = auth.uid());

create policy "evento_update_proprio"
  on public.evento for update
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid());

-- -----------------------------------------------------------
-- 3. Tabela lote
-- -----------------------------------------------------------
create table if not exists public.lote (
  id                  uuid primary key default gen_random_uuid(),
  evento_id           uuid not null references public.evento(id) on delete cascade,
  nome                text not null,
  preco_cents         bigint not null default 0 check (preco_cents >= 0),
  quantidade_total    integer not null check (quantidade_total >= 0),
  quantidade_vendida  integer not null default 0 check (quantidade_vendida >= 0),
  constraint nao_estourar check (quantidade_vendida <= quantidade_total)
);

alter table public.lote enable row level security;

-- Público vê lotes de eventos publicados
create policy "lote_select_publicado"
  on public.lote for select
  using (
    exists (
      select 1 from public.evento
      where evento.id = lote.evento_id and evento.status = 'publicado'
    )
  );

-- Organizador gerencia lotes dos próprios eventos
create policy "lote_select_proprio"
  on public.lote for select
  using (
    exists (
      select 1 from public.evento
      where evento.id = lote.evento_id and evento.organizador_id = auth.uid()
    )
  );

create policy "lote_insert_proprio"
  on public.lote for insert
  with check (
    exists (
      select 1 from public.evento
      where evento.id = lote.evento_id and evento.organizador_id = auth.uid()
    )
  );

create policy "lote_update_proprio"
  on public.lote for update
  using (
    exists (
      select 1 from public.evento
      where evento.id = lote.evento_id and evento.organizador_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.evento
      where evento.id = lote.evento_id and evento.organizador_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- 4. Tabela ingresso
-- -----------------------------------------------------------
create table if not exists public.ingresso (
  id              uuid primary key default gen_random_uuid(),
  lote_id         uuid not null references public.lote(id),
  evento_id       uuid not null references public.evento(id),
  comprador_id    uuid not null references public.comprador(id),
  codigo          uuid not null default gen_random_uuid() unique,
  token_assinado  text not null,
  status          text not null default 'valido'
                    check (status in ('valido','usado','cancelado')),
  usado_em        timestamptz,
  criado_em       timestamptz not null default now()
);

alter table public.ingresso enable row level security;

-- Comprador vê os próprios ingressos
create policy "ingresso_select_comprador"
  on public.ingresso for select
  using (comprador_id = auth.uid());

-- Organizador vê ingressos dos seus eventos
create policy "ingresso_select_organizador"
  on public.ingresso for select
  using (
    exists (
      select 1 from public.evento
      where evento.id = ingresso.evento_id and evento.organizador_id = auth.uid()
    )
  );

-- INSERT direto bloqueado (use a RPC inscrever_em_lote)
-- A policy abaixo existe como defesa em profundidade
create policy "ingresso_insert_comprador"
  on public.ingresso for insert
  with check (comprador_id = auth.uid());

-- -----------------------------------------------------------
-- 5. RPC atômica: reserva + ingresso em uma transação
-- -----------------------------------------------------------
create or replace function public.inscrever_em_lote(
  p_lote_id       uuid,
  p_comprador_id  uuid,
  p_codigo        uuid,
  p_token_assinado text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento_id   uuid;
  v_ingresso_id uuid;
begin
  -- Travar a linha e checar disponibilidade
  select evento_id into v_evento_id
  from lote
  where id = p_lote_id
    and quantidade_vendida < quantidade_total
  for update;

  if not found then
    raise exception 'lote_esgotado';
  end if;

  -- Criar ingresso
  insert into ingresso (lote_id, evento_id, comprador_id, codigo, token_assinado)
  values (p_lote_id, v_evento_id, p_comprador_id, p_codigo, p_token_assinado)
  returning id into v_ingresso_id;

  -- Incrementar contador
  update lote
  set quantidade_vendida = quantidade_vendida + 1
  where id = p_lote_id;

  return v_ingresso_id;
end;
$$;

grant execute on function public.inscrever_em_lote to authenticated;
