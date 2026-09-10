-- =============================================================
-- Ingressa — status "pausado" + atualizado_em
-- Rodar no SQL Editor do Supabase APÓS o 003_visibilidade.sql.
-- =============================================================

-- 1. Atualiza o CHECK de status para incluir 'pausado'
alter table public.evento
  drop constraint if exists evento_status_check;

alter table public.evento
  add constraint evento_status_check
    check (status in ('rascunho', 'publicado', 'pausado', 'encerrado', 'cancelado'));

-- 2. Coluna atualizado_em (para audit trail de edições)
alter table public.evento
  add column if not exists atualizado_em timestamptz;

-- 3. Trigger: mantém atualizado_em sempre atual em qualquer UPDATE
create or replace function public.set_evento_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists tg_evento_atualizado_em on public.evento;
create trigger tg_evento_atualizado_em
  before update on public.evento
  for each row execute function public.set_evento_atualizado_em();
