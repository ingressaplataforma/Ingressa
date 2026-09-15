-- ============================================================
-- Ingressa — Bloco 4.3: ingresso pago (split, repasse, reserva)
-- Ricardo: rodar inteiro no Supabase SQL Editor (uma única execução).
--
-- Pré-requisito: scripts 008_ledger.sql e 009_meios_pagamento.sql
--   já executados (ledger_transacao, ledger_lancamento, aceita_cartao,
--   aceita_boleto existentes).
-- ============================================================

-- ------------------------------------------------------------
-- 1. quem_paga_taxa por evento
--    'comprador' → total = ingresso + taxa (default)
--    'organizador' → total = ingresso; taxa sai do repasse do org
-- ------------------------------------------------------------
ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS quem_paga_taxa TEXT NOT NULL DEFAULT 'comprador'
  CHECK (quem_paga_taxa IN ('comprador', 'organizador'));

-- ------------------------------------------------------------
-- 2. Tabela pedido — um pedido por compra de ingresso(s)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedido (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comprador_id          UUID        NOT NULL REFERENCES public.comprador(id),
  organizador_id        UUID        NOT NULL REFERENCES public.organizador(id),
  evento_id             UUID        NOT NULL REFERENCES public.evento(id),
  lote_id               UUID        NOT NULL REFERENCES public.lote(id),
  quantidade            INT         NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario_cents  BIGINT      NOT NULL CHECK (preco_unitario_cents > 0),
  taxa_cents            BIGINT      NOT NULL DEFAULT 0 CHECK (taxa_cents >= 0),
  org_recebe_cents      BIGINT      NOT NULL CHECK (org_recebe_cents > 0),
  total_cents           BIGINT      NOT NULL CHECK (total_cents > 0),
  quem_paga_taxa        TEXT        NOT NULL DEFAULT 'comprador'
                        CHECK (quem_paga_taxa IN ('comprador', 'organizador')),
  meio                  TEXT        NOT NULL CHECK (meio IN ('pix', 'cartao', 'boleto')),
  status                TEXT        NOT NULL DEFAULT 'aguardando_pagamento'
                        CHECK (status IN ('aguardando_pagamento','pago','cancelado','reembolsado')),
  asaas_charge_id       TEXT        UNIQUE,
  asaas_invoice_url     TEXT,
  pix_copia_cola        TEXT,
  chave_idempotencia    TEXT        NOT NULL UNIQUE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  pago_em               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pedido_comprador   ON public.pedido(comprador_id);
CREATE INDEX IF NOT EXISTS idx_pedido_evento      ON public.pedido(evento_id);
CREATE INDEX IF NOT EXISTS idx_pedido_charge      ON public.pedido(asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;

-- RLS: comprador lê seus próprios pedidos
ALTER TABLE public.pedido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedido_comprador_select" ON public.pedido;
CREATE POLICY "pedido_comprador_select" ON public.pedido
  FOR SELECT USING (auth.uid() = comprador_id);

-- ------------------------------------------------------------
-- 3. FK: ledger_transacao.pedido_id → pedido
--    (comentado no 008 como "a ser feito no 4.3")
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ledger_pedido'
      AND table_name = 'ledger_transacao'
  ) THEN
    ALTER TABLE public.ledger_transacao
      ADD CONSTRAINT fk_ledger_pedido
      FOREIGN KEY (pedido_id) REFERENCES public.pedido(id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. pedido_id em ingresso (nullable — ingressos gratuitos ficam NULL)
-- ------------------------------------------------------------
ALTER TABLE public.ingresso
  ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES public.pedido(id) ON DELETE SET NULL;

-- status já existe na tabela ingresso; garantir 'cancelado' no CHECK é responsabilidade
-- da tabela original. Adicionamos índice para lookup via pedido.
CREATE INDEX IF NOT EXISTS idx_ingresso_pedido ON public.ingresso(pedido_id)
  WHERE pedido_id IS NOT NULL;

-- ------------------------------------------------------------
-- 5. RPC: confirmar_pedido_pago
--    Chamada pelo webhook (sem sessão → anon) após PAYMENT_CONFIRMED.
--    Atômica: pedido→pago, lote.quantidade_vendida++, ingresso INSERT,
--    ledger VENDA double-entry.
--    Idempotente: charge_id já 'pago' → 'duplicado' silencioso.
--    SECURITY DEFINER: bypassa RLS (webhook não tem sessão auth).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_pedido_pago(
  p_asaas_charge_id TEXT,
  p_codigo          UUID,
  p_token_assinado  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido  pedido%ROWTYPE;
  v_ingresso_id UUID;
  v_ledger  JSONB;
BEGIN
  -- Lock para evitar race condition em webhooks duplicados
  SELECT * INTO v_pedido
    FROM public.pedido
   WHERE asaas_charge_id = p_asaas_charge_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'nao_encontrado');
  END IF;

  -- Idempotência: já processado
  IF v_pedido.status = 'pago' THEN
    RETURN jsonb_build_object('status', 'duplicado');
  END IF;

  -- Incremento atômico com verificação de capacidade
  UPDATE public.lote
     SET quantidade_vendida = quantidade_vendida + v_pedido.quantidade
   WHERE id = v_pedido.lote_id
     AND quantidade_vendida + v_pedido.quantidade <= quantidade_total;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'esgotado');
  END IF;

  -- Marcar pedido como pago
  UPDATE public.pedido
     SET status = 'pago', pago_em = now()
   WHERE id = v_pedido.id;

  -- Emitir ingresso
  INSERT INTO public.ingresso
    (comprador_id, evento_id, lote_id, pedido_id, codigo, token_assinado, status)
  VALUES
    (v_pedido.comprador_id, v_pedido.evento_id, v_pedido.lote_id,
     v_pedido.id, p_codigo, p_token_assinado, 'ativo')
  RETURNING id INTO v_ingresso_id;

  -- Registrar VENDA no ledger (double-entry, fecha em zero)
  -- DEBIT participante:entrada = total_cents
  -- CREDIT plataforma:taxa     = taxa_cents
  -- CREDIT organizador:{id}:a_liberar = org_recebe_cents
  SELECT public.registrar_transacao_ledger(
    'VENDA',
    'venda-' || v_pedido.id::TEXT,
    v_pedido.id,
    p_asaas_charge_id,
    jsonb_build_array(
      jsonb_build_object(
        'conta',       'participante:entrada',
        'direcao',     'debito',
        'valor_cents', v_pedido.total_cents
      ),
      jsonb_build_object(
        'conta',       'plataforma:taxa',
        'direcao',     'credito',
        'valor_cents', v_pedido.taxa_cents
      ),
      jsonb_build_object(
        'conta',       'organizador:' || v_pedido.organizador_id::TEXT || ':a_liberar',
        'direcao',     'credito',
        'valor_cents', v_pedido.org_recebe_cents
      )
    )
  ) INTO v_ledger;

  RETURN jsonb_build_object(
    'status',       'ok',
    'ingresso_id',  v_ingresso_id,
    'pedido_id',    v_pedido.id,
    'ledger',       v_ledger
  );
END;
$$;

-- Webhook não tem sessão → conceder ao anon
GRANT EXECUTE ON FUNCTION public.confirmar_pedido_pago TO anon;

-- ------------------------------------------------------------
-- 6. RPC: reverter_pedido_pago
--    Chamada pelo handler de reembolso (authenticated) após
--    o estorno no Asaas ser confirmado.
--    Cancela ingresso + registra REEMBOLSO no ledger.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverter_pedido_pago(
  p_pedido_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido      pedido%ROWTYPE;
  v_ingresso_id UUID;
  v_ledger      JSONB;
BEGIN
  SELECT * INTO v_pedido FROM public.pedido WHERE id = p_pedido_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'nao_encontrado');
  END IF;

  IF v_pedido.status = 'reembolsado' THEN
    RETURN jsonb_build_object('status', 'duplicado');
  END IF;

  IF v_pedido.status != 'pago' THEN
    RETURN jsonb_build_object('status', 'nao_elegivel');
  END IF;

  -- Cancelar ingresso
  UPDATE public.ingresso
     SET status = 'cancelado'
   WHERE pedido_id = p_pedido_id
  RETURNING id INTO v_ingresso_id;

  -- Devolver vaga ao lote
  UPDATE public.lote
     SET quantidade_vendida = GREATEST(0, quantidade_vendida - v_pedido.quantidade)
   WHERE id = v_pedido.lote_id;

  -- Marcar pedido como reembolsado
  UPDATE public.pedido SET status = 'reembolsado' WHERE id = p_pedido_id;

  -- REEMBOLSO no ledger (double-entry, fecha em zero)
  -- DEBIT  organizador:{id}:a_liberar = org_recebe_cents
  -- DEBIT  plataforma:taxa            = taxa_cents
  -- CREDIT participante:entrada       = total_cents
  SELECT public.registrar_transacao_ledger(
    'REEMBOLSO',
    'reembolso-' || p_pedido_id::TEXT,
    p_pedido_id,
    NULL,
    jsonb_build_array(
      jsonb_build_object(
        'conta',       'organizador:' || v_pedido.organizador_id::TEXT || ':a_liberar',
        'direcao',     'debito',
        'valor_cents', v_pedido.org_recebe_cents
      ),
      jsonb_build_object(
        'conta',       'plataforma:taxa',
        'direcao',     'debito',
        'valor_cents', v_pedido.taxa_cents
      ),
      jsonb_build_object(
        'conta',       'participante:entrada',
        'direcao',     'credito',
        'valor_cents', v_pedido.total_cents
      )
    )
  ) INTO v_ledger;

  RETURN jsonb_build_object(
    'status',       'ok',
    'ingresso_id',  v_ingresso_id,
    'ledger',       v_ledger
  );
END;
$$;

-- Autenticado: comprador faz a requisição com sessão ativa
GRANT EXECUTE ON FUNCTION public.reverter_pedido_pago TO authenticated;

-- ------------------------------------------------------------
-- 7. Verificação após rodar (cole num novo query):
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'pedido' ORDER BY ordinal_position;
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'ingresso' AND column_name = 'pedido_id';
--
--   SELECT routine_name FROM information_schema.routines
--    WHERE routine_name IN ('confirmar_pedido_pago','reverter_pedido_pago');
-- ------------------------------------------------------------
