/**
 * Resolução de papel de usuário pós-login.
 *
 * Prioridade: organizador > comprador. Usuário com ambos os perfis é roteado
 * para /painel; pode navegar manualmente para /meus-ingressos.
 */
export async function resolverPapel(supabase, userId) {
  const { data: org } = await supabase
    .from("organizador")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (org) return "organizador";

  // Bloco 2: comprador ativo.
  const { data: cmp } = await supabase
    .from("comprador")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (cmp) return "comprador";

  // FUTURO: adicionar outros papéis aqui conforme próximos blocos.

  return null;
}

/**
 * Rota de destino após login, dado o papel resolvido.
 * Null = autenticado mas sem perfil (ex: primeiro login via Google).
 */
export function rotaParaPapel(papel) {
  if (papel === "organizador") return "/painel";
  if (papel === "comprador") return "/meus-ingressos";
  // Sem perfil → completar cadastro de organizador
  return "/completar-cadastro";
}
