/**
 * POST /api/checkout/reembolsar
 * Body: { pedido_charge_id }  (Asaas charge id do pedido)
 *
 * Reembolso dentro do prazo CDC (art. 49, 7 dias a partir da compra).
 *
 * Risco documentado: o split Pix repassa o dinheiro ao organizador no dia útil
 * seguinte. Se o reembolso ocorrer após esse repasse, a plataforma antecipa o
 * dinheiro ao comprador e recupera do organizador fora do sistema.
 * A reserva de 15% (RESERVA_PCT) é a proteção contábil para esse cenário.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estornarCobranca } from "@/lib/asaas";
import { CDC_PRAZO_DIAS } from "@/lib/config-repasse";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { pedido_charge_id } = await request.json();
  if (!pedido_charge_id) return NextResponse.json({ erro: "pedido_charge_id obrigatório" }, { status: 400 });

  // Buscar pedido do comprador autenticado
  const { data: pedido } = await supabase
    .from("pedido")
    .select("id, status, pago_em, total_cents, asaas_charge_id")
    .eq("asaas_charge_id", pedido_charge_id)
    .eq("comprador_id", user.id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  if (pedido.status !== "pago") return NextResponse.json({ erro: "Pedido não elegível para reembolso" }, { status: 400 });
  if (pedido.status === "reembolsado") return NextResponse.json({ erro: "Pedido já reembolsado" }, { status: 409 });

  // Verificar prazo CDC
  const prazoExpira = new Date(pedido.pago_em);
  prazoExpira.setDate(prazoExpira.getDate() + CDC_PRAZO_DIAS);
  if (new Date() > prazoExpira) {
    return NextResponse.json(
      { erro: `Prazo de reembolso de ${CDC_PRAZO_DIAS} dias (CDC art. 49) já expirou.` },
      { status: 400 }
    );
  }

  // Estornar no Asaas (reverte o split automaticamente)
  try {
    await estornarCobranca(pedido.asaas_charge_id);
  } catch (err) {
    console.error("Asaas estornarCobranca:", err.message);
    return NextResponse.json({ erro: `Erro ao estornar no gateway: ${err.message}` }, { status: 502 });
  }

  // RPC atômica: ingresso→cancelado, lote.quantidade_vendida--, pedido→reembolsado, ledger REEMBOLSO
  const { data: resultado, error: rpcErr } = await supabase.rpc("reverter_pedido_pago", {
    p_pedido_id: pedido.id,
  });

  if (rpcErr) {
    console.error("reverter_pedido_pago:", rpcErr.message);
    // Estorno no Asaas já feito — estado inconsistente; logar para revisão manual
    return NextResponse.json({ erro: "Estorno realizado no gateway mas erro ao atualizar banco. Contate o suporte." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: resultado?.status,
    valor_reembolsado_cents: pedido.total_cents,
  });
}
