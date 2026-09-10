import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { organizadorTemPlanoAtivo } from "@/lib/planos";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const forcarGratuito = body.forcar_gratuito === true;

  const { data: evento } = await supabase
    .from("evento")
    .select("id, status")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });
  if (!["rascunho", "pausado"].includes(evento.status)) {
    return NextResponse.json({ erro: "Evento já está publicado ou encerrado." }, { status: 409 });
  }

  const { data: lotes } = await supabase
    .from("lote")
    .select("id, preco_cents")
    .eq("evento_id", id);

  const temLotePago = (lotes ?? []).some((l) => l.preco_cents > 0);

  if (temLotePago && !forcarGratuito) {
    const temPlano = await organizadorTemPlanoAtivo(user.id);
    if (!temPlano) {
      return NextResponse.json(
        {
          erro: "Eventos com ingresso pago exigem um plano ativo. Planos chegam em breve!",
          pago: true,
        },
        { status: 403 }
      );
    }
  }

  if (forcarGratuito && temLotePago) {
    const idsPagos = (lotes ?? []).filter((l) => l.preco_cents > 0).map((l) => l.id);
    const { error: errZero } = await supabase
      .from("lote")
      .update({ preco_cents: 0 })
      .in("id", idsPagos);
    if (errZero) return NextResponse.json({ erro: "Erro ao zerar preços dos lotes." }, { status: 500 });
  }

  const { error } = await supabase
    .from("evento")
    .update({ status: "publicado" })
    .eq("id", id);

  if (error) return NextResponse.json({ erro: "Erro ao publicar evento." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
