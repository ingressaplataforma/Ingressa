import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/tokens";
import EventoCard from "@/app/components/EventoCard";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function OrganizadorPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizador_publico")
    .select("id, nome, bio, foto_url, whatsapp, email_contato")
    .eq("id", id)
    .maybeSingle();

  if (!org) notFound();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: eventos } = await supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, uf, categoria, data_inicio, slug, imagem_url, lote(preco_cents)")
    .eq("organizador_id", id)
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .gte("data_inicio", hoje.toISOString())
    .order("data_inicio", { ascending: true });

  const waText = encodeURIComponent(`Olá! Gostaria de saber mais sobre seus eventos.`);

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <nav style={{ background: "#fff", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(20px,4vw,48px)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/ingressa_logo_header.png" alt="Ingressa" width={130} style={{ display: "block", height: "auto" }} />
          </Link>
          <Link href="/entrar" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>Entrar</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "40px clamp(20px,4vw,48px) 80px" }}>

        {/* Perfil do organizador */}
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "32px 36px", marginBottom: 40, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {org.foto_url ? (
            <img src={org.foto_url} alt={org.nome} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.line}`, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.panel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>🎪</div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(22px,3vw,32px)", fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {org.nome}
            </h1>
            {org.bio && (
              <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.65, margin: "0 0 16px", maxWidth: 600 }}>
                {org.bio}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {org.whatsapp && (
                <a
                  href={`https://wa.me/${org.whatsapp}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: fontBody }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
              {org.email_contato && (
                <a
                  href={`mailto:${org.email_contato}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, border: `1.5px solid ${T.line}`, background: "#fff", color: T.ink, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: fontBody }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
                  E-mail
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Eventos do organizador */}
        <h2 style={{ fontFamily: fontDisplay, fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 600, color: T.ink, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
          Próximos eventos
        </h2>

        {!eventos?.length ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${T.line}` }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>📅</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 6px" }}>Nenhum evento futuro</p>
            <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Este organizador não tem eventos próximos no momento.</p>
          </div>
        ) : (
          <div className="vitrine-grid">
            {eventos.map((ev) => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link href="/eventos" style={{ fontSize: 14, color: T.muted, textDecoration: "none" }}>← Ver todos os eventos</Link>
        </div>
      </main>
    </div>
  );
}
