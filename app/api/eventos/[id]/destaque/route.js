import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// FUTURO: antes de gravar destaque=true, verificar se o organizador pagou pela feature.
// Por ora, destaque é gratuito e sem restrição financeira.

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { destaque } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: evento } = await supabase
    .from("evento")
    .select("id, status, visibilidade")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });

  if (evento.status !== "publicado" || evento.visibilidade !== "publico") {
    return NextResponse.json(
      { erro: "Apenas eventos publicados e públicos podem ser destacados." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("evento")
    .update({ destaque: !!destaque })
    .eq("id", id);

  if (error) {
    console.error("destaque update:", error);
    return NextResponse.json({ erro: "Erro ao atualizar destaque." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
