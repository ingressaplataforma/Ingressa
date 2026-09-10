-- =============================================================
-- Ingressa — coluna cep na tabela evento
-- Rodar no SQL Editor do Supabase APÓS o 004_pausado.sql.
-- =============================================================

alter table public.evento
  add column if not exists cep text;
