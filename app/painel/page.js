import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import { T } from "../../lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: org } = await supabase
    .from("organizador")
    .select("nome")
    .eq("id", user.id)
    .maybeSingle();

  // Usuário logado sem perfil de organizador (ex: Google sem completar cadastro)
  if (!org) redirect("/completar-cadastro");

  const nome = org.nome || user.email;

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 20, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px,6vw,72px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>Painel do organizador</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(28px,4vw,42px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 14px" }}>
          Olá, {nome}!
        </h1>
        <p style={{ fontSize: 17, color: T.ink2, lineHeight: 1.6, maxWidth: 560, margin: "0 0 48px" }}>
          Sua conta está ativa. Em breve você poderá criar e gerenciar eventos aqui.
        </p>

        <div style={{ background: T.panel, borderRadius: 20, border: `1px solid ${T.line}`, padding: "32px", maxWidth: 480, opacity: 0.6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 10 }}>Em breve</div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: "0 0 10px" }}>Criar evento</h2>
          <p style={{ fontSize: 14.5, color: T.ink2, margin: 0, lineHeight: 1.55 }}>
            Nome, data, local, lotes e taxa de ingresso — tudo em poucos passos.
          </p>
          <button disabled style={{ marginTop: 20, padding: "12px 20px", background: T.muted, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "not-allowed", fontFamily: fontBody }}>
            Criar evento
          </button>
        </div>
      </main>
    </div>
  );
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
      <rect x="1" y="6" width="28" height="18" rx="5" fill={T.ink} />
      <circle cx="1" cy="15" r="3.4" fill={T.surface} />
      <circle cx="29" cy="15" r="3.4" fill={T.surface} />
      <line x1="15" y1="9" x2="15" y2="21" stroke="#FF5A5F" strokeWidth="2.2" strokeDasharray="2 2.4" strokeLinecap="round" />
    </svg>
  );
}
