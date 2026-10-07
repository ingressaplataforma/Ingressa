import Landing from "./components/Landing";
import { createClient } from "@/lib/supabase/server";
import DestaquePopup from "./components/DestaquePopup";

export default async function Page() {
  const supabase = await createClient();

  // Busca o evento em destaque para o popup.
  // Regra efetiva: (destaque_admin IS TRUE) OR (destaque_admin IS NULL AND destaque = TRUE)
  //
  // Estratégia: busca todos os candidatos onde destaque=true OR destaque_admin=true
  // (sintaxe simples, sem and() aninhado no PostgREST), depois filtra em JS para
  // descartar destaque_admin=false (admin bloqueou). Inclui destaque_admin no select
  // para poder aplicar a regra no servidor.
  //
  // FUTURO (recurso PAGO): filtrar também por destaque_pago=true antes de exibir.

  const agora = new Date().toISOString();

  const { data: candidatos, error } = await supabase
    .from("evento")
    .select("id, titulo, slug, local_nome, data_inicio, imagem_url, destaque, destaque_admin, destaque_ordem")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .or("destaque.is.true,destaque_admin.is.true")
    .gte("data_inicio", agora)
    .order("destaque_ordem", { ascending: true, nullsFirst: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    console.error("[home] erro ao buscar destaque:", error);
  }

  // Aplica a regra efetiva: descarta destaque_admin=false (admin bloqueou)
  // e prioriza destaque_admin=true (admin forçou) sobre null (org controla).
  const destaqueEvento = (candidatos ?? [])
    .filter((ev) => ev.destaque_admin === true || (ev.destaque_admin === null && ev.destaque === true))
    .sort((a, b) => {
      if (a.destaque_admin === true && b.destaque_admin !== true) return -1;
      if (b.destaque_admin === true && a.destaque_admin !== true) return 1;
      const oa = a.destaque_ordem ?? Infinity;
      const ob = b.destaque_ordem ?? Infinity;
      return oa - ob;
    })[0] ?? null;

  return (
    <>
      <Landing />
      {destaqueEvento && <DestaquePopup evento={destaqueEvento} />}
    </>
  );
}
