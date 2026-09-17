import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { organizadorTemPlanoAtivo } from "@/lib/planos";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const STATUS_LABEL = {
  rascunho:  { label: "Rascunho",  color: T.muted },
  publicado: { label: "Publicado", color: T.mint },
  pausado:   { label: "Pausado",   color: "#E67E22" },
  encerrado: { label: "Encerrado", color: T.ink2 },
  cancelado: { label: "Cancelado", color: "#E74C3C" },
};

const LIMITE_GRATIS = 3;

export default async function EventosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: eventos } = await supabase
    .from("evento")
    .select("id, titulo, data_inicio, status, slug")
    .eq("organizador_id", user.id)
    .order("criado_em", { ascending: false });

  const totalEventos = (eventos ?? []).length;
  const temPlano = await organizadorTemPlanoAtivo(user.id);
  const limiteBloqueado = !temPlano && totalEventos >= LIMITE_GRATIS;

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/painel" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0, minWidth: 130 }}>
            <img src="/ingressa_logo_header.png" alt="Ingressa" width={130} style={{ display: "block", height: "auto" }} />
          </Link>
          {limiteBloqueado ? (
            <span style={{ padding: "10px 20px", background: T.line, color: T.muted, borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: fontBody, cursor: "not-allowed" }}>
              + Novo evento
            </span>
          ) : (
            <Link href="/painel/eventos/novo" style={{ padding: "10px 20px", background: T.coral, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600, fontFamily: fontBody }}>
              + Novo evento
            </Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, color: T.ink, margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          Meus eventos
        </h1>

        {limiteBloqueado && (
          <div style={{ background: "#FFF8F0", border: `1px solid #FFD9A0`, borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#7A4500", margin: "0 0 2px" }}>Limite de eventos gratuitos atingido</p>
              <p style={{ fontSize: 13, color: "#996633", margin: 0 }}>
                Você usou seus {LIMITE_GRATIS} eventos gratuitos. Planos com mais eventos chegam em breve — aguarde novidades!
              </p>
            </div>
          </div>
        )}

        {(!eventos || eventos.length === 0) ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎪</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: T.ink2, margin: "0 0 8px" }}>Nenhum evento ainda</p>
            <p style={{ fontSize: 15, margin: "0 0 24px" }}>Crie seu primeiro evento e comece a vender ingressos.</p>
            <Link href="/painel/eventos/novo" style={{ padding: "12px 28px", background: T.coral, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 600 }}>
              Criar evento
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {eventos.map((ev) => {
              const data = new Date(ev.data_inicio).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
              const st = STATUS_LABEL[ev.status] ?? STATUS_LABEL.rascunho;
              return (
                <Link key={ev.id} href={`/painel/eventos/${ev.id}`} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "18px 24px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px", fontFamily: fontDisplay }}>{ev.titulo}</p>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{data}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: `${st.color}18`, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

