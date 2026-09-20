-- 017_destaque.sql
-- Adiciona suporte a "evento em destaque" para exibição privilegiada na plataforma.
--
-- FUTURO (recurso PAGO): o campo `destaque` será ativado pelo organizador somente após
-- pagamento de uma taxa. Por ora, é gratuito e ativado manualmente.
-- O gancho de cobrança entra na rota /api/eventos/[id]/destaque antes de gravar.
--
-- Regra final: evento é destaque quando
--   (destaque OR destaque_admin) AND NOT destaque_bloqueado_admin
--
--   destaque                   = organizador ligou no painel
--   destaque_admin             = admin força destaque independentemente do org (via Supabase Table Editor)
--   destaque_bloqueado_admin   = admin bloqueia destaque do org (ex.: evento inadequado para destaque)

ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS destaque                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destaque_admin           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destaque_bloqueado_admin boolean NOT NULL DEFAULT false;

-- Índice parcial para buscas rápidas de eventos em destaque
CREATE INDEX IF NOT EXISTS idx_evento_destaque
  ON public.evento (data_inicio)
  WHERE destaque = true OR destaque_admin = true;
