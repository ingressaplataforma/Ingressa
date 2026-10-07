-- =============================================================
-- Ingressa — Script 019b: correção do bug na geração de slug
--
-- Bug: lower() envolvia todo o regexp_replace, mas o PRIMEIRO
-- regexp_replace('[^a-z0-9\s-]') rodava sobre o resultado do
-- translate() que preserva maiúsculas. Como o regex só aceita
-- a-z minúsculo, toda letra maiúscula (I, P, E...) era removida
-- antes do lower() rodar.
--
-- Fix: lower() agora envolve apenas o translate(), e os regexp_replace
-- operam sobre texto já minúsculo.
--
-- RODAR NO SUPABASE SQL EDITOR após o script 019.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Substituir a função com a versão corrigida
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_slug_organizador(
  p_nome       text,
  p_excluir_id uuid DEFAULT NULL::uuid
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  base_slug text;
  candidate text;
  sufixo    int := 0;
BEGIN
  -- Correto: lower() ANTES dos regexp_replace, só em volta do translate()
  -- FROM: 24 chars de acentos (5 a-variants, 4 e, 4 i, 5 o, 4 u, c, n × 2)
  -- TO  : 24 chars correspondentes em minúsculo
  base_slug := regexp_replace(
    regexp_replace(
      lower(
        translate(
          p_nome,
          'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiioooouuuucnaaaaaeeeeiiiioooouuuucn'
        )
      ),
      '[^a-z0-9\s\-]', '', 'g'
    ),
    '[\s\-]+', '-', 'g'
  );
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'org'; END IF;

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
$function$;

-- -----------------------------------------------------------
-- 2. Atualizar a trigger function (corpo idêntico, garante sync)
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
-- 3. Recalcular TODOS os slugs (inclusive os já preenchidos com bug)
--    Removemos o índice único temporariamente para evitar conflitos
--    durante o UPDATE em lote, depois recriamos.
-- -----------------------------------------------------------
DROP INDEX IF EXISTS organizador_slug_key;

UPDATE public.organizador o
SET slug = public.gerar_slug_organizador(o.nome, o.id);

CREATE UNIQUE INDEX organizador_slug_key ON public.organizador (slug);

-- -----------------------------------------------------------
-- Verificações após rodar:
--
-- 1. Testar a função isolada — deve retornar exatamente
--    'ingressa-plataforma-de-eventos-e-ingressos':
--      SELECT gerar_slug_organizador('Ingressa Plataforma de Eventos e Ingressos');
--
-- 2. Ver todos os slugs gerados:
--      SELECT nome, slug FROM organizador;
--
-- 3. Sem duplicados:
--      SELECT slug, COUNT(*) FROM organizador GROUP BY slug HAVING COUNT(*) > 1;
--
-- 4. Sem nulos:
--      SELECT COUNT(*) FROM organizador WHERE slug IS NULL;
-- -----------------------------------------------------------
