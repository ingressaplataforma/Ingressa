import Landing from "./components/Landing";
import { createClient } from "@/lib/supabase/server";
import DestaquePopup from "./components/DestaquePopup";

export default async function Page() {
  const supabase = await createClient();

  // Busca o evento em destaque mais próximo para o popup.
  // Regra: (destaque OR destaque_admin) AND NOT destaque_bloqueado_admin
  // Prioridade: destaque_admin (admin) > destaque (org), depois o mais próximo.
  const agora = new Date().toISOString();
  const { data: destaqueEvento } = await supabase
    .from("evento")
    .select("id, titulo, slug, local_nome, data_inicio, imagem_url")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .eq("destaque_bloqueado_admin", false)
    .or("destaque.eq.true,destaque_admin.eq.true")
    .gte("data_inicio", agora)
    .order("destaque_admin", { ascending: false })
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
