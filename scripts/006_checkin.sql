-- =============================================================
-- Ingressa — Bloco 3: check-in e validação do QR
-- Rodar no SQL Editor do Supabase APÓS scripts 001–005.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Colunas de auditoria de check-in na tabela ingresso
-- -----------------------------------------------------------
ALTER TABLE public.ingresso
  ADD COLUMN IF NOT EXISTS usado_por       TEXT,
  ADD COLUMN IF NOT EXISTS checkin_origem  TEXT
    CHECK (checkin_origem IN ('online', 'offline'));

-- -----------------------------------------------------------
-- 2. RLS: organizador pode fazer UPDATE para check-in
-- -----------------------------------------------------------
CREATE POLICY IF NOT EXISTS "ingresso_update_organizador_checkin"
  ON public.ingresso FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.evento
      WHERE evento.id = ingresso.evento_id
        AND evento.organizador_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evento
      WHERE evento.id = ingresso.evento_id
        AND evento.organizador_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- 3. RPC: fazer_checkin — atômica, evita corrida (dois toques
--    simultâneos não geram dupla entrada)
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
BEGIN
  -- Garante que o chamador é dono do evento
  IF NOT EXISTS (
    SELECT 1 FROM evento WHERE id = p_evento_id AND organizador_id = v_caller
  ) THEN
    RAISE EXCEPTION 'acesso_negado';
  END IF;

  -- Tentativa atômica: só atualiza se status = 'valido'
  UPDATE ingresso
  SET
    status         = 'usado',
    usado_em       = NOW(),
    usado_por      = p_usado_por,
    checkin_origem = p_origem
  WHERE codigo     = p_codigo
    AND evento_id  = p_evento_id
    AND status     = 'valido'
  RETURNING id, comprador_id, lote_id INTO v_ing;

  IF FOUND THEN
    SELECT nome INTO v_comp FROM comprador WHERE id = v_ing.comprador_id;
    SELECT nome INTO v_lote FROM lote      WHERE id = v_ing.lote_id;
    RETURN jsonb_build_object(
      'resultado', 'ok',
      'nome',      COALESCE(v_comp.nome, ''),
      'lote',      COALESCE(v_lote.nome, '')
    );
  END IF;

  -- Nenhuma linha atualizada — descobre o motivo
  SELECT id, status, usado_em, comprador_id, lote_id
  INTO v_ing
  FROM ingresso
  WHERE codigo = p_codigo AND evento_id = p_evento_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('resultado', 'nao_encontrado');
  END IF;

  IF v_ing.status = 'usado' THEN
    SELECT nome INTO v_comp FROM comprador WHERE id = v_ing.comprador_id;
    SELECT nome INTO v_lote FROM lote      WHERE id = v_ing.lote_id;
    RETURN jsonb_build_object(
      'resultado', 'ja_usado',
      'usado_em',  v_ing.usado_em,
      'nome',      COALESCE(v_comp.nome, ''),
      'lote',      COALESCE(v_lote.nome, '')
    );
  END IF;

  RETURN jsonb_build_object('resultado', 'invalido', 'status', v_ing.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;
