import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/lib/tokens";
import FormPerfil from "./FormPerfil";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: org } = await supabase
    .from("organizador")
    .select("nome, bio, whatsapp, email_contato, foto_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!org) redirect("/completar-cadastro");

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/painel" style={{ color: T.muted, textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Painel
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(36px,5vw,60px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>Seu perfil</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 10px" }}>
          Perfil do organizador
        </h1>
        <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.6, maxWidth: 540, margin: "0 0 36px" }}>
          Essas informações aparecem na página pública do organizador e nos botões de contato da página do evento.
          Preencha apenas o que quiser tornar público.
        </p>

        <FormPerfil inicial={org} />

        <div style={{ marginTop: 24, padding: "16px 20px", background: T.panel, borderRadius: 12, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
          <strong style={{ color: T.ink2 }}>Sua página pública:</strong>{" "}
          <Link href={`/organizador/${user.id}`} target="_blank" style={{ color: T.coral, textDecoration: "none" }}>
            /organizador/{user.id.slice(0, 8)}…
          </Link>
        </div>
      </main>
    </div>
  );
}
