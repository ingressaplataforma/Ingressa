/**
 * Resolução de papel de usuário pós-login.
 *
 * Hoje: verifica se existe linha em `organizador` → retorna 'organizador'.
 * BLOCO FUTURO (comprador): descomentar o segundo bloco abaixo quando a
 * tabela `comprador` existir e o fluxo de checkout criar o perfil.
 */
export async function resolverPapel(supabase, userId) {
  const { data: org } = await supabase
    .from("organizador")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (org) return "organizador";

  // FUTURO — comprador (bloco seguinte ao de eventos):
  // const { data: cmp } = await supabase
  //   .from("comprador")
  //   .select("id")
  //   .eq("id", userId)
  //   .maybeSingle();
  // if (cmp) return "comprador";

  return null;
}

/**
 * Rota de destino após login, dado o papel resolvido.
 * Null = usuário autenticado mas sem perfil → volta ao cadastro.
 */
export function rotaParaPapel(papel) {
  if (papel === "organizador") return "/painel";
  // FUTURO: if (papel === "comprador") return "/minha-conta";
  return "/cadastro";
}
