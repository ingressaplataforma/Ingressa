import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  criarAssinatura,
  buscarOuCriarCliente,
  buscarPrimeiroPagamento,
} from "@/lib/asaas";
import { DESCRICAO_PLANO_ASAAS } from "@/lib/config-planos";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: org } = await supabase
    .from("organizador")
    .select("id, nome, documento, telefone, gateway_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!org) return NextResponse.json({ erro: "Não é organizador" }, { status: 403 });

  // Bloquear dupla assinatura ativa ou pendente
  const { data: existente } = await supabase
    .from("assinatura")
    .select("id, status")
    .eq("organizador_id", user.id)
    .in("status", ["ativa", "em_graca", "pendente"])
    .maybeSingle();
  if (existente) {
    return NextResponse.json(
      { erro: "Já existe uma assinatura ativa ou pendente." },
      { status: 409 }
    );
  }

  // Descobrir o plano (aceita plano_id no body; senão usa o primeiro ativo)
  const body = await request.json().catch(() => ({}));
  let plano = null;

  if (body.plano_id) {
    const { data } = await supabase
      .from("plano")
      .select("id, preco_cents, nome")
      .eq("id", body.plano_id)
      .eq("ativo", true)
      .maybeSingle();
    plano = data;
  }

  if (!plano) {
    const { data } = await supabase
      .from("plano")
      .select("id, preco_cents, nome")
      .eq("ativo", true)
      .order("criado_em")
      .limit(1)
      .maybeSingle();
    plano = data;
  }

  if (!plano) return NextResponse.json({ erro: "Nenhum plano disponível." }, { status: 404 });

  // Buscar ou criar cliente no Asaas
  let customerId = org.gateway_customer_id;
  if (!customerId) {
    const cliente = await buscarOuCriarCliente({
      name:      org.nome,
      email:     user.email,
      cpfCnpj:  org.documento?.replace(/\D/g, "") || undefined,
      phone:     org.telefone || undefined,
    });
    customerId = cliente.id;
    await supabase
      .from("organizador")
      .update({ gateway_customer_id: customerId })
      .eq("id", user.id);
  }

  // Criar assinatura no Asaas (primeiro vencimento = hoje)
  const hoje = new Date();
  const nextDueDate = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");

  const assinaturaAsaas = await criarAssinatura({
    customerId,
    valor:             plano.preco_cents / 100,
    nextDueDate,
    descricao:         DESCRICAO_PLANO_ASAAS,
    externalReference: `plano-${user.id}-${Date.now()}`,
  });

  // Buscar URL de pagamento do primeiro mês
  let invoiceUrl = null;
  try {
    const primeiroPagamento = await buscarPrimeiroPagamento(assinaturaAsaas.id);
    invoiceUrl = primeiroPagamento?.invoiceUrl ?? null;
  } catch {}

  // Registrar assinatura no banco
  const { data: assinatura, error } = await supabase
    .from("assinatura")
    .insert({
      organizador_id:        user.id,
      plano_id:              plano.id,
      asaas_subscription_id: assinaturaAsaas.id,
      asaas_customer_id:     customerId,
      status:                "pendente",
      url_pagamento:         invoiceUrl,
      inicio:                new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("assinar plano:", error);
    return NextResponse.json({ erro: "Erro ao registrar assinatura." }, { status: 500 });
  }

  return NextResponse.json({
    assinatura_id:   assinatura.id,
    invoice_url:     invoiceUrl,
    subscription_id: assinaturaAsaas.id,
  });
}
