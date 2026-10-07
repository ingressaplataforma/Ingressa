-- =============================================================
-- Ingressa — Script 018: perfil público do organizador
--
-- RODAR NO SUPABASE SQL EDITOR (não pelo app).
-- Pré-requisito: scripts 001–017 já aplicados.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Novos campos opcionais no organizador
--    (whatsapp, email_contato, bio, foto_url)
-- -----------------------------------------------------------
ALTER TABLE public.organizador
  ADD COLUMN IF NOT EXISTS whatsapp       text    NULL,  -- só dígitos com DDI/DDD: 5511999999999
  ADD COLUMN IF NOT EXISTS email_contato  text    NULL,  -- e-mail público de contato (opt-in)
  ADD COLUMN IF NOT EXISTS bio            text    NULL,  -- descrição curta pública
  ADD COLUMN IF NOT EXISTS foto_url       text    NULL;  -- URL da logo/foto de perfil

-- -----------------------------------------------------------
-- 2. Remover policy ampla caso já tenha sido criada
--    (evita exposição de documento/telefone para anon)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "organizador_select_publico" ON public.organizador;

-- -----------------------------------------------------------
-- 3. View pública com apenas colunas seguras
--    security_invoker = false → roda como dono da view
--    (postgres), ignorando a RLS restrita da tabela base.
--    Assim anon/authenticated leem só estas colunas.
-- -----------------------------------------------------------
DROP VIEW IF EXISTS public.organizador_publico;

CREATE VIEW public.organizador_publico
  WITH (security_invoker = false)
AS
SELECT
  id,
  nome,
  bio,
  foto_url,
  whatsapp,
  email_contato
FROM public.organizador;

-- -----------------------------------------------------------
-- 4. Conceder SELECT na view para visitantes anônimos
-- -----------------------------------------------------------
GRANT SELECT ON public.organizador_publico TO anon, authenticated;

-- -----------------------------------------------------------
-- Verificação após rodar:
--
-- 1. Policies da tabela (não deve haver USING (true)):
--    SELECT policyname, qual FROM pg_policies WHERE tablename = 'organizador';
--
-- 2. Teste anon — deve retornar vazio/erro (coluna protegida):
--    SET ROLE anon; SELECT documento FROM organizador; RESET ROLE;
--
-- 3. Teste via view — deve funcionar:
--    SET ROLE anon; SELECT * FROM organizador_publico; RESET ROLE;
-- -----------------------------------------------------------
