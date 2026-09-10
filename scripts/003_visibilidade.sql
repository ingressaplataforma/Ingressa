-- =============================================================
-- Ingressa — visibilidade de eventos
-- Rodar no SQL Editor do Supabase APÓS o 002_bloco2.sql.
-- =============================================================

-- Adiciona visibilidade e senha_hash à tabela evento
alter table public.evento
  add column if not exists visibilidade text not null default 'publico'
    check (visibilidade in ('publico', 'nao_listado', 'privado')),
  add column if not exists senha_hash text;

-- A policy pública de SELECT já permite qualquer evento publicado (por slug).
-- Nenhuma alteração de RLS necessária: o controle de visibilidade é na aplicação:
--   - /eventos lista com WHERE visibilidade = 'publico'
--   - Evento privado: a página verifica senha via cookie antes de exibir conteúdo
-- NUNCA selecionar senha_hash em queries que vão ao browser.
