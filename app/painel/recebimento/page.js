import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FormRecebimento from "./FormRecebimento";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function RecebimentoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: org } = await supabase
    .from("organizador")
    .select("nome, gateway_recipient_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!org) redirect("/completar-cadastro");

  const configurado = !!org.gateway_recipient_id;

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
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>Configuração financeira</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 10px" }}>
          Configurar recebimento
        </h1>
        <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.6, maxWidth: 560, margin: "0 0 36px" }}>
          Para vender ingressos pagos, seu perfil precisa estar registrado como recebedor no Asaas.
          O dinheiro da venda vai diretamente para sua carteira Asaas.
        </p>

        {configurado ? (
          <div style={{ background: `${T.mint}18`, border: `1px solid ${T.mint}`, borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 40, height: 40, background: T.mint, borderRadius: 99, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 6px" }}>Recebimento configurado</p>
              <p style={{ fontSize: 14, color: T.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
                Seus ingressos pagos já podem ser vendidos. O split é feito automaticamente a cada venda.
              </p>
              <Link href="/painel/eventos" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>
                Ir para meus eventos →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: "#FFF8EC", border: "1px solid #F5C842", borderRadius: 12, padding: "14px 18px", marginBottom: 28, fontSize: 14, color: "#7A5C00", lineHeight: 1.5 }}>
              <strong>Sandbox (testes).</strong> Os dados abaixo são fictícios e servem apenas para testar o fluxo.
              Em produção, usar CPF/CNPJ e dados bancários reais do organizador.
              {/* R$ 12,90 cobrado pelo Asaas por subconta — plataforma absorve por ora. */}
            </div>

            <FormRecebimento organizadorId={user.id} nomeAtual={org.nome} />
          </>
        )}
      </main>
    </div>
  );
}
