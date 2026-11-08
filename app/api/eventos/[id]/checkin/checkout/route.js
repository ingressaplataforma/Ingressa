import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/eventos/[id]/checkin/checkout
 * Body: { codigo }
 * Marca saída do participante (presente=false) e grava no histórico
 * checkin_log. Ingresso continua com status='usado' — fica livre pra
 * reentrar (fazer_checkin de novo).
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { codigo } = await request.json().catch(() => ({}));
  if (!codigo) return NextResponse.json({ erro: "codigo obrigatório" }, { status: 400 });

  const { data, error } = await supabase.rpc("fazer_checkout", {
    p_codigo: codigo,
    p_evento_id: id,
    p_usado_por: user.id,
    p_origem: "online",
  });

  if (error) {
    if (error.message?.includes("acesso_negado")) {
      return NextResponse.json({ erro: "Sem permissão para este evento" }, { status: 403 });
    }
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }

  if (data?.resultado !== "ok") {
    return NextResponse.json({ erro: "Participante não está marcado como presente" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}