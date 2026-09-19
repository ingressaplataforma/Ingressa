import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += parseInt(d[i]) * (10 - i);
  let r1 = s1 % 11; if (r1 < 2) r1 = 0; else r1 = 11 - r1;
  if (r1 !== parseInt(d[9])) return false;
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += parseInt(d[i]) * (11 - i);
  let r2 = s2 % 11; if (r2 < 2) r2 = 0; else r2 = 11 - r2;
  return r2 === parseInt(d[10]);
}

export async function POST(request) {
  const { nome, cpf, telefone } = await request.json();

  if (!nome?.trim()) {
    return NextResponse.json({ erro: "Nome é obrigatório." }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: comprador } = await supabase
    .from("comprador")
    .select("cpf")
    .eq("id", user.id)
    .maybeSingle();

  if (!comprador) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const updates = {
    nome: nome.trim(),
    telefone: telefone || null,
  };

  // CPF só pode ser definido se ainda não está preenchido
  if (!comprador.cpf) {
    if (!cpf) return NextResponse.json({ erro: "CPF é obrigatório." }, { status: 422 });
    const cpfDigits = String(cpf).replace(/\D/g, "");
    if (!validarCPF(cpfDigits)) {
      return NextResponse.json({ erro: "CPF inválido." }, { status: 422 });
    }
    updates.cpf = cpfDigits;
  }

  const { error } = await supabase
    .from("comprador")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("conta/comprador update:", error);
    return NextResponse.json({ erro: "Erro ao salvar dados." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
