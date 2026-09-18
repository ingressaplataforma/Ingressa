import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FluxoInscricao from "./FluxoInscricao";
import CheckoutPago from "./CheckoutPago";

export default async function InscricaoPage({ params }) {
  const { slug, lote_id } = await params;
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lote")
    .select(`
      id, nome, preco_cents, quantidade_total, quantidade_vendida,
      evento:evento_id(
        id, titulo, slug, status, data_inicio, local_nome,
        aceita_cartao, aceita_boleto, quem_paga_taxa,
        organizador_id,
        organizador:organizador_id(gateway_recipient_id)
      )
    `)
    .eq("id", lote_id)
    .maybeSingle();

  if (!lote || lote.evento.status !== "publicado" || lote.evento.slug !== slug) notFound();

  const esgotado = lote.quantidade_vendida >= lote.quantidade_total;

  const { data: { user } } = await supabase.auth.getUser();
  let temComprador = false;
  let compradorDados = null;
  if (user) {
    const { data: comp } = await supabase
      .from("comprador")
      .select("id, nome, cpf, telefone")
      .eq("id", user.id)
      .maybeSingle();
    temComprador = !!comp;
    if (comp) {
      // Comprador sem CPF → completar cadastro antes de prosseguir
      if (!comp.cpf) {
        redirect(`/completar-cadastro?from=/e/${slug}/inscrever/${lote_id}`);
      }
      compradorDados = {
        nome: comp.nome || "",
        cpf: comp.cpf || "",
        email: user.email || "",
        telefone: comp.telefone || "",
      };
    }
  }

  const disponivel = lote.quantidade_total - lote.quantidade_vendida;

  // Gratuito → fluxo de inscrição imediata existente
  if (lote.preco_cents === 0) {
    return (
      <FluxoInscricao
        loteId={lote_id}
        loteNome={lote.nome}
        precoCents={lote.preco_cents}
        eventoId={lote.evento.id}
        eventoTitulo={lote.evento.titulo}
        eventoSlug={slug}
        dataInicio={lote.evento.data_inicio}
        localNome={lote.evento.local_nome}
        esgotado={esgotado}
        temComprador={temComprador}
        compradorDados={compradorDados}
        disponivel={disponivel}
      />
    );
  }

  // Pago → checkout com split
  return (
    <CheckoutPago
      loteId={lote_id}
      loteNome={lote.nome}
      precoCents={lote.preco_cents}
      eventoId={lote.evento.id}
      eventoTitulo={lote.evento.titulo}
      eventoSlug={slug}
      dataInicio={lote.evento.data_inicio}
      localNome={lote.evento.local_nome}
      esgotado={esgotado}
      temComprador={temComprador}
      aceitaCartao={lote.evento.aceita_cartao ?? true}
      aceitaBoleto={lote.evento.aceita_boleto ?? false}
      quemPagaTaxa={lote.evento.quem_paga_taxa ?? "comprador"}
      recebedorConfigurado={!!lote.evento.organizador?.gateway_recipient_id}
    />
  );
}
