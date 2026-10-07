-- =============================================================
-- Ingressa — Script 019: slug amigável no organizador
--
-- RODAR NO SUPABASE SQL EDITOR (não pelo app).
-- Pré-requisito: scripts 001–018 já aplicados.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Adicionar coluna slug (nullable inicialmente para backfill)
-- -----------------------------------------------------------
ALTER TABLE public.organizador
  ADD COLUMN IF NOT EXISTS slug text;

-- -----------------------------------------------------------
-- 2. Função helper: gera slug único a partir de um nome
--    (sufixar com -2, -3... em caso de colisão)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_slug_organizador(
  p_nome      text,
  p_excluir_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate text;
  sufixo    int := 0;
BEGIN
  -- Normalizar: remover acentos, lowercasear, substituir não-alfanúm por -
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        translate(
          p_nome,
          'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
          'aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn'
        ),
        '[^a-z0-9\s\-]', '', 'g'   -- remove chars especiais
      ),
      '[\s\-]+', '-', 'g'          -- espaços/hífens múltiplos → único -
    )
  );
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'org'; END IF;

  -- Garantir unicidade
  candidate := base_slug;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.organizador
      WHERE slug = candidate
        AND (p_excluir_id IS NULL OR id <> p_excluir_id)
    ) THEN
      RETURN candidate;
    END IF;
    sufixo    := sufixo + 1;
    candidate := base_slug || '-' || sufixo;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------
-- 3. Trigger: gera slug automaticamente no INSERT se ainda nulo
--    (não regera em UPDATE para manter URLs estáveis)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_slug_organizador()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só gera se o slug ainda não está definido
  IF NEW.slug IS NULL THEN
    NEW.slug := public.gerar_slug_organizador(NEW.nome, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_slug_organizador ON public.organizador;

CREATE TRIGGER trg_slug_organizador
BEFORE INSERT ON public.organizador
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_slug_organizador();

-- -----------------------------------------------------------
-- 4. Backfill: popular slug nos organizadores já existentes
-- -----------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, nome FROM public.organizador WHERE slug IS NULL
  LOOP
    UPDATE public.organizador
    SET slug = public.gerar_slug_organizador(rec.nome, rec.id)
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------
-- 5. Índice único (agora que não há mais nulos)
-- -----------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS organizador_slug_key ON public.organizador (slug);

-- -----------------------------------------------------------
-- 6. Atualizar a view pública para incluir slug
-- -----------------------------------------------------------
DROP VIEW IF EXISTS public.organizador_publico;

CREATE VIEW public.organizador_publico
  WITH (security_invoker = false)
AS
SELECT
  id,
  nome,
  bio,
  foto_url,
  whatsapp,
  email_contato,
  slug
FROM public.organizador;

GRANT SELECT ON public.organizador_publico TO anon, authenticated;

-- -----------------------------------------------------------
-- Verificações após rodar:
--
-- Nenhum slug nulo nem duplicado:
--   SELECT COUNT(*), slug FROM organizador GROUP BY slug HAVING COUNT(*) > 1;
--   SELECT COUNT(*) FROM organizador WHERE slug IS NULL;
--
-- Ver slugs gerados:
--   SELECT id, nome, slug FROM organizador ORDER BY criado_em;
-- -----------------------------------------------------------
