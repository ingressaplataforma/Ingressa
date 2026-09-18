-- =============================================================
-- Ingressa — 016b: corrige índice único de dono_cpf por evento
-- Rodar se o CREATE UNIQUE INDEX do script 016 falhou
-- (ex.: já havia linhas duplicadas dos testes pré-Item 3).
-- =============================================================

-- 1. Diagnóstico — ver quais CPFs estão duplicados no mesmo evento
SELECT evento_id, dono_cpf, count(*) AS qtd
FROM public.ingresso
WHERE dono_cpf IS NOT NULL
GROUP BY evento_id, dono_cpf
HAVING count(*) > 1;

-- 2. (Apenas se houver duplicatas acima) Marcar os extras duplicados
--    como cancelados, mantendo o primeiro de cada grupo.
--    Descomentar e executar SOMENTE se necessário após analisar os dados.
/*
UPDATE public.ingresso
SET status = 'cancelado'
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY evento_id, dono_cpf ORDER BY criado_em) AS rn
    FROM public.ingresso
    WHERE dono_cpf IS NOT NULL
  ) ranked
  WHERE rn > 1
);
*/

-- 3. Recriar o índice único (seguro de rodar: IF NOT EXISTS não faz nada
--    se já existir; DROP + CREATE se precisar forçar)
DROP INDEX IF EXISTS ingresso_evento_dono_cpf_unico;

CREATE UNIQUE INDEX ingresso_evento_dono_cpf_unico
  ON public.ingresso (evento_id, dono_cpf)
  WHERE dono_cpf IS NOT NULL;

-- 4. Atualiza a RPC inscrever_lote_batch para verificar duplicatas
--    EXPLICITAMENTE antes de inserir (belt + suspenders além do índice único).
CREATE OR REPLACE FUNCTION public.inscrever_lote_batch(
  p_lote_id       UUID,
  p_comprador_id  UUID,
  p_donos         JSONB
) RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_donos        INT;
  v_evento_id    UUID;
  v_ingresso_ids UUID[] := '{}';
  v_id           UUID;
  dono           JSONB;
BEGIN
  n_donos := jsonb_array_length(p_donos);

  -- Trava e confirma vagas
  SELECT evento_id INTO v_evento_id
  FROM lote
  WHERE id = p_lote_id
    AND (quantidade_total - quantidade_vendida) >= n_donos
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lote_esgotado';
  END IF;

  -- Verifica duplicatas de CPF DENTRO do próprio lote
  IF (
    SELECT count(DISTINCT elem->>'dono_cpf')
    FROM jsonb_array_elements(p_donos) AS t(elem)
    WHERE elem->>'dono_cpf' IS NOT NULL AND elem->>'dono_cpf' <> ''
  ) < (
    SELECT count(*)
    FROM jsonb_array_elements(p_donos) AS t(elem)
    WHERE elem->>'dono_cpf' IS NOT NULL AND elem->>'dono_cpf' <> ''
  ) THEN
    RAISE EXCEPTION 'cpf_duplicado_no_lote';
  END IF;

  -- Verifica CPFs já inscritos neste evento
  IF EXISTS (
    SELECT 1
    FROM ingresso i
    JOIN jsonb_array_elements(p_donos) AS t(elem)
      ON t.elem->>'dono_cpf' = i.dono_cpf
    WHERE i.evento_id = v_evento_id
      AND t.elem->>'dono_cpf' IS NOT NULL
      AND t.elem->>'dono_cpf' <> ''
  ) THEN
    RAISE EXCEPTION 'cpf_ja_inscrito';
  END IF;

  -- Insere um ingresso por dono
  FOR dono IN SELECT * FROM jsonb_array_elements(p_donos)
  LOOP
    INSERT INTO ingresso (
      lote_id, evento_id, comprador_id, codigo, token_assinado,
      dono_nome, dono_cpf, dono_email, dono_telefone
    ) VALUES (
      p_lote_id,
      v_evento_id,
      p_comprador_id,
      (dono->>'codigo')::UUID,
      dono->>'token_assinado',
      dono->>'dono_nome',
      NULLIF(dono->>'dono_cpf', ''),
      dono->>'dono_email',
      NULLIF(dono->>'dono_telefone', '')
    )
    RETURNING id INTO v_id;

    v_ingresso_ids := v_ingresso_ids || v_id;
  END LOOP;

  -- Incrementa contador de uma vez
  UPDATE lote
  SET quantidade_vendida = quantidade_vendida + n_donos
  WHERE id = p_lote_id;

  RETURN v_ingresso_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.inscrever_lote_batch TO authenticated;
