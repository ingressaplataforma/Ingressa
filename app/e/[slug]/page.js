import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "crypto";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { T, BRL } from "@/lib/tokens";
import GateSenha from "./GateSenha";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

function computeAccessToken(slug, senhaHash) {
  const secret = process.env.INGRESSO_TOKEN_SECRET || "fallback-dev";
  return crypto.createHmac("sha256", secret).update(`ea:${slug}:${senhaHash}`).digest("hex").slice(0, 40);
}

export default async function EventoPublicoPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Busca incluindo visibilidade e senha_hash — senha_hash NUNCA vai ao cliente
  const { data: evento } = await supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, endereco, data_inicio, data_fim, status, slug, visibilidade, senha_hash, lote(id, nome, preco_cents, quantidade_total, quantidade_vendida)")
    .eq("slug", slug)
    .in("status", ["publicado", "pausado"])
    .maybeSingle();

  if (!evento) notFound();

  // Evento pausado: página pública mostra aviso, não o conteúdo completo
  if (evento.status === "pausado") {
    return (
      <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🔧</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.ink, margin: "0 0 10px" }}>Inscrições temporariamente indisponíveis</h1>
        <p style={{ fontSize: 15, color: T.muted, maxWidth: 380, lineHeight: 1.6 }}>
          <strong>{evento.titulo}</strong> está com as inscrições pausadas pelo organizador. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  // Evento não-listado: acessível por link direto, mas não aparece na listagem pública
  // Evento privado: exige senha; verifica cookie httpOnly emitido pela API
  if (evento.visibilidade === "privado") {
    const jar = await cookies();
    const cookieToken = jar.get(`ea_${slug}`)?.value;
    const expectedToken = computeAccessToken(slug, evento.senha_hash ?? "");
    if (cookieToken !== expectedToken) {
      // Renderiza gate de senha — nunca expõe senha_hash ao client
      return <GateSenha slug={slug} titulo={evento.titulo} />;
    }
  }

  const dataInicio = new Date(evento.data_inicio);
  const dataFim = evento.data_fim ? new Date(evento.data_fim) : null;
  const dataFormatada = dataInicio.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const horaFormatada = dataInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <nav style={{ borderBottom: `1px solid ${T.line}`, background: "#fff", padding: "0 clamp(20px,5vw,48px)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <LogoIcon />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
          </Link>
          <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Evento</p>
          <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(28px,5vw,44px)", fontWeight: 600, color: T.ink, margin: "0 0 20px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            {evento.titulo}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, color: T.ink2, fontSize: 15 }}>
            <InfoItem icon="📅" text={`${dataFormatada} às ${horaFormatada}`} />
            {dataFim && <InfoItem icon="🔚" text={`Até ${dataFim.toLocaleDateString("pt-BR")}`} />}
            {evento.local_nome && <InfoItem icon="📍" text={evento.local_nome} />}
            {evento.endereco && <InfoItem icon="🗺️" text={evento.endereco} />}
          </div>
        </div>

        {evento.descricao && (
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "24px 28px", marginBottom: 32 }}>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Sobre o evento</h2>
            <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{evento.descricao}</p>
          </div>
        )}

        <div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Ingressos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {evento.lote.map((lote) => {
              const esgotado = lote.quantidade_vendida >= lote.quantidade_total;
              const restantes = lote.quantidade_total - lote.quantidade_vendida;
              return (
                <div key={lote.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>{lote.nome}</p>
                    <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                      {lote.preco_cents === 0 ? "Gratuito" : BRL(lote.preco_cents / 100)}
                      {!esgotado && restantes <= 20 && (
                        <span style={{ color: "#E67E22", fontWeight: 600 }}> · Últimas {restantes} vagas</span>
                      )}
                      {esgotado && <span style={{ color: T.muted }}> · Esgotado</span>}
                    </p>
                  </div>
                  {esgotado ? (
                    <button disabled style={{ padding: "11px 24px", background: T.line, color: T.muted, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "not-allowed", fontFamily: fontBody }}>
                      Esgotado
                    </button>
                  ) : (
                    <Link
                      href={`/e/${slug}/inscrever/${lote.id}`}
                      style={{ padding: "11px 24px", background: T.coral, color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", fontFamily: fontBody }}
                    >
                      Inscrever-se
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ icon, text }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function LogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" fill="none">
      <rect x="1" y="6" width="28" height="18" rx="5" fill={T.ink} />
      <circle cx="1" cy="15" r="3.4" fill={T.surface} />
      <circle cx="29" cy="15" r="3.4" fill={T.surface} />
      <line x1="15" y1="9" x2="15" y2="21" stroke="#FF5A5F" strokeWidth="2.2" strokeDasharray="2 2.4" strokeLinecap="round" />
    </svg>
  );
}
