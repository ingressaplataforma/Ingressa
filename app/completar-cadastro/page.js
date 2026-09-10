import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolverPapel } from "@/lib/supabase/papeis";
import FormCompletar from "./FormCompletar";

export default async function CompletarCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  // Usuário que já tem perfil não precisa completar
  const papel = await resolverPapel(supabase, user.id);
  if (papel === "organizador") redirect("/painel");
  if (papel === "comprador") redirect("/meus-ingressos"); // comprador puro não usa este form

  const nomeGoogle = user.user_metadata?.full_name || user.user_metadata?.name || "";

  return (
    <FormCompletar
      userId={user.id}
      email={user.email}
      nomeInicial={nomeGoogle}
    />
  );
}
