-- ============================================================
-- Ingressa — Bloco 3.x: Meios de pagamento aceitos por evento
-- Ricardo: rodar inteiro no Supabase SQL Editor (uma única execução).
-- ============================================================

-- Pix é sempre aceito pelo produto — sem coluna; nunca pode ser false.
-- Cartão: default ligado (organizador pode desligar).
-- Boleto: default desligado (inadimplência — opt-in consciente do organizador).

ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS aceita_cartao BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aceita_boleto  BOOLEAN NOT NULL DEFAULT false;

-- Verificação:
-- SELECT id, titulo, aceita_cartao, aceita_boleto FROM evento LIMIT 10;
