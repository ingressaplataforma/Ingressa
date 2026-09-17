-- =============================================================
-- Ingressa — 016: donos de ingresso + tabela lead
-- Rodar no SQL Editor do Supabase APÓS scripts 001–015.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Colunas de dono no ingresso
--    dono ≠ comprador: nos extras, o dono é outra pessoa.
-- -----------------------------------------------------------
ALTER TABLE public.ingresso
  ADD COLUMN IF NOT EXISTS dono_nome     TEXT,
  ADD COLUMN IF NOT EXISTS dono_cpf      TEXT,  -- digits only
  ADD COLUMN IF NOT EXISTS dono_email    TEXT,
  ADD COLUMN IF NOT EXISTS dono_telefone TEXT;

-- Popula os ingressos existentes com dados do próprio comprador
-- (CPF pode ser nulo p/ contas antigas sem CPF cadastrado)
UPDATE public.ingresso i
SET
  dono_nome  = c.nome,
  dono_cpf   = c.cpf,
  dono_email = u.email
FROM public.comprador c
JOIN auth.users u ON u.id = c.id
WHERE i.comprador_id = c.id
  AND i.dono_nome IS NULL;

-- Índice único: mesmo CPF não pode ser dono de 2 ingressos no mesmo evento
-- NULLs são excluídos (ingressos antigos sem CPF não conflitam)
CREATE UNIQUE INDEX IF NOT EXISTS ingresso_evento_dono_cpf_unico
  ON public.ingresso (evento_id, dono_cpf)
  WHERE dono_cpf IS NOT NULL;

-- -----------------------------------------------------------
-- 2. Tabela lead
--    Donos extras (2º ingresso em diante) viram leads.
--    RLS: sem SELECT público/organizador — só via service_role
--    (painel Supabase).
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  cpf                   TEXT NOT NULL,
  email                 TEXT NOT NULL,
  telefone              TEXT,
  origem_evento_id      UUID REFERENCES public.evento(id) ON DELETE SET NULL,
  origem_comprador_id   UUID REFERENCES public.comprador(id) ON DELETE SET NULL,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem inserir leads originados por eles mesmos
CREATE POLICY "lead_insert_authenticated"
  ON public.lead FOR INSERT TO authenticated
  WITH CHECK (origem_comprador_id = auth.uid());

-- Sem política de SELECT = nenhum cliente lê leads
-- (service_role do Supabase dashboard continua tendo acesso)

-- -----------------------------------------------------------
-- 3. Nova RPC: inscrever_lote_batch
--    Atômica: verifica N vagas, insere N ingressos, incrementa N.
--    Substitui inscrever_em_lote nos novos fluxos.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inscrever_lote_batch(
  p_lote_id       UUID,
  p_comprador_id  UUID,
  p_donos         JSONB   -- [{codigo, token_assinado, dono_nome, dono_cpf, dono_email, dono_telefone}]
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

  -- Trava a linha e confirma que há vagas suficientes para todos
  SELECT evento_id INTO v_evento_id
  FROM lote
  WHERE id = p_lote_id
    AND (quantidade_total - quantidade_vendida) >= n_donos
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lote_esgotado';
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
      dono->>'dono_cpf',       -- já normalizado (só dígitos) pelo caller
      dono->>'dono_email',
      NULLIF(dono->>'dono_telefone', '')
    )
    RETURNING id INTO v_id;

    v_ingresso_ids := v_ingresso_ids || v_id;
  END LOOP;

  -- Incrementa o contador de vendidos de uma vez
  UPDATE lote
  SET quantidade_vendida = quantidade_vendida + n_donos
  WHERE id = p_lote_id;

  RETURN v_ingresso_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.inscrever_lote_batch TO authenticated;

-- -----------------------------------------------------------
-- 4. Atualiza fazer_checkin para usar dono_nome/dono_email
--    (com fallback para comprador nos ingressos antigos)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fazer_checkin(
  p_codigo     UUID,
  p_evento_id  UUID,
  p_usado_por  TEXT,
  p_origem     TEXT DEFAULT 'online'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_ing    RECORD;
  v_comp   RECORD;
  v_lote   RECORD;
  v_nome   TEXT;
  v_email  TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM evento WHERE id = p_evento_id AND organizador_id = v_caller
  ) THEN
    RAISE EXCEPTION 'acesso_negado';
  END IF;

  UPDATE ingresso
  SET
    status         = 'usado',
    usado_em       = NOW(),
    usado_por      = p_usado_por,
    checkin_origem = p_origem
  WHERE codigo    = p_codigo
    AND evento_id = p_evento_id
    AND status    = 'valido'
  RETURNING id, comprador_id, lote_id, dono_nome, dono_email INTO v_ing;

  IF FOUND THEN
    SELECT nome INTO v_comp FROM comprador WHERE id = v_ing.comprador_id;
    SELECT nome INTO v_lote FROM lote      WHERE id = v_ing.lote_id;
    v_nome  := COALESCE(v_ing.dono_nome,  v_comp.nome, '');
    v_email := COALESCE(v_ing.dono_email, '');
    RETURN jsonb_build_object(
      'resultado', 'ok',
      'nome',      v_nome,
      'email',     v_email,
      'lote',      COALESCE(v_lote.nome, '')
    );
  END IF;

  SELECT id, status, usado_em, comprador_id, lote_id, dono_nome, dono_email
  INTO v_ing
  FROM ingresso
  WHERE codigo = p_codigo AND evento_id = p_evento_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('resultado', 'nao_encontrado');
  END IF;

  IF v_ing.status = 'usado' THEN
    SELECT nome INTO v_comp FROM comprador WHERE id = v_ing.comprador_id;
    SELECT nome INTO v_lote FROM lote      WHERE id = v_ing.lote_id;
    v_nome  := COALESCE(v_ing.dono_nome,  v_comp.nome, '');
    v_email := COALESCE(v_ing.dono_email, '');
    RETURN jsonb_build_object(
      'resultado', 'ja_usado',
      'usado_em',  v_ing.usado_em,
      'nome',      v_nome,
      'email',     v_email,
      'lote',      COALESCE(v_lote.nome, '')
    );
  END IF;

  RETURN jsonb_build_object('resultado', 'invalido', 'status', v_ing.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;
