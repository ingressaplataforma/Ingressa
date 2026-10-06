import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proteção: só o e-mail definido em ADMIN_EMAIL (env var server-only) pode chamar esta rota.
function isAdmin(user) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail && user.email === adminEmail;
}

// PATCH /api/admin/eventos/[id]/destaque
// Body: { destaque_admin: true | false | null, destaque_ordem?: number | null }
export async function PATCH(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  if ("destaque_admin" in body) {
    // Aceita: true, false, ou null (volta ao controle do organizador)
    const v = body.destaque_admin;
    if (v !== true && v !== false && v !== null) {
      return NextResponse.json({ erro: "destaque_admin deve ser true, false ou null" }, { status: 400 });
    }
    updates.destaque_admin = v;
  }
  if ("destaque_ordem" in body) {
    const v = body.destaque_ordem;
    updates.destaque_ordem = v === null ? null : Number(v);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { error } = await supabase.from("evento").update(updates).eq("id", id);
  if (error) {
    console.error("admin destaque update:", error);
    return NextResponse.json({ erro: "Erro ao atualizar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
