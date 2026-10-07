import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const { nome, bio, whatsapp, email_contato, foto_url } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ erro: "Nome é obrigatório." }, { status: 400 });
  }

  // Validação básica do WhatsApp: só dígitos, 10–15 caracteres
  if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
    return NextResponse.json({ erro: "WhatsApp inválido. Use só dígitos com DDI e DDD (ex.: 5511999999999)." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizador")
    .update({ nome: nome.trim(), bio: bio ?? null, whatsapp: whatsapp ?? null, email_contato: email_contato ?? null, foto_url: foto_url ?? null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
