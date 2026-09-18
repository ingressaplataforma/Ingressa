import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_LABEL } from "@/lib/categorias";
import { T, BRL } from "@/lib/tokens";
import FiltersClient from "./FiltersClient";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// Gradientes elegantes do sistema para eventos sem capa — determinísticos por ID
const GRADIENTES = [
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 100%)",
  "linear-gradient(145deg, #231647 0%, #1A1035 55%, #00C89618 100%)",
  "linear-gradient(145deg, #2A1A5E 0%, #3B1F3F 100%)",
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 70%, #FF5A5F14 100%)",
];

function gradiente(id) {
  const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTES[hash % GRADIENTES.length];
}

function calcPeriodo(periodo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (periodo === "7d") {
    const fim = new Date(hoje); fim.setDate(fim.getDate() + 7);
    return { gte: hoje.toISOString(), lte: fim.toISOString() };
  }
  if (periodo === "mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    return { gte: inicio.toISOString(), lte: fim.toISOString() };
  }
  if (periodo === "prox_mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0, 23, 59, 59);
    return { gte: inicio.toISOString(), lte: fim.toISOString() };
  }
  return null;
}

function precoInfo(lotes) {
  const precos = lotes?.map((l) => l.preco_cents) ?? [];
  if (!precos.length) return null;
  if (precos.every((p) => p === 0)) return { texto: "Gratuito", cor: T.mint };
  return { texto: `a partir de ${BRL(Math.min(...precos) / 100)}`, cor: T.ink };
}

function fmtData(iso) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

export default async function EventosPage({ searchParams }) {
  const { q, cat, uf, periodo } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, uf, categoria, data_inicio, slug, imagem_url, lote(preco_cents)")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .order("data_inicio", { ascending: true });

  if (q?.trim()) {
    const termo = q.trim().replace(/'/g, "''");
    query = query.or(`titulo.ilike.%${termo}%,local_nome.ilike.%${termo}%`);
  }
  if (cat) query = query.eq("categoria", cat);
  if (uf) query = query.eq("uf", uf.toUpperCase());
  const intervalo = calcPeriodo(periodo);
  if (intervalo) query = query.gte("data_inicio", intervalo.gte).lte("data_inicio", intervalo.lte);

  const { data: eventos } = await query;

  const temFiltro = !!(q || cat || uf || periodo);
  const destaque = eventos?.[0] ?? null;
  const restantes = eventos?.slice(1) ?? [];
  const destaquePreco = destaque ? precoInfo(destaque.lote) : null;

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(20px,4vw,48px)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/ingressa_logo_header.png" alt="Ingressa" width={130} style={{ display: "block", height: "auto" }} />
          </Link>
          <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "40px clamp(20px,4vw,48px) 80px" }}>

        {/* Cabeçalho + filtros */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 600, color: T.ink, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
            Eventos
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 22px" }}>
            Descubra e inscreva-se nos próximos eventos.
          </p>
          <Suspense fallback={null}>
            <FiltersClient q={q ?? ""} cat={cat ?? ""} uf={uf ?? ""} periodo={periodo ?? ""} />
          </Suspense>
        </div>

        {/* Estado vazio */}
        {!destaque && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.panel, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>
              {temFiltro ? "🔍" : "📅"}
            </div>
            <p style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {temFiltro ? "Nenhum evento com esses filtros" : "Nenhum evento por enquanto"}
            </p>
            <p style={{ fontSize: 15, color: T.muted, margin: 0, maxWidth: 380, marginInline: "auto" }}>
              {temFiltro
                ? "Que tal ampliar a busca? Tente remover alguns filtros."
                : "Novos eventos chegam em breve. Volte para conferir."}
            </p>
          </div>
        )}

        {/* Evento em destaque — primeiro resultado, capa dominante */}
        {/* TODO (eventos patrocinados futura): aqui poderá entrar um destaque pago/curado acima do primeiro orgânico */}
        {destaque && (
          <Link href={`/e/${destaque.slug}`} style={{ textDecoration: "none", display: "block", marginBottom: 28 }}>
            <div
              className="vitrine-card"
              style={{
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                height: "clamp(260px, 36vw, 420px)",
                background: destaque.imagem_url ? "#000" : gradiente(destaque.id),
              }}
            >
              {/* Capa */}
              {destaque.imagem_url && (
                <img
                  src={destaque.imagem_url}
                  alt={destaque.titulo}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                />
              )}
              {/* Overlay de legibilidade — escuro de baixo para cima */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,16,53,0.97) 0%, rgba(26,16,53,0.55) 50%, rgba(26,16,53,0.12) 100%)" }} />

              {/* Conteúdo sobre a imagem */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "clamp(20px,3.5vw,36px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  {destaque.categoria && destaque.categoria !== "outro" && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.16)", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em", backdropFilter: "blur(6px)" }}>
                      {CATEGORIA_LABEL[destaque.categoria] ?? destaque.categoria}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    {fmtData(destaque.data_inicio)}{destaque.uf ? ` · ${destaque.uf}` : ""}
                  </span>
                </div>

                <h2 style={{ fontFamily: fontDisplay, fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 600, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2, maxWidth: 680 }}>
                  {destaque.titulo}
                </h2>

                {destaque.local_nome && (
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "0 0 18px" }}>
                    📍 {destaque.local_nome}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  {destaquePreco && (
                    <span style={{ fontSize: 16, fontWeight: 700, color: destaquePreco.cor === T.mint ? "#00E6AE" : "#fff" }}>
                      {destaquePreco.texto}
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", padding: "9px 22px", borderRadius: 11, background: T.coral, display: "inline-block" }}>
                    Ver evento
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Grid dos demais eventos */}
        {restantes.length > 0 && (
          <div className="vitrine-grid">
            {restantes.map((ev) => {
              const preco = precoInfo(ev.lote);
              return (
                <Link key={ev.id} href={`/e/${ev.slug}`} style={{ textDecoration: "none" }}>
                  <article className="vitrine-card" style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: `1px solid ${T.line}`,
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    {/* Capa — height explícita (não aspect-ratio) para funcionar em flex column sem width implícito */}
                    <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden", background: !!ev.imagem_url ? "#000" : gradiente(ev.id), flexShrink: 0 }}>
                      {!!ev.imagem_url ? (
                        <img src={ev.imagem_url} alt={ev.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        /* Sem capa: gradiente do sistema — título em overlay para ter algo visual */
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "14px 16px" }}>
                          <span style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", lineHeight: 1.3 }}>
                            {ev.titulo}
                          </span>
                        </div>
                      )}
                      {/* Badge de categoria sobre a capa */}
                      {ev.categoria && ev.categoria !== "outro" && (
                        <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(26,16,53,0.65)", padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em", backdropFilter: "blur(4px)" }}>
                          {CATEGORIA_LABEL[ev.categoria] ?? ev.categoria}
                        </span>
                      )}
                    </div>

                    {/* Detalhes */}
                    <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.coral, margin: 0 }}>
                        {fmtData(ev.data_inicio)}{ev.uf ? ` · ${ev.uf}` : ""}
                      </p>
                      <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
                        {ev.titulo}
                      </h3>
                      {ev.local_nome && (
                        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
                          📍 {ev.local_nome}
                        </p>
                      )}
                      {preco && (
                        <p style={{ fontSize: 14, fontWeight: 700, color: preco.cor, margin: "auto 0 0" }}>
                          {preco.texto}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
