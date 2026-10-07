-- =============================================================
-- Ingressa — Script 019b: correção do bug na geração de slug
--
-- Bug: lower() era aplicado DEPOIS do regexp que remove [^a-z0-9\s-],
-- então letras maiúsculas (I, P, E...) eram deletadas antes de serem
-- convertidas. Além disso, o translate() manual tinha off-by-one
-- (6 'a's para 5 variantes de á), mapeando é→a em nomes com acento.
--
-- Fix: usar unaccent() + lower() ANTES do regexp de limpeza.
--
-- RODAR NO SUPABASE SQL EDITOR após o script 019.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Habilitar extensão unaccent (idempotente)
-- -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

-- -----------------------------------------------------------
-- 2. Substituir a função com a versão corrigida
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_slug_organizador(
  p_nome       text,
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
  -- Normalizar: unaccent → lower → manter só [a-z0-9] e espaços → colapsar hífens
  base_slug := trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(p_nome)),
        '[^a-z0-9\s\-]', '', 'g'   -- remove chars especiais (após lower, maiúsculas já foram convertidas)
      ),
      '[\s\-]+', '-', 'g'          -- espaços/hífens múltiplos → único -
    )
  );
  IF base_slug = '' THEN base_slug := 'org'; END IF;

  -- Garantir unicidade (sufixar com -2, -3... em colisão)
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
-- 3. Atualizar a trigger function para usar a versão corrigida
--    (o corpo é idêntico — só garante que está atualizado)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_slug_organizador()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.gerar_slug_organizador(NEW.nome, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- 4. Recalcular todos os slugs existentes
--    a. Zerar para NULL (índice UNIQUE permite múltiplos NULLs)
--    b. Re-popular com a função corrigida
-- -----------------------------------------------------------

-- Remover índice único temporariamente para poder zerar sem conflito
DROP INDEX IF EXISTS organizador_slug_key;

-- Zerar todos os slugs
UPDATE public.organizador SET slug = NULL;

-- Re-popular com a função corrigida (mesma lógica do backfill do 019)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, nome FROM public.organizador ORDER BY criado_em
  LOOP
    UPDATE public.organizador
    SET slug = public.gerar_slug_organizador(rec.nome, rec.id)
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Recriar índice único
CREATE UNIQUE INDEX organizador_slug_key ON public.organizador (slug);

-- -----------------------------------------------------------
-- Verificações após rodar:
--
-- "Ingressa Plataforma de Eventos e Ingressos" deve virar
-- "ingressa-plataforma-de-eventos-e-ingressos":
--   SELECT nome, slug FROM organizador;
--
-- Nenhum duplicado:
--   SELECT slug, COUNT(*) FROM organizador GROUP BY slug HAVING COUNT(*) > 1;
--
-- Nenhum nulo:
--   SELECT COUNT(*) FROM organizador WHERE slug IS NULL;
-- -----------------------------------------------------------
