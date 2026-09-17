import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS, CATEGORIA_LABEL } from "@/lib/categorias";
import { T, BRL } from "@/lib/tokens";
import FiltersClient from "./FiltersClient";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

function calcPeriodo(periodo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (periodo === "7d") {
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + 7);
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

export default async function EventosPage({ searchParams }) {
  const { q, cat, uf, periodo } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, uf, categoria, data_inicio, slug, lote(preco_cents)")
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
  if (intervalo) {
    query = query.gte("data_inicio", intervalo.gte).lte("data_inicio", intervalo.lte);
  }

  const { data: eventos } = await query;

  const temFiltro = !!(q || cat || uf || periodo);

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <nav style={{ borderBottom: `1px solid ${T.line}`, background: "#fff", padding: "0 clamp(20px,5vw,48px)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", flexShrink: 0, minWidth: 130 }}>
            <img src="/ingressa_logo_header.png" alt="Ingressa" width={130} style={{ display: "block", height: "auto" }} />
          </Link>
          <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Eventos
        </h1>
        <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px" }}>Encontre e inscreva-se em eventos próximos.</p>

        <Suspense fallback={null}>
          <FiltersClient q={q ?? ""} cat={cat ?? ""} uf={uf ?? ""} periodo={periodo ?? ""} />
        </Suspense>

        {!eventos?.length ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontSize: 40, margin: "0 0 12px" }}>📭</p>
            <p style={{ fontSize: 16, color: T.muted }}>
              {temFiltro ? "Nenhum evento encontrado para esses filtros." : "Nenhum evento público disponível no momento."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {eventos.map((ev) => {
              const data = new Date(ev.data_inicio);
              const dataFmt = data.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
              const horaFmt = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const precos = ev.lote?.map((l) => l.preco_cents) ?? [];
              const minPreco = precos.length ? Math.min(...precos) : null;
              const gratuito = precos.every((p) => p === 0);
              return (
                <Link key={ev.id} href={`/e/${ev.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "22px 24px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 13, color: T.coral, fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {dataFmt} · {horaFmt}
                        </p>
                        {ev.categoria && ev.categoria !== "outro" && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, background: `${T.muted}18`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {CATEGORIA_LABEL[ev.categoria] ?? ev.categoria}
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
                        {ev.titulo}
                      </h2>
                    </div>
                    {ev.local_nome && (
                      <p style={{ fontSize: 14, color: T.muted, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>📍</span> {ev.local_nome}{ev.uf ? ` — ${ev.uf}` : ""}
                      </p>
                    )}
                    {ev.descricao && (
                      <p style={{ fontSize: 14, color: T.ink2, margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {ev.descricao}
                      </p>
                    )}
                    <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: gratuito ? T.mint : T.ink }}>
                        {gratuito ? "Gratuito" : minPreco != null ? `a partir de ${BRL(minPreco / 100)}` : "Ver ingressos"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
