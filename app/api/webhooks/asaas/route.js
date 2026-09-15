/**
 * Webhook Asaas — Bloco 4.2 + 4.3
 * SERVER-ONLY. Recebe eventos de assinatura/pagamento e atualiza estado local.
 *
 * Autenticação: header `asaas-access-token` comparado com ASAAS_WEBHOOK_TOKEN
 *   (fallback: ASAAS_API_KEY). Configurar o token no painel Asaas sandbox ≥ 32 chars.
 *
 * Discriminação plano × ingresso:
 *   - payment.subscription != null → evento de PLANO (4.2)
 *   - payment.subscription == null → evento de INGRESSO (4.3)
 *
 * Idempotência:
 *   - PLANO:    ledger chave 'asaas-plano-{payment.id}'  (webhook_ativar_assinatura)
 *   - INGRESSO: ledger chave 'venda-{pedido.id}'        (confirmar_pedido_pago)
 *               FOR UPDATE no pedido evita race condition
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consultarAssinatura } from "@/lib/asaas";
import { emitirToken } from "@/lib/ingresso-token";
import { DIAS_GRACA } from "@/lib/config-planos";

function validarTokenAsaas(request) {
  const token = request.headers.get("asaas-access-token");
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN ?? process.env.ASAAS_API_KEY;
  return token && token === esperado;
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

  // ── Eventos de pagamento ────────────────────────────────────────────────────
  if (payment) {
    const isPlano = !!payment.subscription;

    // ── PLANO (4.2) ──────────────────────────────────────────────────────────
    if (isPlano) {
      const subId = payment.subscription;

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        let proximoVencimento = null;
        try {
          const sub = await consultarAssinatura(subId);
          if (sub?.nextDueDate) proximoVencimento = new Date(sub.nextDueDate).toISOString();
        } catch {}

        await supabase.rpc("webhook_ativar_assinatura", {
          p_subscription_id:    subId,
          p_payment_id:         payment.id,
          p_valor_cents:        Math.round((payment.value ?? 0) * 100),
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

    // ── INGRESSO (4.3) ───────────────────────────────────────────────────────
    if (!isPlano && payment.id) {
      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        // Buscar pedido para obter dados necessários ao token
        const { data: pedido } = await supabase
          .from("pedido")
          .select("id, lote_id, evento_id, comprador_id, status, lote:lote_id(nome), comprador:comprador_id(nome)")
          .eq("asaas_charge_id", payment.id)
          .maybeSingle();

        if (!pedido) {
          // Cobrança não vinculada a pedido conhecido — ignorar silenciosamente
          console.warn(`Webhook ingresso: pedido não encontrado para charge ${payment.id}`);
          return NextResponse.json({ ok: true, aviso: "pedido_nao_encontrado" });
        }

        if (pedido.status === "pago") {
          // Já processado — idempotência garantida pelo FOR UPDATE na RPC
          return NextResponse.json({ ok: true, status: "duplicado" });
        }

        // Gerar token do ingresso no servidor
        const codigo = crypto.randomUUID();
        let tokenAssinado;
        try {
          tokenAssinado = emitirToken({
            eventoId:         pedido.evento_id,
            codigo,
            loteNome:         pedido.lote?.nome ?? "",
            nomeParticipante: pedido.comprador?.nome ?? "",
          });
        } catch (err) {
          console.error("emitirToken:", err.message);
          return NextResponse.json({ erro: "Erro ao emitir token de ingresso" }, { status: 500 });
        }

        // RPC atômica: pedido→pago, lote.quantidade_vendida++, ingresso INSERT, ledger VENDA
        const { data: resultado, error: rpcErr } = await supabase.rpc("confirmar_pedido_pago", {
          p_asaas_charge_id: payment.id,
          p_codigo:          codigo,
          p_token_assinado:  tokenAssinado,
        });

        if (rpcErr) {
          console.error("confirmar_pedido_pago RPC:", rpcErr.message);
          return NextResponse.json({ erro: rpcErr.message }, { status: 500 });
        }

        const status = resultado?.status;
        if (status === "esgotado") {
          console.error(`Lote esgotado ao confirmar pedido ${pedido.id} — inconsistência de estoque`);
          return NextResponse.json({ ok: false, status: "esgotado" }, { status: 409 });
        }

        console.log(`Ingresso emitido: pedido ${pedido.id}, ingresso ${resultado?.ingresso_id}`);
      }

      if (event === "PAYMENT_REFUNDED") {
        // Reembolso iniciado via Asaas (fora do fluxo /api/checkout/reembolsar)
        // O handler do reembolso já faz a reversão; aqui só logamos.
        console.log(`Webhook PAYMENT_REFUNDED recebido para charge ${payment.id} — tratado no fluxo de reembolso`);
      }
    }
  }

  // ── Eventos de assinatura (plano) ───────────────────────────────────────────
  if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED") {
    const subId = subscription?.id ?? payment?.subscription;
    if (subId) {
      await supabase.rpc("webhook_cancelar_assinatura", { p_subscription_id: subId });
    }
  }

  return NextResponse.json({ ok: true });
}
