import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/app/painel/LogoutButton";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function EscolherModoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: org }, { data: cmp }] = await Promise.all([
    supabase.from("organizador").select("nome").eq("id", user.id).maybeSingle(),
    supabase.from("comprador").select("nome").eq("id", user.id).maybeSingle(),
  ]);

  // Se não tem os dois perfis, redireciona para o lugar certo
  if (org && !cmp) redirect("/painel");
  if (cmp && !org) redirect("/meus-ingressos");
  if (!org && !cmp) redirect("/completar-cadastro");

  const nome = org.nome || cmp.nome || user.email;

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: T.ink, textDecoration: "none", letterSpacing: "-0.02em" }}>
            Ingressa
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(40px,6vw,72px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Bem-vindo de volta
        </p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,38px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 10px", textAlign: "center" }}>
          Olá, {nome}!
        </h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "0 0 48px", textAlign: "center" }}>
          Com o que você quer trabalhar agora?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, width: "100%", maxWidth: 620 }}>
          <Link
            href="/painel"
            style={{ background: T.ink, borderRadius: 20, padding: "32px 36px", textDecoration: "none", display: "block", transition: "opacity 0.15s" }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>🎪</div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>
              Painel do organizador
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
              Crie e gerencie seus eventos.
            </p>
          </Link>

          <Link
            href="/meus-ingressos"
            style={{ background: T.coral, borderRadius: 20, padding: "32px 36px", textDecoration: "none", display: "block", transition: "opacity 0.15s" }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>🎟️</div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>
              Meus ingressos
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.5 }}>
              Veja os ingressos que você comprou.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
