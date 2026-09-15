import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { gerarSlug } from "@/lib/slug";
import { organizadorTemPlanoAtivo } from "@/lib/planos";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: org } = await supabase.from("organizador").select("id").eq("id", user.id).maybeSingle();
  if (!org) return NextResponse.json({ erro: "Não é organizador" }, { status: 403 });

  // Limite de 3 eventos gratuitos — ignorado para organizadores com plano ativo
  const temPlano = await organizadorTemPlanoAtivo(user.id);
  if (!temPlano) {
    const { count: totalEventos } = await supabase
      .from("evento")
      .select("id", { count: "exact", head: true })
      .eq("organizador_id", user.id);

    if ((totalEventos ?? 0) >= 3) {
      return NextResponse.json(
        {
          erro: "Você atingiu o limite de 3 eventos gratuitos. Assine o plano para criar eventos ilimitados.",
          limite: true,
        },
        { status: 403 }
      );
    }
  }

  const { titulo, descricao, local_nome, cep, endereco, data_inicio, data_fim, visibilidade, senha, imagem_url, lotes, aceita_cartao, aceita_boleto, quem_paga_taxa } = await request.json();

  // Hash da senha APENAS no servidor — nunca exposta ao cliente
  let senha_hash = null;
  if (visibilidade === "privado" && senha) {
    senha_hash = await bcrypt.hash(senha, 12);
  }

  const { data: evento, error } = await supabase
    .from("evento")
    .insert({
      organizador_id: user.id,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      local_nome: local_nome?.trim() || null,
      cep: cep?.replace(/\D/g, "").slice(0, 8) || null,
      endereco: endereco?.trim() || null,
      data_inicio,
      data_fim: data_fim || null,
      slug: gerarSlug(titulo),
      visibilidade: visibilidade || "publico",
      senha_hash,
      imagem_url: imagem_url || null,
      aceita_cartao: aceita_cartao ?? true,
      aceita_boleto: aceita_boleto ?? false,
      quem_paga_taxa: quem_paga_taxa ?? "comprador",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Criar evento:", error);
    return NextResponse.json({ erro: "Erro ao criar evento" }, { status: 500 });
  }

  if (lotes?.length) {
    await supabase.from("lote").insert(
      lotes.map((l) => ({
        evento_id: evento.id,
        nome: l.nome.trim(),
        preco_cents: Math.round(parseFloat(String(l.preco).replace(",", ".") || "0") * 100),
        quantidade_total: parseInt(l.quantidade),
      }))
    );
  }

  return NextResponse.json({ evento_id: evento.id });
}
