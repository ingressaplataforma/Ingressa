-- =============================================================
-- Ingressa — 016c: popula dono_cpf em ingressos legados com CPF nulo
--
-- QUANDO RODAR: após 016 e 016b já terem sido executados.
-- ATENÇÃO: cancela ingressos excedentes de teste (mesmo comprador,
--          mesmo evento, mais de 1 ingresso com CPF nulo).
--          Revise a query de diagnóstico abaixo antes de confirmar.
-- RECOMENDAÇÃO: rodar com o site fechado (modo manutenção) para
--               evitar concorrência com novas inscrições.
-- =============================================================

-- ── 0. Diagnóstico: ingressos com dono_cpf nulo ─────────────
-- Rodar primeiro para entender o que será alterado.
SELECT
  i.id,
  i.evento_id,
  i.status,
  i.criado_em,
  c.nome  AS comprador_nome,
  c.cpf   AS comprador_cpf,
  i.dono_nome,
  i.dono_cpf
FROM public.ingresso i
JOIN public.comprador c ON c.id = i.comprador_id
WHERE i.dono_cpf IS NULL
ORDER BY i.evento_id, c.cpf, i.criado_em;

-- ── 1. Cancela duplicatas: mesmo (evento, comprador_cpf), dono_cpf nulo ─
-- Mantém o ingresso mais antigo; cancela os excedentes.
-- Afeta apenas ingressos onde dono_cpf ainda é nulo E o comprador tem CPF.
UPDATE public.ingresso
SET status = 'cancelado'
WHERE id IN (
  SELECT id FROM (
    SELECT
      i.id,
      ROW_NUMBER() OVER (
        PARTITION BY i.evento_id, regexp_replace(c.cpf, '[^0-9]', '', 'g')
        ORDER BY i.criado_em
      ) AS rn
    FROM public.ingresso i
    JOIN public.comprador c ON c.id = i.comprador_id
    WHERE i.dono_cpf IS NULL
      AND c.cpf IS NOT NULL
      AND c.cpf <> ''
      AND i.status <> 'cancelado'
  ) ranked
  WHERE rn > 1
);

-- ── 2. Popula dono_cpf, dono_nome e dono_email nos restantes ─
-- Somente onde dono_cpf ainda é nulo, comprador tem CPF e ingresso não cancelado.
UPDATE public.ingresso i
SET
  dono_cpf    = regexp_replace(c.cpf, '[^0-9]', '', 'g'),
  dono_nome   = COALESCE(i.dono_nome,  c.nome),
  dono_email  = COALESCE(i.dono_email, u.email)
FROM public.comprador c
JOIN auth.users u ON u.id = c.id
WHERE i.comprador_id = c.id
  AND i.dono_cpf IS NULL
  AND c.cpf IS NOT NULL
  AND c.cpf <> ''
  AND i.status <> 'cancelado';

-- ── 3. Verificação final ─────────────────────────────────────
-- Deve retornar 0 linhas se todos os ingressos com comprador_cpf
-- foram corretamente populados.
SELECT count(*) AS restam_nulos
FROM public.ingresso i
JOIN public.comprador c ON c.id = i.comprador_id
WHERE i.dono_cpf IS NULL
  AND c.cpf IS NOT NULL
  AND c.cpf <> ''
  AND i.status <> 'cancelado';
