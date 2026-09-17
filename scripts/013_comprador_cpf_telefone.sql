-- ============================================================
-- 013_comprador_cpf_telefone.sql
-- Adiciona CPF, telefone e e-mail na tabela comprador.
-- Rodar no Supabase SQL Editor (não executa automaticamente).
-- ============================================================

-- 1. Novos campos
ALTER TABLE public.comprador
  ADD COLUMN IF NOT EXISTS cpf      TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email    TEXT;

-- 2. Índice único parcial para CPF (NULL não é duplicado — OK ter vários sem CPF ainda)
CREATE UNIQUE INDEX IF NOT EXISTS comprador_cpf_unique
  ON public.comprador (cpf)
  WHERE cpf IS NOT NULL;

-- 3. Função de validação de CPF (dígitos verificadores)
CREATE OR REPLACE FUNCTION public.cpf_valido(p_cpf TEXT) RETURNS BOOLEAN AS $$
DECLARE
  d    TEXT;
  s1   INT := 0;
  s2   INT := 0;
  i    INT;
  r1   INT;
  r2   INT;
BEGIN
  d := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  IF length(d) <> 11 THEN RETURN FALSE; END IF;
  -- Rejeita sequências como 00000000000, 11111111111, …
  IF d ~ '^(\d)\1{10}$' THEN RETURN FALSE; END IF;

  FOR i IN 1..9 LOOP
    s1 := s1 + substring(d, i, 1)::INT * (11 - i);
  END LOOP;
  r1 := s1 % 11;
  IF r1 < 2 THEN r1 := 0; ELSE r1 := 11 - r1; END IF;
  IF r1 <> substring(d, 10, 1)::INT THEN RETURN FALSE; END IF;

  FOR i IN 1..10 LOOP
    s2 := s2 + substring(d, i, 1)::INT * (12 - i);
  END LOOP;
  r2 := s2 % 11;
  IF r2 < 2 THEN r2 := 0; ELSE r2 := 11 - r2; END IF;
  RETURN r2 = substring(d, 11, 1)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Restrição de integridade: aceita NULL (campo opcional para registros antigos)
--    mas se informado, deve ser CPF válido.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comprador_cpf_valido' AND conrelid = 'public.comprador'::regclass
  ) THEN
    ALTER TABLE public.comprador
      ADD CONSTRAINT comprador_cpf_valido CHECK (cpf IS NULL OR public.cpf_valido(cpf));
  END IF;
END$$;

-- ============================================================
-- Verificação
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'comprador'
ORDER BY ordinal_position;
