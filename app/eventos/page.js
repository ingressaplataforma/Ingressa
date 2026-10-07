import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/tokens";
import FiltersClient from "./FiltersClient";
import DestaquePopup from "../components/DestaquePopup";
import EventoCard from "../components/EventoCard";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

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

export default async function EventosPage({ searchParams }) {
  const { q, cat, uf, periodo } = await searchParams;

  const supabase = await createClient();

  // ── Evento em destaque para o popup ─────────────────────────────────────────
  // Aparece ao entrar em /eventos. Só mostra evento FUTURO.
  // FUTURO (recurso PAGO): filtrar também por destaque_pago=true antes de exibir.
  const agora = new Date().toISOString();
  const { data: candidatos, error: destaqueError } = await supabase
    .from("evento")
    .select("id, titulo, slug, local_nome, data_inicio, imagem_url, destaque, destaque_admin, destaque_ordem")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .or("destaque.is.true,destaque_admin.is.true")
    .gte("data_inicio", agora)
    .order("destaque_ordem", { ascending: true, nullsFirst: false })
    .order("data_inicio", { ascending: true });

  if (destaqueError) console.error("[eventos] erro ao buscar destaque:", destaqueError);

  // Regra efetiva: descarta destaque_admin=false; prioriza destaque_admin=true
  const destaqueEvento = (candidatos ?? [])
    .filter((ev) => ev.destaque_admin === true || (ev.destaque_admin === null && ev.destaque === true))
    .sort((a, b) => {
      if (a.destaque_admin === true && b.destaque_admin !== true) return -1;
      if (b.destaque_admin === true && a.destaque_admin !== true) return 1;
      const oa = a.destaque_ordem ?? Infinity;
      const ob = b.destaque_ordem ?? Infinity;
      return oa - ob;
    })[0] ?? null;

  // ── Listagem de eventos ──────────────────────────────────────────────────────
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

  // Filtro de data: padrão = só futuros; "passados" = sem filtro (todos); outros = range
  if (periodo === "passados") {
    // sem filtro de data — inclui todos, passados e futuros
  } else {
    const intervalo = calcPeriodo(periodo);
    if (intervalo) {
      query = query.gte("data_inicio", intervalo.gte).lte("data_inicio", intervalo.lte);
    } else {
      // padrão: início do dia de hoje em diante
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      query = query.gte("data_inicio", hoje.toISOString());
    }
  }

  const { data: eventos } = await query;

  const temFiltro = !!(q || cat || uf || periodo);

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>

      {/* Popup de destaque — aparece ao abrir /eventos; fecha com X, ESC, backdrop */}
      {destaqueEvento && <DestaquePopup evento={destaqueEvento} />}

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
        {!eventos?.length && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.panel, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>
              {temFiltro ? "🔍" : "📅"}
            </div>
            <p style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {temFiltro ? "Nenhum evento com esses filtros" : "Nenhum evento futuro por enquanto"}
            </p>
            <p style={{ fontSize: 15, color: T.muted, margin: 0, maxWidth: 380, marginInline: "auto" }}>
              {temFiltro
                ? "Que tal ampliar a busca? Tente remover alguns filtros."
                : "Novos eventos chegam em breve. Volte para conferir."}
            </p>
          </div>
        )}

        {/*
          TODO (futuro — item 6): quando houver muitos eventos ou eventos patrocinados/curados,
          reintroduzir um card em destaque full-width acima do grid para o primeiro resultado
          orgânico ou para uma inserção paga. Por ora, grid uniforme para todos.
        */}

        {/* Grid uniforme — todos os eventos no mesmo tamanho compacto */}
        {!!eventos?.length && (
          <div className="vitrine-grid">
            {eventos.map((ev) => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        )}

      </main>
    </div>
  );
}
