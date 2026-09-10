import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitirToken } from "@/lib/ingresso-token";

export async function POST(request) {
  const { lote_id } = await request.json();
  if (!lote_id) return NextResponse.json({ erro: "lote_id obrigatório" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  // Perfil de comprador obrigatório
  const { data: comprador } = await supabase
    .from("comprador")
    .select("id, nome")
    .eq("id", user.id)
    .maybeSingle();

  if (!comprador) return NextResponse.json({ erro: "Perfil de comprador não encontrado" }, { status: 403 });

  // Lote + evento
  const { data: lote } = await supabase
    .from("lote")
    .select("id, nome, evento_id, evento:evento_id(id, titulo, status)")
    .eq("id", lote_id)
    .maybeSingle();

  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.evento.status !== "publicado") return NextResponse.json({ erro: "Evento não disponível" }, { status: 400 });

  // Gerar token no servidor (chave nunca vai ao cliente)
  const codigo = crypto.randomUUID();
  let token;
  try {
    token = emitirToken({
      eventoId: lote.evento_id,
      codigo,
      loteNome: lote.nome,
      nomeParticipante: comprador.nome,
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao gerar ingresso" }, { status: 500 });
  }

  // Inscrição atômica via RPC (reserva + insert + incremento)
  const { data: ingressoId, error: rpcError } = await supabase.rpc("inscrever_em_lote", {
    p_lote_id: lote_id,
    p_comprador_id: comprador.id,
    p_codigo: codigo,
    p_token_assinado: token,
  });

  if (rpcError) {
    if (rpcError.message?.includes("lote_esgotado")) {
      return NextResponse.json({ erro: "Lote esgotado" }, { status: 409 });
    }
    console.error("RPC error:", rpcError);
    return NextResponse.json({ erro: "Erro ao registrar inscrição" }, { status: 500 });
  }

  return NextResponse.json({ ingresso_id: ingressoId, codigo, token });
}
