import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

  // Usuário logado sem perfil de organizador
  if (!org) {
    // Comprador puro → carteira
    const { data: comp } = await supabase.from("comprador").select("id").eq("id", user.id).maybeSingle();
    if (comp) redirect("/meus-ingressos");
    // Sem perfil nenhum → completar cadastro de organizador
    redirect("/completar-cadastro");
  }

  const nome = org.nome || user.email;

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <Image src="/ingressa_logo_header.png" alt="Ingressa" width={130} height={31} style={{ display: "block" }} />
          </Link>
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
          Crie e gerencie seus eventos a partir daqui.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {/* Card principal: Meus eventos */}
          <Link href="/painel/eventos" style={{ background: T.ink, borderRadius: 20, padding: "28px 32px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>🎪</div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>Meus eventos</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>
              Veja, crie e publique seus eventos.
            </p>
          </Link>

          {/* Criar novo evento */}
          <Link href="/painel/eventos/novo" style={{ background: T.coral, borderRadius: 20, padding: "28px 32px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>✨</div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>Novo evento</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0 }}>
              Configure título, datas, local e lotes.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}

