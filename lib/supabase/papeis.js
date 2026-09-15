/**
 * Resolução de papel de usuário pós-login.
 * Suporta perfis múltiplos: uma mesma conta pode ser organizador E comprador.
 */
export async function resolverPapel(supabase, userId) {
  const [{ data: org }, { data: cmp }] = await Promise.all([
    supabase.from("organizador").select("id").eq("id", userId).maybeSingle(),
    supabase.from("comprador").select("id").eq("id", userId).maybeSingle(),
  ]);

  if (org && cmp) return "ambos";
  if (org) return "organizador";
  if (cmp) return "comprador";
  return null;
}

/**
 * Rota de destino após login, dado o papel resolvido.
 */
export function rotaParaPapel(papel) {
  if (papel === "organizador") return "/painel";
  if (papel === "comprador") return "/meus-ingressos";
  if (papel === "ambos") return "/escolher-modo";
  // Sem perfil → completar cadastro de organizador
  return "/completar-cadastro";
}
