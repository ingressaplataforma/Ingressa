import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { T, BRL } from "@/lib/tokens";
import { BotaoAssinar, BotaoCancelar, BotaoPagarAgora } from "./BotoesPlano";
import { PLANOS } from "@/lib/planos-catalogo";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const STATUS_LABEL = {
  ativa:        { texto: "Ativo",              cor: T.mint },
  em_graca:     { texto: "Em graça",           cor: "#F39C12" },
  inadimplente: { texto: "Inadimplente",       cor: "#E74C3C" },
  cancelada:    { texto: "Cancelado",          cor: T.muted },
  pendente:     { texto: "Aguard. pagamento",  cor: "#F39C12" },
};

const catGratis     = PLANOS.find((p) => p.id === "gratis");
const catRecorrente = PLANOS.find((p) => p.id === "recorrente");
const planoEmBreve  = PLANOS.filter((p) => !p.disponivel);

export default async function PlanoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: plano }, { data: assinatura }] = await Promise.all([
    supabase
      .from("plano")
      .select("id, nome, preco_cents")
      .eq("ativo", true)
      .order("criado_em")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assinatura")
      .select("id, status, url_pagamento, inicio, proximo_vencimento, graca_ate")
      .eq("organizador_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const assinaturaAtiva = assinatura &&
    ["ativa", "em_graca", "pendente"].includes(assinatura.status);

  const canceladaComAcesso = assinatura?.status === "cancelada" &&
    assinatura.proximo_vencimento &&
    new Date(assinatura.proximo_vencimento) > new Date();

  const temPlanoAtivo = assinaturaAtiva || canceladaComAcesso;

  const { texto: statusTexto, cor: statusCor } =
    STATUS_LABEL[assinatura?.status] ?? {};

  function fmtData(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/painel" style={{ fontSize: 14, color: T.muted, textDecoration: "none" }}>
            ← Painel
          </Link>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.coral }}>Plano</span>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(40px,6vw,64px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 8 }}>Plano Ingressa</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,38px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 40px" }}>
          Seu plano de organizador
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, maxWidth: 640 }}>

          {/* ─────────────────────────────────────────────────── */}
          {/* ESTADO A: sem assinatura ativa                      */}
          {/* ─────────────────────────────────────────────────── */}
          {!temPlanoAtivo && (
            <>
              {/* Card: Grátis — plano atual */}
              <div style={{ background: "#fff", borderRadius: 20, border: `2px solid ${T.line}`, padding: "28px 32px", position: "relative" }}>
                <span style={{ position: "absolute", top: 20, right: 24, background: T.mint + "22", color: T.mint, fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 99 }}>
                  Plano atual
                </span>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {catGratis.nome}
                </p>
                <p style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 600, color: T.ink, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {catGratis.preco}
                  <span style={{ fontSize: 16, fontWeight: 400, color: T.muted }}>/mês</span>
                </p>
                <ul style={{ margin: "16px 0 0", padding: "0 0 0 18px", color: T.ink2, fontSize: 14, lineHeight: 2 }}>
                  {catGratis.beneficios.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>

              {/* Card: Recorrente — assinar */}
              <div style={{ background: T.ink, borderRadius: 20, padding: "28px 32px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.coral, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {plano ? plano.nome : catRecorrente.nome}
                </p>
                <p style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 600, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.02em" }}>
                  {plano ? (
                    <>
                      {BRL(plano.preco_cents / 100)}
                      <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>/mês</span>
                    </>
                  ) : (
                    <>
                      {catRecorrente.preco}
                      <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>{catRecorrente.unidade}</span>
                    </>
                  )}
                </p>
                <ul style={{ margin: "0 0 24px", padding: "0 0 0 18px", color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 2 }}>
                  {catRecorrente.beneficios.map((b) => <li key={b}>{b}</li>)}
                </ul>
                {plano ? (
                  <BotaoAssinar planoId={plano.id} dark />
                ) : (
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    Disponível em breve — fique atento ao lançamento.
                  </p>
                )}
              </div>

              {/* Inadimplente: assinatura anterior bloqueada */}
              {assinatura?.status === "inadimplente" && (
                <div style={{ background: "#FFF5F5", borderRadius: 16, border: "1px solid #FFD0D0", padding: "20px 24px" }}>
                  <p style={{ fontSize: 14, color: "#E74C3C", fontWeight: 600, margin: "0 0 12px" }}>
                    Acesso bloqueado por inadimplência.
                  </p>
                  {plano && <BotaoAssinar planoId={plano.id} />}
                </div>
              )}
            </>
          )}

          {/* ─────────────────────────────────────────────────── */}
          {/* ESTADO B: assinatura ativa / em_graça / pendente    */}
          {/* ─────────────────────────────────────────────────── */}
          {temPlanoAtivo && (
            <>
              {/* Card: plano pago ativo */}
              <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "28px 32px", boxShadow: "0 8px 24px -16px rgba(26,16,53,0.12)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.coral, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {plano?.nome ?? catRecorrente.nome}
                    </p>
                    <p style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>
                      {plano ? (
                        <>
                          {BRL(plano.preco_cents / 100)}
                          <span style={{ fontSize: 16, fontWeight: 400, color: T.muted }}>/mês</span>
                        </>
                      ) : "—"}
                    </p>
                  </div>
                  {statusTexto && (
                    <span style={{ background: statusCor + "22", color: statusCor, fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>
                      {statusTexto}
                    </span>
                  )}
                </div>

                <ul style={{ margin: "0 0 24px", padding: "0 0 0 18px", color: T.ink2, fontSize: 14, lineHeight: 1.9 }}>
                  {catRecorrente.beneficios.map((b) => <li key={b}>{b}</li>)}
                </ul>

                {assinatura?.status === "pendente" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 14, color: T.ink2, margin: 0 }}>
                      Assinatura criada. Efetue o pagamento para ativar.
                    </p>
                    {assinatura.url_pagamento && (
                      <BotaoPagarAgora url={assinatura.url_pagamento} />
                    )}
                  </div>
                )}

                {assinatura?.status === "ativa" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                      Próxima cobrança:{" "}
                      <strong style={{ color: T.ink }}>{fmtData(assinatura.proximo_vencimento)}</strong>
                    </p>
                    <BotaoCancelar acessoAte={assinatura.proximo_vencimento} />
                  </div>
                )}

                {assinatura?.status === "em_graca" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 14, color: "#F39C12", margin: 0, fontWeight: 600 }}>
                      Pagamento em atraso. Acesso garantido até {fmtData(assinatura.graca_ate)}.
                    </p>
                    {assinatura.url_pagamento && (
                      <BotaoPagarAgora url={assinatura.url_pagamento} />
                    )}
                    <BotaoCancelar acessoAte={assinatura.proximo_vencimento} />
                  </div>
                )}

                {canceladaComAcesso && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                      Plano cancelado. Acesso ativo até {fmtData(assinatura.proximo_vencimento)}.
                    </p>
                    {plano && <BotaoAssinar planoId={plano.id} label="Renovar plano" />}
                  </div>
                )}
              </div>

              {/* Detalhes da assinatura */}
              <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "20px 24px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.ink2, margin: "0 0 12px" }}>Detalhes da assinatura</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <tbody>
                    <InfoRow label="Status" value={statusTexto ?? assinatura?.status} />
                    <InfoRow label="Início" value={fmtData(assinatura?.inicio)} />
                    <InfoRow label="Próximo vencimento" value={fmtData(assinatura?.proximo_vencimento)} />
                    {assinatura?.graca_ate && (
                      <InfoRow label="Graça até" value={fmtData(assinatura.graca_ate)} />
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────── */}
          {/* PRÓXIMOS PLANOS — sempre visíveis, informativos     */}
          {/* ─────────────────────────────────────────────────── */}
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 16px" }}>
              Próximos planos
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {planoEmBreve.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: `1px solid ${T.line}`,
                    padding: "20px 22px",
                    position: "relative",
                    opacity: 0.82,
                  }}
                >
                  <span style={{
                    position: "absolute", top: 14, right: 14,
                    fontSize: 10, fontWeight: 700, color: T.ink2,
                    background: T.surface, border: `1px solid ${T.line}`,
                    padding: "2px 8px", borderRadius: 99,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    Em breve
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.ink, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {p.nome}
                  </p>
                  <p style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
                    {p.preco}
                  </p>
                  <p style={{ fontSize: 12, color: T.muted, margin: "0 0 14px" }}>{p.unidade}</p>
                  <ul style={{ margin: "0 0 16px", padding: "0 0 0 16px", color: T.ink2, fontSize: 13, lineHeight: 1.9 }}>
                    {p.beneficios.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                  <div style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.muted,
                    border: `1px solid ${T.line}`,
                    background: "transparent",
                    cursor: "default",
                  }}>
                    Em breve
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
      <td style={{ padding: "8px 0", color: T.muted, width: "45%" }}>{label}</td>
      <td style={{ padding: "8px 0", color: T.ink, fontWeight: 500 }}>{value}</td>
    </tr>
  );
}
