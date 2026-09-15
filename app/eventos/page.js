import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { T, BRL } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export const revalidate = 60;

export default async function EventosPage() {
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, data_inicio, slug, lote(preco_cents)")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .order("data_inicio", { ascending: true });

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <nav style={{ borderBottom: `1px solid ${T.line}`, background: "#fff", padding: "0 clamp(20px,5vw,48px)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Image src="/ingressa_logo_header.png" alt="Ingressa" width={142} height={47} style={{ display: "block", objectFit: "contain" }} />
          </Link>
          <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Eventos
        </h1>
        <p style={{ fontSize: 15, color: T.muted, margin: "0 0 36px" }}>Encontre e inscreva-se em eventos próximos.</p>

        {!eventos?.length ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontSize: 40, margin: "0 0 12px" }}>📭</p>
            <p style={{ fontSize: 16, color: T.muted }}>Nenhum evento público disponível no momento.</p>
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
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "22px 24px", height: "100%", boxSizing: "border-box", transition: "box-shadow 0.18s", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, color: T.coral, fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {dataFmt} · {horaFmt}
                      </p>
                      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
                        {ev.titulo}
                      </h2>
                    </div>
                    {ev.local_nome && (
                      <p style={{ fontSize: 14, color: T.muted, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>📍</span> {ev.local_nome}
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
