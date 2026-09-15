import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buscarOuCriarCliente,
  criarCobranca,
  buscarPixQrCode,
} from "@/lib/asaas";
import { meioPagamentoPermitido } from "@/lib/meios-pagamento";
import { montarValoresPedido } from "@/lib/taxa";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { lote_id, meio } = await request.json();
  if (!lote_id || !meio) return NextResponse.json({ erro: "lote_id e meio são obrigatórios" }, { status: 400 });

  // Comprador
  const { data: comprador } = await supabase
    .from("comprador")
    .select("id, nome")
    .eq("id", user.id)
    .maybeSingle();
  if (!comprador) return NextResponse.json({ erro: "Perfil de comprador não encontrado" }, { status: 403 });

  // Lote + evento + organizador
  const { data: lote } = await supabase
    .from("lote")
    .select(`
      id, nome, preco_cents, quantidade_total, quantidade_vendida,
      evento:evento_id(
        id, titulo, status, data_inicio, organizador_id,
        aceita_cartao, aceita_boleto, quem_paga_taxa,
        organizador:organizador_id(id, nome, gateway_recipient_id)
      )
    `)
    .eq("id", lote_id)
    .maybeSingle();

  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.evento.status !== "publicado") return NextResponse.json({ erro: "Evento não disponível" }, { status: 400 });
  if (lote.preco_cents <= 0) return NextResponse.json({ erro: "Use /api/inscrever para ingressos gratuitos" }, { status: 400 });
  if (lote.quantidade_vendida >= lote.quantidade_total) return NextResponse.json({ erro: "Lote esgotado" }, { status: 409 });

  // Validar meio de pagamento
  if (!meioPagamentoPermitido(lote.evento, meio)) {
    return NextResponse.json({ erro: "Meio de pagamento não aceito neste evento." }, { status: 422 });
  }

  const org = lote.evento.organizador;
  if (!org?.gateway_recipient_id) {
    return NextResponse.json({ erro: "Organizador não configurou o recebimento. Contate o organizador." }, { status: 422 });
  }

  // Calcular valores
  const { taxaCents, orgRecebeCents, totalCents } = montarValoresPedido({
    precoCents: lote.preco_cents,
    meio,
    quemPagaTaxa: lote.evento.quem_paga_taxa ?? "comprador",
  });

  // Cliente Asaas do comprador
  let asaasCustomer;
  try {
    asaasCustomer = await buscarOuCriarCliente({
      name: comprador.nome,
      email: user.email,
    });
  } catch (err) {
    console.error("Asaas cliente:", err.message);
    return NextResponse.json({ erro: "Erro ao registrar comprador no gateway de pagamento." }, { status: 502 });
  }

  // Data de vencimento = hoje
  const hoje = new Date();
  const dueDate = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  // billingType: PIX para pix, UNDEFINED para boleto/cartão (Asaas hospeda a escolha)
  const billingType = meio === "pix" ? "PIX" : "UNDEFINED";

  // Criar cobrança no Asaas com split nativo
  let charge;
  try {
    charge = await criarCobranca({
      customerId: asaasCustomer.id,
      billingType,
      valorTotal: totalCents / 100,
      dueDate,
      descricao: `${lote.nome} — ${lote.evento.titulo}`,
      externalReference: `ingresso-${lote_id}-${user.id}`,
      walletIdOrganizador: org.gateway_recipient_id,
      valorOrganizador: orgRecebeCents / 100,
    });
  } catch (err) {
    console.error("Asaas criarCobranca:", err.message);
    return NextResponse.json({ erro: `Erro ao criar cobrança: ${err.message}` }, { status: 502 });
  }

  // Inserir pedido no banco
  const chave = charge.id; // Asaas charge id é único — serve como chave de idempotência
  const { error: dbErr } = await supabase.from("pedido").insert({
    comprador_id: comprador.id,
    organizador_id: org.id,
    evento_id: lote.evento.id,
    lote_id: lote.id,
    quantidade: 1,
    preco_unitario_cents: lote.preco_cents,
    taxa_cents: taxaCents,
    org_recebe_cents: orgRecebeCents,
    total_cents: totalCents,
    quem_paga_taxa: lote.evento.quem_paga_taxa ?? "comprador",
    meio,
    asaas_charge_id: charge.id,
    asaas_invoice_url: charge.invoiceUrl ?? null,
    chave_idempotencia: chave,
  });

  if (dbErr) {
    console.error("Inserir pedido:", dbErr.message);
    // Cobrança foi criada no Asaas mas pedido não salvo — logar para revisão manual
    return NextResponse.json({ erro: "Erro ao registrar pedido. Contate o suporte." }, { status: 500 });
  }

  // Para PIX: buscar copia-e-cola
  if (meio === "pix") {
    const qr = await buscarPixQrCode(charge.id);
    const pixPayload = qr?.payload ?? null;

    // Salvar payload no pedido para referência
    if (pixPayload) {
      await supabase.from("pedido").update({ pix_copia_cola: pixPayload }).eq("asaas_charge_id", charge.id);
    }

    return NextResponse.json({
      pedido_charge_id: charge.id,
      meio: "pix",
      pix_payload: pixPayload,
      invoice_url: charge.invoiceUrl,
    });
  }

  // Boleto / cartão: redirecionar para página Asaas
  return NextResponse.json({
    pedido_charge_id: charge.id,
    meio,
    invoice_url: charge.invoiceUrl,
  });
}
