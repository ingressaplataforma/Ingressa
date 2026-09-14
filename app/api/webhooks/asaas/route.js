/**
 * Webhook Asaas — Bloco 4.2
 * SERVER-ONLY. Recebe eventos de assinatura/pagamento do Asaas e atualiza
 * o estado local.
 *
 * Autenticação: o Asaas envia o header `asaas-access-token` com a API key
 * da conta. Validamos contra ASAAS_API_KEY (nunca exposta ao cliente).
 *
 * Idempotência:
 *   - PAYMENT_RECEIVED/CONFIRMED → via chave no ledger ('asaas-plano-{payment_id}')
 *   - Status updates → UPDATE idempotente (re-entrante sem efeito colateral)
 *
 * Configurar no painel Asaas Sandbox:
 *   URL: https://<dominio>/api/webhooks/asaas
 *   Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE,
 *            SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consultarAssinatura } from "@/lib/asaas";
import { DIAS_GRACA } from "@/lib/config-planos";

function validarTokenAsaas(request) {
  const token = request.headers.get("asaas-access-token");
  return token && token === process.env.ASAAS_API_KEY;
}

export async function POST(request) {
  if (!validarTokenAsaas(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.event) {
    return NextResponse.json({ erro: "Payload inválido" }, { status: 400 });
  }

  const { event, payment, subscription } = body;
  const supabase = await createClient();

  // ── Eventos de pagamento ────────────────────────────────────
  if (payment?.subscription) {
    const subId = payment.subscription;

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Busca nextDueDate atualizado no Asaas
      let proximoVencimento = null;
      try {
        const sub = await consultarAssinatura(subId);
        if (sub?.nextDueDate) {
          proximoVencimento = new Date(sub.nextDueDate).toISOString();
        }
      } catch {}

      const valorCents = Math.round((payment.value ?? 0) * 100);

      await supabase.rpc("webhook_ativar_assinatura", {
        p_subscription_id:    subId,
        p_payment_id:         payment.id,
        p_valor_cents:        valorCents,
        p_proximo_vencimento: proximoVencimento,
      });
    }

    if (event === "PAYMENT_OVERDUE") {
      const gracaAte = new Date();
      gracaAte.setDate(gracaAte.getDate() + DIAS_GRACA);

      await supabase.rpc("webhook_overdue_assinatura", {
        p_subscription_id: subId,
        p_graca_ate:       gracaAte.toISOString(),
      });
    }
  }

  // ── Eventos de assinatura ───────────────────────────────────
  if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED") {
    const subId = subscription?.id ?? payment?.subscription;
    if (subId) {
      await supabase.rpc("webhook_cancelar_assinatura", {
        p_subscription_id: subId,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
