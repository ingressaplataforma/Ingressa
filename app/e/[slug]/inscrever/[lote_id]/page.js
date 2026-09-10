import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FluxoInscricao from "./FluxoInscricao";

export default async function InscricaoPage({ params }) {
  const { slug, lote_id } = await params;
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lote")
    .select("id, nome, preco_cents, quantidade_total, quantidade_vendida, evento:evento_id(id, titulo, slug, status, data_inicio, local_nome)")
    .eq("id", lote_id)
    .maybeSingle();

  if (!lote || lote.evento.status !== "publicado" || lote.evento.slug !== slug) notFound();

  const esgotado = lote.quantidade_vendida >= lote.quantidade_total;

  const { data: { user } } = await supabase.auth.getUser();
  let temComprador = false;

  if (user) {
    const { data: comp } = await supabase.from("comprador").select("id").eq("id", user.id).maybeSingle();
    temComprador = !!comp;
  }

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
    />
  );
}
