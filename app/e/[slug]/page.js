import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "crypto";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_LABEL } from "@/lib/categorias";
import { T, BRL } from "@/lib/tokens";
import Countdown from "./Countdown";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// Gradientes determinísticos — mesmo sistema da vitrine
const GRADIENTES = [
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 100%)",
  "linear-gradient(145deg, #231647 0%, #1A1035 55%, #00C89618 100%)",
  "linear-gradient(145deg, #2A1A5E 0%, #3B1F3F 100%)",
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 70%, #FF5A5F14 100%)",
];
function gradiente(id) {
  return GRADIENTES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTES.length];
}

function computeAccessToken(slug, senhaHash) {
  const secret = process.env.INGRESSO_TOKEN_SECRET || "fallback-dev";
  return crypto.createHmac("sha256", secret).update(`ea:${slug}:${senhaHash}`).digest("hex").slice(0, 40);
}

function imagemPublicUrl(path) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/eventos/${path}`;
}

export default async function EventoPublicoPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("evento")
    .select(`
      id, titulo, descricao, local_nome, endereco, uf, categoria,
      data_inicio, data_fim, status, slug, visibilidade, senha_hash,
      imagem_url, destaque, destaque_admin, organizador_id,
      organizador:organizador_id(gateway_recipient_id, nome),
      lote(id, nome, preco_cents, quantidade_total, quantidade_vendida)
    `)
    .eq("slug", slug)
    .in("status", ["publicado", "pausado"])
    .maybeSingle();

  if (!evento) notFound();

  // Perfil público do organizador (whatsapp, email_contato, bio, foto_url)
  const { data: orgPublico } = await supabase
    .from("organizador_publico")
    .select("id, nome, bio, foto_url, whatsapp, email_contato")
    .eq("id", evento.organizador_id)
    .maybeSingle();

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

  if (evento.visibilidade === "privado") {
    const jar = await cookies();
    const cookieToken = jar.get(`ea_${slug}`)?.value;
    const expectedToken = computeAccessToken(slug, evento.senha_hash ?? "");
    if (cookieToken !== expectedToken) {
      const { default: GateSenha } = await import("./GateSenha");
      return <GateSenha slug={slug} titulo={evento.titulo} />;
    }
  }

  const imageUrl = imagemPublicUrl(evento.imagem_url);
  const temImagem = !!imageUrl;
  const eDestaque = evento.destaque_admin === true || (evento.destaque_admin === null && evento.destaque === true);

  const dataInicio = new Date(evento.data_inicio);
  const dataFim = evento.data_fim ? new Date(evento.data_fim) : null;
  const dataFormatada = dataInicio.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const horaFormatada = dataInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const recebedorConfigurado = !!evento.organizador?.gateway_recipient_id;
  const totalVagas = (evento.lote ?? []).reduce((s, l) => s + l.quantidade_total, 0);
  const totalVendidas = (evento.lote ?? []).reduce((s, l) => s + l.quantidade_vendida, 0);
  const esgotadoTotal = totalVagas > 0 && totalVendidas >= totalVagas;

  // ── Layout: com imagem usa fundo borrado; sem imagem usa hero com gradiente ──

  if (!temImagem) {
    // ── Versão sem capa: hero com gradiente elegante ────────────────────────
    return (
      <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>

        {/* Nav simples */}
        <nav style={{ borderBottom: `1px solid ${T.line}`, background: "#fff", padding: "0 clamp(20px,5vw,48px)" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <LogoIcon />
              <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
            </Link>
            <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
          </div>
        </nav>

        {/* Hero com gradiente */}
        <div style={{ background: gradiente(evento.id), padding: "clamp(48px,8vw,80px) clamp(20px,5vw,48px)" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {eDestaque && (
                <span style={{ fontSize: 11, fontWeight: 700, color: T.coral, background: "rgba(255,90,95,0.18)", padding: "3px 10px", borderRadius: 99, letterSpacing: "0.05em" }}>
                  ✦ DESTAQUE
                </span>
              )}
              {evento.categoria && evento.categoria !== "outro" && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 99, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {CATEGORIA_LABEL?.[evento.categoria] ?? evento.categoria}
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(30px,5vw,52px)", fontWeight: 600, color: "#fff", margin: "0 0 20px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
              {evento.titulo}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 15, color: "rgba(255,255,255,0.8)" }}>
              <InfoItem icon="📅" text={`${dataFormatada} às ${horaFormatada}`} />
              {dataFim && <InfoItem icon="🔚" text={`Até ${dataFim.toLocaleDateString("pt-BR")}`} />}
              {evento.local_nome && <InfoItem icon="📍" text={evento.local_nome + (evento.uf ? `, ${evento.uf}` : "")} />}
              {evento.endereco && <InfoItem icon="🗺️" text={evento.endereco} />}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
          <EventoConteudo evento={evento} orgPublico={orgPublico} fontDisplay={fontDisplay} fontBody={fontBody} recebedorConfigurado={recebedorConfigurado} esgotadoTotal={esgotadoTotal} totalVagas={totalVagas} totalVendidas={totalVendidas} slug={slug} temImagem={false} />
        </main>
      </div>
    );
  }

  // ── Versão com capa: fundo borrado + banner ──────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", fontFamily: fontBody, position: "relative" }}>

      {/* Fundo borrado */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(48px) brightness(0.22)",
          transform: "scale(1.08)",
        }}
      />
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, background: "rgba(10,6,26,0.5)" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav glassmorphism */}
        <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", background: "rgba(26,16,53,0.75)", backdropFilter: "blur(12px)", padding: "0 clamp(20px,5vw,48px)" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <LogoIcon color="#fff" />
              <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: "#fff", letterSpacing: "-0.02em" }}>Ingressa</span>
            </Link>
            <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
          </div>
        </nav>

        {/* Banner hero — imagem nítida */}
        <div style={{ width: "100%", position: "relative", aspectRatio: "16/5", maxHeight: 380, overflow: "hidden" }}>
          <Image src={imageUrl} alt={`Capa de ${evento.titulo}`} fill style={{ objectFit: "cover" }} priority sizes="100vw" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(10,6,26,0.7) 100%)" }} />
          {/* Badges sobre a capa */}
          <div style={{ position: "absolute", bottom: 20, left: "clamp(20px,5vw,48px)", display: "flex", gap: 8 }}>
            {eDestaque && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: T.coral, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.05em" }}>
                ✦ DESTAQUE
              </span>
            )}
            {evento.categoria && evento.categoria !== "outro" && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: 99, letterSpacing: "0.05em", textTransform: "uppercase", backdropFilter: "blur(6px)" }}>
                {CATEGORIA_LABEL?.[evento.categoria] ?? evento.categoria}
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
          <EventoConteudo evento={evento} orgPublico={orgPublico} fontDisplay={fontDisplay} fontBody={fontBody} recebedorConfigurado={recebedorConfigurado} esgotadoTotal={esgotadoTotal} totalVagas={totalVagas} totalVendidas={totalVendidas} slug={slug} temImagem imageUrl={imageUrl} dataFormatada={dataFormatada} horaFormatada={horaFormatada} dataFim={dataFim} />
        </main>
      </div>
    </div>
  );
}

// ── Conteúdo compartilhado (cabeçalho, descrição, ingressos) ─────────────────

function EventoConteudo({ evento, orgPublico, fontDisplay, fontBody, recebedorConfigurado, esgotadoTotal, totalVagas, totalVendidas, slug, temImagem, imageUrl, dataFormatada, horaFormatada, dataFim }) {
  const cardStyle = temImagem
    ? { background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "28px 32px", marginBottom: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }
    : { background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "24px 28px", marginBottom: 20 };

  const temWhatsapp = !!orgPublico?.whatsapp;
  const temEmail = !!orgPublico?.email_contato;
  const nomeOrg = orgPublico?.nome ?? evento.organizador?.nome;
  const orgId = orgPublico?.id ?? evento.organizador_id;

  const waText = encodeURIComponent(`Olá! Tenho uma dúvida sobre o evento "${evento.titulo}".`);
  const waLink = temWhatsapp ? `https://wa.me/${orgPublico.whatsapp}?text=${waText}` : null;

  return (
    <>
      {/* Cabeçalho do evento — só no layout com imagem (no sem-imagem já está no hero) */}
      {temImagem && (
        <div style={cardStyle}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,40px)", fontWeight: 600, color: T.ink, margin: "0 0 18px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            {evento.titulo}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, color: T.ink2, fontSize: 15 }}>
            <InfoItem icon="📅" text={`${dataFormatada} às ${horaFormatada}`} />
            {dataFim && <InfoItem icon="🔚" text={`Até ${dataFim.toLocaleDateString("pt-BR")}`} />}
            {evento.local_nome && <InfoItem icon="📍" text={evento.local_nome + (evento.uf ? `, ${evento.uf}` : "")} />}
            {evento.endereco && <InfoItem icon="🗺️" text={evento.endereco} />}
          </div>
        </div>
      )}

      {/* Contagem regressiva */}
      <div style={cardStyle}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Começa em
        </p>
        <Countdown dataInicio={evento.data_inicio} />
      </div>

      {/* Ocupação (quando há vagas) */}
      {totalVagas > 0 && (
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: T.muted, margin: "0 0 6px", fontWeight: 600 }}>Vagas preenchidas</p>
            <div style={{ height: 6, borderRadius: 99, background: T.line, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: esgotadoTotal ? "#E67E22" : T.mint, width: `${Math.min(100, (totalVendidas / totalVagas) * 100)}%`, transition: "width 0.4s" }} />
            </div>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: esgotadoTotal ? "#E67E22" : T.mint, margin: 0, whiteSpace: "nowrap" }}>
            {esgotadoTotal ? "Esgotado" : `${totalVagas - totalVendidas} restantes`}
          </p>
        </div>
      )}

      {/* Descrição */}
      {evento.descricao && (
        <div style={cardStyle}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Sobre o evento</h2>
          <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{evento.descricao}</p>
        </div>
      )}

      {/* Ingressos / Lotes */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>
          {evento.lote?.some((l) => l.preco_cents > 0) ? "Ingressos" : "Inscrições"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(evento.lote ?? []).map((lote) => {
            const esgotado = lote.quantidade_vendida >= lote.quantidade_total;
            const restantes = lote.quantidade_total - lote.quantidade_vendida;
            const pago = lote.preco_cents > 0;
            return (
              <div key={lote.id} style={{
                background: "#fff",
                borderRadius: 14,
                border: `1px solid ${esgotado ? T.line : T.mint + "40"}`,
                padding: "18px 22px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: "0 0 4px" }}>{lote.nome}</p>
                  <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                    {lote.preco_cents === 0 ? "Gratuito" : BRL(lote.preco_cents / 100)}
                    {!esgotado && restantes <= 20 && (
                      <span style={{ color: "#E67E22", fontWeight: 600 }}> · Últimas {restantes} vagas</span>
                    )}
                    {esgotado && <span style={{ color: T.muted, fontWeight: 500 }}> · Esgotado</span>}
                  </p>
                </div>
                {esgotado ? (
                  <span style={{ padding: "11px 22px", background: T.line, color: T.muted, borderRadius: 10, fontSize: 14, fontWeight: 600 }}>Esgotado</span>
                ) : pago && !recebedorConfigurado ? (
                  <span style={{ padding: "11px 22px", background: T.panel, color: T.muted, borderRadius: 10, fontSize: 14, fontWeight: 600 }}>Em breve</span>
                ) : (
                  <Link
                    href={`/e/${slug}/inscrever/${lote.id}`}
                    style={{ padding: "11px 24px", background: T.coral, color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block", fontFamily: fontBody, letterSpacing: "0.01em" }}
                  >
                    {pago ? "Comprar" : "Inscrever-se"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Organizador — contato + link para a página */}
      {(nomeOrg || temWhatsapp || temEmail) && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: (temWhatsapp || temEmail) ? 16 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {orgPublico?.foto_url ? (
                <img src={orgPublico.foto_url} alt={nomeOrg} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.line}` }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.panel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎪</div>
              )}
              <div>
                <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Organizado por</p>
                {orgId ? (
                  <Link href={`/organizador/${orgId}`} style={{ fontSize: 15, fontWeight: 600, color: T.ink, textDecoration: "none" }}>
                    {nomeOrg}
                  </Link>
                ) : (
                  <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: 0 }}>{nomeOrg}</p>
                )}
              </div>
            </div>
            {orgId && (
              <Link href={`/organizador/${orgId}`} style={{ fontSize: 13, color: T.coral, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                Ver página do organizador →
              </Link>
            )}
          </div>
          {(temWhatsapp || temEmail) && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {temWhatsapp && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: fontBody }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Falar no WhatsApp
                </a>
              )}
              {temEmail && (
                <a
                  href={`mailto:${orgPublico.email_contato}?subject=${encodeURIComponent(`Dúvida sobre: ${evento.titulo}`)}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: "#fff", color: T.ink, fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: fontBody }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
                  Enviar e-mail
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rodapé — link de volta */}
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Link href="/eventos" style={{ fontSize: 14, color: T.muted, textDecoration: "none" }}>
          ← Ver todos os eventos
        </Link>
      </div>
    </>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function InfoItem({ icon, text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function LogoIcon({ color = T.ink }) {
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" fill="none">
      <rect x="1" y="6" width="28" height="18" rx="5" fill={color} />
      <circle cx="1" cy="15" r="3.4" fill={T.surface} />
      <circle cx="29" cy="15" r="3.4" fill={T.surface} />
      <line x1="15" y1="9" x2="15" y2="21" stroke="#FF5A5F" strokeWidth="2.2" strokeDasharray="2 2.4" strokeLinecap="round" />
    </svg>
  );
}
