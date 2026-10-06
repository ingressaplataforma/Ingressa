import Landing from "./components/Landing";
import { createClient } from "@/lib/supabase/server";
import DestaquePopup from "./components/DestaquePopup";

export default async function Page() {
  const supabase = await createClient();

  // Busca o evento em destaque mais próximo para o popup.
  // Regra: (destaque_admin IS TRUE) OR (destaque_admin IS NULL AND destaque = TRUE)
  // Prioridade: admin override (true) > org (null+destaque), depois destaque_ordem, depois data_inicio.
  const agora = new Date().toISOString();
  const { data: destaqueEvento } = await supabase
    .from("evento")
    .select("id, titulo, slug, local_nome, data_inicio, imagem_url")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .or("destaque_admin.is.true,and(destaque_admin.is.null,destaque.is.true)")
    .gte("data_inicio", agora)
    .order("destaque_admin", { ascending: false, nullsFirst: false })
    .order("destaque_ordem", { ascending: true, nullsFirst: false })
    .order("data_inicio", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <Landing />
      {destaqueEvento && <DestaquePopup evento={destaqueEvento} />}
    </>
  );
}
