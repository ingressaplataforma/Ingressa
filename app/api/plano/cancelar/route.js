import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelarAssinatura } from "@/lib/asaas";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: assinatura } = await supabase
    .from("assinatura")
    .select("id, asaas_subscription_id, status, proximo_vencimento")
    .eq("organizador_id", user.id)
    .not("status", "in", "(cancelada,inadimplente)")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assinatura) {
    return NextResponse.json({ erro: "Nenhuma assinatura cancelável encontrada." }, { status: 404 });
  }

  // Cancelar no Asaas (best-effort; o webhook SUBSCRIPTION_DELETED confirma depois)
  if (assinatura.asaas_subscription_id) {
    try {
      await cancelarAssinatura(assinatura.asaas_subscription_id);
    } catch (err) {
      console.error("cancelarAssinatura Asaas:", err.message);
    }
  }

  // Marcar como cancelada localmente.
  // proximo_vencimento fica preservado → organizadorTemPlanoAtivo() mantém
  // o acesso até o fim do período já pago.
  await supabase
    .from("assinatura")
    .update({ status: "cancelada", atualizado_em: new Date().toISOString() })
    .eq("id", assinatura.id);

  return NextResponse.json({ ok: true, acesso_ate: assinatura.proximo_vencimento });
}
