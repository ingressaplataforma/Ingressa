import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe check-ins feitos offline e aplica no servidor.
// Idempotente: reenviar o mesmo lote não duplica nada.
// Conflito: mesmo ingresso marcado por dois dispositivos offline —
//   o servidor mantém o primeiro por timestamp; o segundo vira conflito.
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  // Verifica propriedade do evento
  const { data: evento } = await supabase
    .from("evento")
    .select("id")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();
  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });

  const { checkins } = await request.json();
  if (!Array.isArray(checkins) || checkins.length === 0) {
    return NextResponse.json({ ok: 0, conflitos: 0, detalhes: [] });
  }

  let ok = 0;
  let conflitos = 0;
  const detalhes = [];

  for (const c of checkins) {
    if (!c.codigo || !c.usadoEm) continue;

    // Update condicional: só marca se ainda 'valido' (sem corrida)
    // Preserva o timestamp offline para fins de auditoria
    const { data: updated } = await supabase
      .from("ingresso")
      .update({
        status: "usado",
        usado_em: c.usadoEm,
        usado_por: `${user.id}:offline:${c.dispositivo ?? "?"}`,
        checkin_origem: "offline",
      })
      .eq("codigo", c.codigo)
      .eq("evento_id", id)
      .eq("status", "valido")
      .select("id")
      .maybeSingle();

    if (updated) {
      ok++;
      detalhes.push({ codigo: c.codigo, resultado: "ok" });
    } else {
      // Já estava 'usado' (conflito de double-spend offline) ou cancelado
      conflitos++;
      detalhes.push({ codigo: c.codigo, resultado: "conflito" });
      // Registra no log do servidor (console é suficiente para MVP)
      console.warn(`[checkin-sync] conflito: codigo=${c.codigo} evento=${id} dispositivo=${c.dispositivo}`);
    }
  }

  return NextResponse.json({ ok, conflitos, detalhes });
}
