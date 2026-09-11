-- ============================================================
-- Ingressa — Bloco 4.1: Ledger double-entry + suporte ao gateway
-- Ricardo: rodar inteiro no Supabase SQL Editor (uma única execução).
-- DEPOIS: criar variável de ambiente ASAAS_API_KEY (sandbox) no projeto.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Coluna do recebedor Asaas no organizador
--    walletId retornado pelo POST /accounts do Asaas sandbox.
-- ------------------------------------------------------------
ALTER TABLE public.organizador
  ADD COLUMN IF NOT EXISTS gateway_recipient_id TEXT;

-- ------------------------------------------------------------
-- 2. Tabela de transações (cabeçalho de cada evento contábil)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_transacao (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                TEXT        NOT NULL
                        CHECK (tipo IN (
                          'VENDA', 'CUSTO_GATEWAY', 'LIBERACAO',
                          'LIBERACAO_RESERVA', 'REEMBOLSO', 'REPASSE',
                          'ESTORNO', 'COBRANCA_PLANO'
                        )),
    -- pedido_id sem FK: a tabela pedido será criada no Bloco 4.3.
    -- Em 4.3 adicionar: ALTER TABLE ledger_transacao
    --   ADD CONSTRAINT fk_ledger_pedido FOREIGN KEY (pedido_id) REFERENCES pedido(id);
    pedido_id           UUID,
    referencia_externa  TEXT,       -- gateway charge id ou qualquer ref não-pedido
    chave_idempotencia  TEXT        NOT NULL UNIQUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_trans_pedido    ON public.ledger_transacao(pedido_id);
CREATE INDEX IF NOT EXISTS idx_ledger_trans_tipo      ON public.ledger_transacao(tipo);
CREATE INDEX IF NOT EXISTS idx_ledger_trans_ref_ext   ON public.ledger_transacao(referencia_externa)
    WHERE referencia_externa IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Tabela de lançamentos (as pernas do double-entry)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_lancamento (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transacao_id    UUID        NOT NULL REFERENCES public.ledger_transacao(id),
    conta           TEXT        NOT NULL,  -- ex: 'organizador:{uuid}:a_liberar'
    direcao         TEXT        NOT NULL CHECK (direcao IN ('debito', 'credito')),
    valor_cents     BIGINT      NOT NULL CHECK (valor_cents > 0),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamento_transacao ON public.ledger_lancamento(transacao_id);
CREATE INDEX IF NOT EXISTS idx_lancamento_conta     ON public.ledger_lancamento(conta);

-- ------------------------------------------------------------
-- 4. RLS (tabelas acessíveis apenas via RPC SECURITY DEFINER)
-- ------------------------------------------------------------
ALTER TABLE public.ledger_transacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_lancamento ENABLE ROW LEVEL SECURITY;

-- Leitura liberada para authenticated (sem PII, apenas valores).
-- Em 4.3 restringe por conta = 'organizador:{uid}:*'.
DROP POLICY IF EXISTS "ledger_trans_select" ON public.ledger_transacao;
CREATE POLICY "ledger_trans_select" ON public.ledger_transacao
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ledger_lanc_select" ON public.ledger_lancamento;
CREATE POLICY "ledger_lanc_select" ON public.ledger_lancamento
    FOR SELECT USING (auth.role() = 'authenticated');

-- Sem política INSERT/UPDATE/DELETE → authenticated não pode escrever diretamente.
-- Escrita exclusiva via função SECURITY DEFINER abaixo.

-- ------------------------------------------------------------
-- 5. IMUTABILIDADE — proíbe UPDATE e DELETE no ledger.
--    Correção só por lançamento compensatório (ESTORNO).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proibir_mutacao_ledger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'Ledger é append-only: % proibido em %. Use lançamento compensatório (ESTORNO).',
        TG_OP, TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_lanc_imutavel  ON public.ledger_lancamento;
CREATE TRIGGER trg_ledger_lanc_imutavel
    BEFORE UPDATE OR DELETE ON public.ledger_lancamento
    FOR EACH ROW EXECUTE FUNCTION public.proibir_mutacao_ledger();

DROP TRIGGER IF EXISTS trg_ledger_trans_imutavel ON public.ledger_transacao;
CREATE TRIGGER trg_ledger_trans_imutavel
    BEFORE UPDATE OR DELETE ON public.ledger_transacao
    FOR EACH ROW EXECUTE FUNCTION public.proibir_mutacao_ledger();

-- ------------------------------------------------------------
-- 6. DOUBLE-ENTRY — toda transação deve fechar em zero.
--    DEFERRABLE INITIALLY DEFERRED: valida no COMMIT da transação SQL,
--    depois que todas as pernas foram inseridas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.checar_soma_zero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_saldo BIGINT;
BEGIN
    SELECT COALESCE(
        SUM(CASE WHEN direcao = 'debito' THEN valor_cents ELSE -valor_cents END),
        0
    ) INTO v_saldo
    FROM public.ledger_lancamento
    WHERE transacao_id = NEW.transacao_id;

    IF v_saldo <> 0 THEN
        RAISE EXCEPTION
            'Transação % não fecha em zero (saldo = %). Débitos ≠ créditos.',
            NEW.transacao_id, v_saldo;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_double_entry ON public.ledger_lancamento;
CREATE CONSTRAINT TRIGGER trg_double_entry
    AFTER INSERT ON public.ledger_lancamento
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.checar_soma_zero();

-- ------------------------------------------------------------
-- 7. VIEW de saldo por conta (derivada — jamais coluna guardada)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.saldo_conta AS
SELECT
    conta,
    SUM(CASE WHEN direcao = 'credito' THEN valor_cents ELSE -valor_cents END) AS saldo_cents
FROM public.ledger_lancamento
GROUP BY conta;

-- ------------------------------------------------------------
-- 8. RPC: registrar_transacao_ledger
--    Insere transacao + pernas atomicamente numa única transação SQL.
--    Idempotente: retorna 'duplicada' se a chave já existe (no-op).
--    SECURITY DEFINER → bypassa RLS, roda como dono da função.
--
--    p_pernas: JSONB array de [{conta, direcao, valor_cents}]
--    Exemplo:
--      '[
--        {"conta":"participante:entrada","direcao":"debito","valor_cents":15190},
--        {"conta":"plataforma:taxa","direcao":"credito","valor_cents":190},
--        {"conta":"organizador:uuid:a_liberar","direcao":"credito","valor_cents":15000}
--      ]'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_transacao_ledger(
    p_tipo              TEXT,
    p_chave             TEXT,
    p_pedido_id         UUID    DEFAULT NULL,
    p_referencia_ext    TEXT    DEFAULT NULL,
    p_pernas            JSONB   DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transacao_id UUID;
    v_perna        JSONB;
BEGIN
    -- Idempotência: chave já processada → no-op silencioso
    SELECT id INTO v_transacao_id
      FROM public.ledger_transacao
     WHERE chave_idempotencia = p_chave;

    IF v_transacao_id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'duplicada', 'transacao_id', v_transacao_id);
    END IF;

    -- Insere cabeçalho da transação
    INSERT INTO public.ledger_transacao (tipo, pedido_id, referencia_externa, chave_idempotencia)
    VALUES (p_tipo, p_pedido_id, p_referencia_ext, p_chave)
    RETURNING id INTO v_transacao_id;

    -- Insere cada perna
    FOR v_perna IN SELECT * FROM jsonb_array_elements(p_pernas)
    LOOP
        INSERT INTO public.ledger_lancamento (transacao_id, conta, direcao, valor_cents)
        VALUES (
            v_transacao_id,
            v_perna->>'conta',
            v_perna->>'direcao',
            (v_perna->>'valor_cents')::BIGINT
        );
    END LOOP;

    -- O trigger trg_double_entry (DEFERRABLE INITIALLY DEFERRED) valida soma=0 no COMMIT.
    RETURN jsonb_build_object('status', 'ok', 'transacao_id', v_transacao_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_transacao_ledger TO authenticated;

-- ------------------------------------------------------------
-- 9. Verificação manual após rodar (cole num novo query):
--
--   -- Deve FALHAR (soma ≠ 0):
--   SELECT registrar_transacao_ledger(
--     'VENDA', 'teste-soma-zero-' || gen_random_uuid(),
--     NULL, NULL,
--     '[{"conta":"a","direcao":"debito","valor_cents":100},
--       {"conta":"b","direcao":"credito","valor_cents":90}]'
--   );
--
--   -- Deve FALHAR (UPDATE proibido — rode antes de criar qualquer linha):
--   -- UPDATE ledger_lancamento SET valor_cents = 1 WHERE id = 1;
-- ------------------------------------------------------------
