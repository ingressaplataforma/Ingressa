-- ============================================================
-- Ingressa — Seed: Plano Ingressa (idempotente)
-- Ricardo: rodar no SQL Editor do Supabase se a tabela `plano`
-- estiver vazia (ex.: após limpeza de dados de teste).
-- Seguro re-rodar — usa ON CONFLICT DO NOTHING, não duplica.
-- ============================================================

INSERT INTO public.plano (nome, preco_cents, periodicidade, ativo)
VALUES ('Plano Ingressa', 14900, 'mensal', true)
ON CONFLICT DO NOTHING;

-- Verificação: deve retornar 1 linha
SELECT id, nome, preco_cents, periodicidade, ativo, criado_em
FROM public.plano
WHERE ativo = true
ORDER BY criado_em;
