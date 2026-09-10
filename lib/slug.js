// Funciona em qualquer ambiente (cliente e servidor).
export function gerarSlug(titulo) {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
