import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveEventKeyHex } from "@/lib/ingresso-token";

// Entrega a chave derivada do evento + lista de ingressos para o modo offline.
// NUNCA entrega a chave mestra — apenas a chave derivada por evento.
export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  // Verifica que o usuário é dono do evento
  const { data: evento } = await supabase
    .from("evento")
    .select("id, titulo, status")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });

  // Busca ingressos com nome, email e lote (para cache offline e busca manual)
  const { data: ingressos } = await supabase
    .from("ingresso")
    .select("codigo, status, usado_em, lote:lote_id(nome), comprador:comprador_id(nome, email)")
    .eq("evento_id", id)
    .order("criado_em", { ascending: true });

  const lista = (ingressos ?? []).map((ing) => ({
    codigo: ing.codigo,
    nome: ing.comprador?.nome ?? "",
    email: ing.comprador?.email ?? "",
    lote: ing.lote?.nome ?? "",
    status: ing.status,
    usado_em: ing.usado_em ?? null,
  }));

  const total = lista.length;
  const presentes = lista.filter((i) => i.status === "usado").length;

  // Chave derivada por evento — nunca expõe a chave mestra
  const chaveEvento = deriveEventKeyHex(id);

  return NextResponse.json({
    eventoId: id,
    eventoTitulo: evento.titulo,
    chaveEvento,
    ingressos: lista,
    total,
    presentes,
  });
}
