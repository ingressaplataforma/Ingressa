import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolverPapel } from "@/lib/supabase/papeis";
import FormCompletar from "./FormCompletar";

export default async function CompletarCadastroPage({ searchParams }) {
  const { from } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const papel = await resolverPapel(supabase, user.id);

  // Sem perfil algum → fluxo original de novo organizador via Google
  if (!papel) {
    const nomeGoogle = user.user_metadata?.full_name || user.user_metadata?.name || "";
    return (
      <FormCompletar
        userId={user.id}
        email={user.email}
        nomeInicial={nomeGoogle}
        modo="novo_organizador"
        destinoApos={from || "/painel"}
      />
    );
  }

  // Verifica o que está faltando no(s) perfil(s)
  const [orgRes, cmpRes] = await Promise.all([
    (papel === "organizador" || papel === "ambos")
      ? supabase.from("organizador").select("nome, documento").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    (papel === "comprador" || papel === "ambos")
      ? supabase.from("comprador").select("nome, cpf").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const org = orgRes.data;
  const cmp = cmpRes.data;

  const orgSemDoc = org && !org.documento;
  const cmpSemCpf = cmp && !cmp.cpf;

  // Prioridade: comprador sem CPF (caso mais crítico para inscrições)
  if (cmpSemCpf) {
    return (
      <FormCompletar
        userId={user.id}
        email={user.email}
        nomeInicial={cmp.nome || ""}
        modo="cpf_comprador"
        destinoApos={from || "/meus-ingressos"}
      />
    );
  }

  // Organizador sem documento
  if (orgSemDoc) {
    return (
      <FormCompletar
        userId={user.id}
        email={user.email}
        nomeInicial={org.nome || ""}
        modo="documento_organizador"
        destinoApos={from || "/painel"}
      />
    );
  }

  // Tudo completo — redirecionar para destino ou para a rota padrão do papel
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    redirect(from);
  }
  redirect(papel === "comprador" ? "/meus-ingressos" : "/painel");
}
