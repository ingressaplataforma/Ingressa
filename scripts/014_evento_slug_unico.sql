-- Garante unicidade global do slug no banco (reforça a lógica da aplicação).
-- Rodar no Supabase SQL Editor ANTES de criar eventos novos.
-- Eventos existentes mantêm seus slugs; falha se já houver slugs duplicados no banco.

CREATE UNIQUE INDEX IF NOT EXISTS evento_slug_unico
  ON public.evento (slug);
