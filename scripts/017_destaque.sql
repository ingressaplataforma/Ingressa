-- 017_destaque.sql
-- Adiciona suporte a "evento em destaque" para exibição privilegiada na plataforma.
--
-- Regra efetiva (usar em toda query/UI):
--   em_destaque = (destaque_admin IS TRUE)
--              OR (destaque_admin IS NULL AND destaque = TRUE)
--
--   destaque         = organizador ligou no painel (gratuito por ora)
--   destaque_admin   = sobreposição do admin:
--                        NULL  → segue o campo `destaque` do organizador
--                        TRUE  → forçado ligado pelo admin
--                        FALSE → forçado desligado pelo admin
--   destaque_ordem   = ordem de exibição quando houver vários (menor primeiro, nulls por último)
--
-- FUTURO (recurso PAGO — NÃO implementado):
--   destaque_pago          boolean DEFAULT false  -- destaque exige pagamento
--   destaque_expira_em     timestamptz            -- destaque vira item com validade

ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS destaque        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destaque_admin  boolean     NULL     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS destaque_ordem  integer     NULL;

-- Índice parcial para buscas rápidas de eventos em destaque
CREATE INDEX IF NOT EXISTS idx_evento_destaque
  ON public.evento (destaque_ordem NULLS LAST, data_inicio)
  WHERE destaque_admin IS TRUE OR (destaque_admin IS NULL AND destaque = true);
