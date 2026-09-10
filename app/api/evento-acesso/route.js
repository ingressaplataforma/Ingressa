import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

function computeAccessToken(slug, senhaHash) {
  const secret = process.env.INGRESSO_TOKEN_SECRET || "fallback-dev";
  return crypto.createHmac("sha256", secret).update(`ea:${slug}:${senhaHash}`).digest("hex").slice(0, 40);
}

export async function POST(request) {
  const { slug, senha } = await request.json();
  if (!slug || !senha) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const supabase = await createClient();

  // Busca senha_hash no servidor — nunca vai ao cliente
  const { data: evento } = await supabase
    .from("evento")
    .select("id, visibilidade, senha_hash")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();

  if (!evento || evento.visibilidade !== "privado") {
    return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });
  }
  if (!evento.senha_hash) {
    return NextResponse.json({ erro: "Evento sem senha configurada" }, { status: 400 });
  }

  const correto = await bcrypt.compare(senha, evento.senha_hash);
  if (!correto) {
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  }

  const token = computeAccessToken(slug, evento.senha_hash);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(`ea_${slug}`, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  });
  return response;
}
