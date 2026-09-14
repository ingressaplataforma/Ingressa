-- ============================================================
-- Ingressa — Bloco 4.2: Plano de assinatura mensal recorrente
-- Ricardo: rodar inteiro no Supabase SQL Editor (uma única execução).
-- DEPOIS: configurar webhook no painel Asaas (ver instruções no fim).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Coluna de cliente Asaas no organizador (payer, ≠ recipient)
-- ------------------------------------------------------------
ALTER TABLE public.organizador
  ADD COLUMN IF NOT EXISTS gateway_customer_id TEXT;

-- ------------------------------------------------------------
-- 2. Tabela plano (catálogo de planos disponíveis)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plano (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT        NOT NULL,
  preco_cents    BIGINT      NOT NULL CHECK (preco_cents > 0),
  periodicidade  TEXT        NOT NULL DEFAULT 'mensal',
  ativo          BOOLEAN     NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed inicial — VALOR PLACEHOLDER, a validar com o time comercial.
INSERT INTO public.plano (nome, preco_cents, periodicidade)
VALUES ('Plano Ingressa', 14900, 'mensal')
ON CONFLICT DO NOTHING;

-- RLS: leitura pública (não há PII no catálogo de planos)
ALTER TABLE public.plano ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plano_select" ON public.plano;
CREATE POLICY "plano_select" ON public.plano
  FOR SELECT USING (ativo = true);

-- ------------------------------------------------------------
-- 3. Tabela assinatura (estado da assinatura por organizador)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_id         UUID        NOT NULL REFERENCES public.organizador(id) ON DELETE CASCADE,
  plano_id               UUID        NOT NULL REFERENCES public.plano(id),
  asaas_subscription_id  TEXT        UNIQUE,
  asaas_customer_id      TEXT,
  status                 TEXT        NOT NULL DEFAULT 'pendente'
                         CHECK (status IN ('ativa','em_graca','inadimplente','cancelada','pendente')),
  url_pagamento          TEXT,        -- invoiceUrl do primeiro pagamento pendente
  inicio                 TIMESTAMPTZ,
  proximo_vencimento     TIMESTAMPTZ,
  graca_ate              TIMESTAMPTZ,
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assinatura_org ON public.assinatura(organizador_id);
CREATE INDEX IF NOT EXISTS idx_assinatura_subscription ON public.assinatura(asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

-- RLS: organizador enxerga/gerencia só a própria assinatura
ALTER TABLE public.assinatura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assinatura_select" ON public.assinatura;
CREATE POLICY "assinatura_select" ON public.assinatura
  FOR SELECT USING (organizador_id = auth.uid());

DROP POLICY IF EXISTS "assinatura_insert" ON public.assinatura;
CREATE POLICY "assinatura_insert" ON public.assinatura
  FOR INSERT WITH CHECK (organizador_id = auth.uid());

DROP POLICY IF EXISTS "assinatura_update" ON public.assinatura;
CREATE POLICY "assinatura_update" ON public.assinatura
  FOR UPDATE USING (organizador_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Funções SECURITY DEFINER para o webhook (chamadas via anon)
--    O webhook valida o token Asaas antes de chamar estas funções.
--    SECURITY DEFINER → roda como dono da função, bypassa RLS.
-- ------------------------------------------------------------

-- 4a. Ativa assinatura após pagamento confirmado + registra no ledger
CREATE OR REPLACE FUNCTION public.webhook_ativar_assinatura(
  p_subscription_id    TEXT,
  p_payment_id         TEXT,
  p_valor_cents        BIGINT,
  p_proximo_vencimento TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id     UUID;
  v_org_id UUID;
  v_chave  TEXT;
  v_ledger JSONB;
BEGIN
  SELECT id, organizador_id INTO v_id, v_org_id
    FROM assinatura WHERE asaas_subscription_id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  UPDATE assinatura SET
    status             = 'ativa',
    graca_ate          = NULL,
    proximo_vencimento = p_proximo_vencimento,
    atualizado_em      = now()
  WHERE id = v_id;

  -- Registra receita no ledger (idempotente: mesmo payment_id → no-op)
  IF p_valor_cents > 0 THEN
    v_chave := 'asaas-plano-' || p_payment_id;
    SELECT registrar_transacao_ledger(
      'COBRANCA_PLANO',
      v_chave,
      NULL,       -- sem pedido_id (não é venda de ingresso)
      p_payment_id,
      jsonb_build_array(
        jsonb_build_object(
          'conta',       'organizador:' || v_org_id || ':plano',
          'direcao',     'debito',
          'valor_cents', p_valor_cents
        ),
        jsonb_build_object(
          'conta',       'plataforma:receita_plano',
          'direcao',     'credito',
          'valor_cents', p_valor_cents
        )
      )
    ) INTO v_ledger;
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'ledger', v_ledger);
END;
$$;

GRANT EXECUTE ON FUNCTION public.webhook_ativar_assinatura TO anon;

-- 4b. Marca assinatura em graça após pagamento vencido
CREATE OR REPLACE FUNCTION public.webhook_overdue_assinatura(
  p_subscription_id TEXT,
  p_graca_ate       TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_graca  TIMESTAMPTZ;
BEGIN
  SELECT status, graca_ate INTO v_status, v_graca
    FROM assinatura WHERE asaas_subscription_id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_status IN ('ativa', 'pendente') THEN
    -- Primeiro vencimento: entrar em graça
    UPDATE assinatura SET
      status        = 'em_graca',
      graca_ate     = p_graca_ate,
      atualizado_em = now()
    WHERE asaas_subscription_id = p_subscription_id;

  ELSIF v_status = 'em_graca' AND v_graca IS NOT NULL AND v_graca < now() THEN
    -- Graça expirou: inadimplente
    UPDATE assinatura SET
      status        = 'inadimplente',
      atualizado_em = now()
    WHERE asaas_subscription_id = p_subscription_id;
  END IF;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.webhook_overdue_assinatura TO anon;

-- 4c. Cancela assinatura (via webhook SUBSCRIPTION_DELETED ou request do org)
CREATE OR REPLACE FUNCTION public.webhook_cancelar_assinatura(
  p_subscription_id TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE assinatura SET
    status        = 'cancelada',
    atualizado_em = now()
  WHERE asaas_subscription_id = p_subscription_id
    AND status NOT IN ('cancelada');

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.webhook_cancelar_assinatura TO anon;

-- ============================================================
-- CONFIGURAÇÃO MANUAL DO WEBHOOK NO ASAAS (Ricardo executa)
-- ============================================================
-- 1. Acessar: https://sandbox.asaas.com/configuracoes/integracoes/webhooks
-- 2. Criar novo webhook com:
--    URL: https://<seu-dominio>/api/webhooks/asaas
--    (em dev local com ngrok: https://xxxx.ngrok-free.app/api/webhooks/asaas)
--    Eventos a ativar:
--      PAYMENT_RECEIVED
--      PAYMENT_CONFIRMED
--      PAYMENT_OVERDUE
--      SUBSCRIPTION_DELETED
--      SUBSCRIPTION_INACTIVATED
--    NÃO há campo de "token secreto" separado — o Asaas envia o header
--    asaas-access-token com a API key da conta, que validamos server-side.
-- 3. Copiar a ASAAS_API_KEY e confirmar que está em .env.local.
-- 4. Para testes locais, usar ngrok: npx ngrok http 3000
-- ============================================================
