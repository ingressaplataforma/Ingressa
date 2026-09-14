import { createClient } from "./supabase/server";

/**
 * Retorna true se o organizador tem acesso ao plano pago.
 * Regras:
 *   ativa        → true
 *   em_graca     → true enquanto graca_ate não expirou
 *   cancelada    → true até proximo_vencimento (período já pago)
 *   inadimplente / pendente / sem assinatura → false
 */
export async function organizadorTemPlanoAtivo(organizadorId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assinatura")
    .select("status, proximo_vencimento, graca_ate")
    .eq("organizador_id", organizadorId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;

  if (data.status === "ativa") return true;

  if (data.status === "em_graca") {
    if (!data.graca_ate) return true;
    return new Date(data.graca_ate) > new Date();
  }

  if (data.status === "cancelada" && data.proximo_vencimento) {
    return new Date(data.proximo_vencimento) > new Date();
  }

  return false;
}
