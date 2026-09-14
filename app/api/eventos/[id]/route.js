import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  // Verifica propriedade + estado editável
  const { data: evento } = await supabase
    .from("evento")
    .select("id, status, senha_hash")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) return NextResponse.json({ erro: "Evento não encontrado" }, { status: 404 });
  if (!["rascunho", "pausado"].includes(evento.status)) {
    return NextResponse.json({ erro: "Evento não está em modo editável." }, { status: 409 });
  }

  const { titulo, descricao, local_nome, cep, endereco, data_inicio, data_fim, visibilidade, senha, imagem_url, aceita_cartao, aceita_boleto, lotes_update, lotes_add, lotes_remove } = await request.json();

  // Atualiza campos do evento
  const upd = {};
  if (titulo != null) upd.titulo = titulo.trim();
  if (descricao != null) upd.descricao = descricao.trim() || null;
  if (local_nome != null) upd.local_nome = local_nome.trim() || null;
  if (cep != null) upd.cep = cep.replace(/\D/g, "").slice(0, 8) || null;
  if (endereco != null) upd.endereco = endereco.trim() || null;
  if (data_inicio) upd.data_inicio = data_inicio;
  if (data_fim !== undefined) upd.data_fim = data_fim || null;
  if (visibilidade) upd.visibilidade = visibilidade;
  if (imagem_url !== undefined) upd.imagem_url = imagem_url; // null limpa a imagem
  if (aceita_cartao !== undefined) upd.aceita_cartao = aceita_cartao;
  if (aceita_boleto !== undefined) upd.aceita_boleto = aceita_boleto;
  // BLOCO 4 (checkout): ler aceita_cartao e aceita_boleto deste evento antes de criar cobrança.
  // Usar lib/meios-pagamento.js → meioPagamentoPermitido(evento, meio) para validar no servidor.

  if (visibilidade === "privado" && senha) {
    upd.senha_hash = await bcrypt.hash(senha, 12);
  } else if (visibilidade && visibilidade !== "privado") {
    upd.senha_hash = null;
  }
  // Se privado mas sem nova senha: mantém senha_hash existente (não sobrescreve)

  if (Object.keys(upd).length > 0) {
    const { error } = await supabase.from("evento").update(upd).eq("id", id);
    if (error) return NextResponse.json({ erro: "Erro ao atualizar evento." }, { status: 500 });
  }

  // Atualiza lotes existentes
  if (lotes_update?.length) {
    for (const l of lotes_update) {
      const { data: loteAtual } = await supabase
        .from("lote")
        .select("quantidade_vendida")
        .eq("id", l.id)
        .eq("evento_id", id)
        .maybeSingle();
      if (!loteAtual) continue;

      const novaQtd = parseInt(l.quantidade);
      if (novaQtd < loteAtual.quantidade_vendida) {
        return NextResponse.json(
          { erro: `Lote "${l.nome}": quantidade mínima é ${loteAtual.quantidade_vendida} (já vendidos).` },
          { status: 422 }
        );
      }
      await supabase.from("lote").update({
        nome: l.nome.trim(),
        preco_cents: Math.round(parseFloat(String(l.preco).replace(",", ".") || "0") * 100),
        quantidade_total: novaQtd,
      }).eq("id", l.id).eq("evento_id", id);
    }
  }

  // Remove lotes (apenas se não há vendas)
  if (lotes_remove?.length) {
    for (const loteId of lotes_remove) {
      const { data: loteAtual } = await supabase
        .from("lote")
        .select("quantidade_vendida, nome")
        .eq("id", loteId)
        .eq("evento_id", id)
        .maybeSingle();
      if (!loteAtual) continue;
      if (loteAtual.quantidade_vendida > 0) {
        return NextResponse.json(
          { erro: `Lote "${loteAtual.nome}" tem ${loteAtual.quantidade_vendida} ingressos vendidos e não pode ser removido.` },
          { status: 422 }
        );
      }
      await supabase.from("lote").delete().eq("id", loteId).eq("evento_id", id);
    }
  }

  // Adiciona novos lotes
  if (lotes_add?.length) {
    const { error } = await supabase.from("lote").insert(
      lotes_add.map((l) => ({
        evento_id: id,
        nome: l.nome.trim(),
        preco_cents: Math.round(parseFloat(String(l.preco).replace(",", ".") || "0") * 100),
        quantidade_total: parseInt(l.quantidade),
      }))
    );
    if (error) return NextResponse.json({ erro: "Erro ao adicionar lotes." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
