import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estornarCobranca } from "@/lib/asaas";

/**
 * DELETE /api/eventos/[id]/participantes/[ingressoId]
 * Remove um participante do evento (organizador autenticado).
 *
 * - Ingresso gratuito (pedido_id NULL): cancela e devolve a vaga.
 * - Ingresso pago (pedido_id presente): estorna no Asaas e reverte
 *   o pedido (ledger + vaga), via organizador_reverter_pedido.
 *   Pedidos com quantidade > 1 ainda não são suportados individualmente.
 */
export async function DELETE(request, { params }) {
  const { id, ingressoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: evento } = await supabase
    .from("evento")
    .select("id")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();
  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });

  const { data: ingresso } = await supabase
    .from("ingresso")
    .select("id, status, pedido_id")
    .eq("id", ingressoId)
    .eq("evento_id", id)
    .maybeSingle();
  if (!ingresso) return NextResponse.json({ erro: "Participante não encontrado" }, { status: 404 });
  if (ingresso.status === "cancelado") {
    return NextResponse.json({ erro: "Participante já está cancelado" }, { status: 409 });
  }

  // Gratuito: só cancela e libera a vaga
  if (!ingresso.pedido_id) {
    const { data: resultado, error } = await supabase.rpc("organizador_cancelar_ingresso_gratuito", {
      p_ingresso_id: ingresso.id,
    });
    if (error) {
      console.error("organizador_cancelar_ingresso_gratuito:", error.message);
      return NextResponse.json({ erro: "Erro ao remover participante" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: resultado?.status, estornado: false });
  }

  // Pago: estorna no Asaas e reverte o pedido
  const { data: pedido } = await supabase
    .from("pedido")
    .select("id, status, asaas_charge_id, quantidade")
    .eq("id", ingresso.pedido_id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  if (pedido.quantidade > 1) {
    return NextResponse.json(
      { erro: "Este pedido tem mais de um ingresso — remoção individual ainda não é suportada." },
      { status: 400 }
    );
  }
  if (pedido.status !== "pago") {
    return NextResponse.json({ erro: "Pedido não está pago" }, { status: 400 });
  }

  try {
    await estornarCobranca(pedido.asaas_charge_id);
  } catch (err) {
    console.error("Asaas estornarCobranca:", err.message);
    return NextResponse.json({ erro: `Erro ao estornar no gateway: ${err.message}` }, { status: 502 });
  }

  const { data: resultado, error: rpcErr } = await supabase.rpc("organizador_reverter_pedido", {
    p_pedido_id: pedido.id,
  });
  if (rpcErr) {
    console.error("organizador_reverter_pedido:", rpcErr.message);
    // Estorno já feito no Asaas — estado inconsistente, precisa revisão manual
    return NextResponse.json(
      { erro: "Estorno feito no gateway mas erro ao atualizar o banco. Contate o suporte." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status: resultado?.status, estornado: true });
}