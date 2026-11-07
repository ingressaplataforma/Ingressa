import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client server-only com a service_role key — ignora RLS e roda como
 * role `service_role` no Postgres (não `anon`/`authenticated`).
 *
 * USAR SÓ em rotas que já têm seu próprio mecanismo de autenticação/
 * autorização (ex.: webhook validado por token de assinatura, cron job
 * interno). NUNCA importar em código client-side nem em rotas que
 * dependem de RLS pra isolar dados de usuário.
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente (nunca NEXT_PUBLIC_*).
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}