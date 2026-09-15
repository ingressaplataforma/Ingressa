import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CarteiraClient from "./CarteiraClient";
import LogoutButton from "@/app/painel/LogoutButton";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: comprador }, { data: org }] = await Promise.all([
    supabase.from("comprador").select("nome").eq("id", user.id).maybeSingle(),
    supabase.from("organizador").select("id").eq("id", user.id).maybeSingle(),
  ]);

  if (!comprador) redirect("/entrar");

  const temPerfilOrganizador = !!org;

  const { data: ingressos } = await supabase
    .from("ingresso")
    .select("id, codigo, token_assinado, status, criado_em, lote:lote_id(nome), evento:evento_id(titulo, data_inicio, local_nome, slug)")
    .eq("comprador_id", user.id)
    .order("criado_em", { ascending: false });

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 20, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {temPerfilOrganizador && (
              <Link href="/painel" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>
                Painel de organizador
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(36px,5vw,64px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>Minha carteira</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,38px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 32px" }}>
          Olá, {comprador.nome}!
        </h1>

        <CarteiraClient ingressos={ingressos ?? []} />
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
