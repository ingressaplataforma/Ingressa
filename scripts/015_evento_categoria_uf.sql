-- Adiciona colunas `categoria` e `uf` ao evento.
-- Rodar no Supabase SQL Editor. Eventos existentes ficam com 'outro'/NULL.

ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS uf        TEXT;

-- CHECK constraint: só aceita os valores da lista controlada (ou NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evento_categoria_valida'
      AND conrelid = 'public.evento'::regclass
  ) THEN
    ALTER TABLE public.evento ADD CONSTRAINT evento_categoria_valida CHECK (
      categoria IS NULL OR categoria IN (
        'show_musica', 'curso_workshop', 'congresso_palestra', 'festa_celebracao',
        'esporte', 'religioso_espiritual', 'teatro_cultura', 'corporativo', 'outro'
      )
    );
  END IF;
END$$;

-- Índice para filtrar por UF e categoria de forma eficiente.
CREATE INDEX IF NOT EXISTS evento_uf_idx       ON public.evento (uf)       WHERE uf IS NOT NULL;
CREATE INDEX IF NOT EXISTS evento_categoria_idx ON public.evento (categoria) WHERE categoria IS NOT NULL;
