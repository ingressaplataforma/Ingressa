// Funciona em qualquer ambiente (cliente e servidor).
export function gerarSlugBase(titulo) {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// Requer acesso ao Supabase — usar apenas no servidor.
// Retorna slug único globalmente; se base já existe, acrescenta -2, -3…
// excluirId: passa o id do evento atual ao editar (para não conflitar consigo mesmo).
export async function gerarSlugUnico(titulo, supabase, excluirId = null) {
  const base = gerarSlugBase(titulo);
  let candidato = base;
  let n = 2;

  for (;;) {
    let q = supabase
      .from("evento")
      .select("id", { count: "exact", head: true })
      .eq("slug", candidato);

    if (excluirId) q = q.neq("id", excluirId);

    const { count } = await q;

    if (!count) return candidato;

    candidato = `${base}-${n}`;
    n++;
  }
}
