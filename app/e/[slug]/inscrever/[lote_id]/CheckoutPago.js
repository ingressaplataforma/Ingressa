"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BotaoGoogle from "@/app/components/BotaoGoogle";
import QrCode from "@/app/components/QrCode";
import { T, BRL } from "@/lib/tokens";
import { calcularTaxa, montarValoresPedido } from "@/lib/taxa";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function CheckoutPago({
  loteId, loteNome, precoCents, eventoTitulo, eventoSlug, dataInicio, localNome,
  esgotado, temComprador,
  aceitaCartao, aceitaBoleto, quemPagaTaxa, recebedorConfigurado,
}) {
  const [aba, setAba] = useState("cadastro");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState(temComprador ? "checkout" : "form");
  const [meio, setMeio] = useState("pix");
  const [resultado, setResultado] = useState(null);

  const dataFmt = new Date(dataInicio).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const { taxaCents, orgRecebeCents, totalCents } = useMemo(
    () => montarValoresPedido({ precoCents, meio, quemPagaTaxa }),
    [precoCents, meio, quemPagaTaxa]
  );

  function callbackUrl() {
    const next = `/e/${eventoSlug}/inscrever/${loteId}`;
    return `${window.location.origin}/auth/callback?role=comprador&next=${encodeURIComponent(next)}`;
  }

  async function chamarCheckout() {
    setErro("");
    setEstado("carregando");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lote_id: loteId, meio }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErro(json.erro || "Erro ao criar cobrança. Tente novamente.");
      setEstado("checkout");
      return;
    }
    setResultado(json);
    if (json.pix_payload) {
      setEstado("aguardar_pix");
    } else {
      setEstado("redirecionando");
      window.location.href = json.invoice_url;
    }
  }

  async function handleCadastro(e) {
    e.preventDefault();
    setErro("");
    setEstado("carregando");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, role: "comprador" }, emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setErro(error.message === "User already registered" ? "E-mail já cadastrado. Use 'Já tenho conta'." : error.message);
      setEstado("form");
      return;
    }
    if (!data.session) { setEstado("aguardar_email"); return; }
    await supabase.from("comprador").upsert({ id: data.user.id, nome });
    setEstado("checkout");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setEstado("carregando");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("E-mail ou senha incorretos."); setEstado("form"); return; }
    const { data: comp } = await supabase.from("comprador").select("nome").eq("id", data.user.id).maybeSingle();
    if (!comp) {
      const nomeInferido = data.user.user_metadata?.nome || data.user.user_metadata?.full_name || data.user.email.split("@")[0];
      await supabase.from("comprador").upsert({ id: data.user.id, nome: nomeInferido });
    }
    setEstado("checkout");
  }

  if (esgotado) return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>😔</p>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 22, color: T.ink, margin: "0 0 10px" }}>Lote esgotado</h2>
        <p style={{ fontSize: 15, color: T.muted, margin: "0 0 20px" }}>Não há mais vagas para <strong>{loteNome}</strong>.</p>
        <Link href={`/e/${eventoSlug}`} style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>Ver outros lotes</Link>
      </div>
    </PaginaBase>
  );

  if (!recebedorConfigurado) return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontSize: 36, marginBottom: 12 }}>🔧</p>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, color: T.ink, margin: "0 0 10px" }}>Vendas indisponíveis</h2>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 20px" }}>
          O organizador ainda não configurou o recebimento. Tente novamente em breve.
        </p>
        <Link href={`/e/${eventoSlug}`} style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>Voltar ao evento</Link>
      </div>
    </PaginaBase>
  );

  if (estado === "aguardar_email") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <IconeCircle cor={T.mint}><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="#fff"/></IconeCircle>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, color: T.ink, margin: "0 0 10px" }}>Confirme seu e-mail</h2>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 20px" }}>
          Enviamos um link para <strong>{email}</strong>. Após confirmar, você voltará para concluir a compra.
        </p>
        <Link href={`/e/${eventoSlug}`} style={{ fontSize: 14, color: T.coral, fontWeight: 600, textDecoration: "none" }}>Voltar ao evento</Link>
      </div>
    </PaginaBase>
  );

  if (estado === "aguardar_pix") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.mint, marginBottom: 6 }}>Pague com Pix</p>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, color: T.ink, margin: "0 0 4px" }}>{BRL(totalCents / 100)}</h2>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>{loteNome} · {eventoTitulo}</p>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ background: "#fff", padding: 14, borderRadius: 14, border: `1px solid ${T.line}`, boxShadow: "0 8px 24px -8px rgba(26,16,53,0.12)" }}>
            <QrCode value={resultado.pix_payload} size={200} />
          </div>
        </div>

        <div style={{ background: T.panel, borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <code style={{ fontSize: 11, color: T.ink2, wordBreak: "break-all", maxWidth: 280 }}>{resultado.pix_payload.slice(0, 60)}…</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(resultado.pix_payload)}
            style={{ fontSize: 12, fontWeight: 600, color: T.coral, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontFamily: fontBody }}
          >
            Copiar
          </button>
        </div>

        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Após o pagamento, seu ingresso será emitido automaticamente.
        </p>

        <Link href="/meus-ingressos" style={{ display: "inline-block", padding: "11px 24px", background: T.ink, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          Minha carteira
        </Link>
      </div>
    </PaginaBase>
  );

  if (estado === "redirecionando") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontSize: 15, color: T.muted }}>Redirecionando para o pagamento…</p>
      </div>
    </PaginaBase>
  );

  // ── Auth form ────────────────────────────────────────────────────────────────
  if (estado === "form" || estado === "carregando") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <ResumoLote loteNome={loteNome} eventoTitulo={eventoTitulo} precoCents={precoCents} dataFmt={dataFmt} />

      <BotaoGoogle label="Continuar com Google" redirectTo={typeof window !== "undefined" ? callbackUrl() : undefined} />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.panel, borderRadius: 10, padding: 4 }}>
        {[["cadastro", "Criar conta"], ["login", "Já tenho conta"]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setAba(k); setErro(""); }}
            style={{ flex: 1, padding: "9px", background: aba === k ? "#fff" : "transparent", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, color: aba === k ? T.ink : T.muted, cursor: "pointer", fontFamily: fontBody }}>
            {label}
          </button>
        ))}
      </div>

      {erro && <ErroBox texto={erro} />}

      {aba === "cadastro" ? (
        <form onSubmit={handleCadastro}>
          <Campo label="Seu nome" type="text" value={nome} onChange={setNome} required />
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} required />
          <Campo label="Senha (mín. 6 caracteres)" type="password" value={senha} onChange={setSenha} required minLength={6} />
          <Botao texto="Criar conta e continuar" carregando={estado === "carregando"} />
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} required />
          <Campo label="Senha" type="password" value={senha} onChange={setSenha} required />
          <Botao texto="Entrar e continuar" carregando={estado === "carregando"} />
        </form>
      )}
    </PaginaBase>
  );

  // ── Checkout: escolha de meio + decomposição de preço ───────────────────────
  return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <ResumoLote loteNome={loteNome} eventoTitulo={eventoTitulo} precoCents={precoCents} dataFmt={dataFmt} />

      {/* Meios disponíveis */}
      <p style={{ fontSize: 13, fontWeight: 600, color: T.ink2, margin: "0 0 10px" }}>Forma de pagamento</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <MeioRow label="Pix" sublabel="Confirmação imediata" selecionado={meio === "pix"} onClick={() => setMeio("pix")} />
        {aceitaCartao && <MeioRow label="Cartão de crédito" sublabel="Parcelamento via Asaas" selecionado={meio === "cartao"} onClick={() => setMeio("cartao")} />}
        {aceitaBoleto && <MeioRow label="Boleto bancário" sublabel="Vence em 1 dia útil" selecionado={meio === "boleto"} onClick={() => setMeio("boleto")} />}
      </div>

      {/* Decomposição de preço */}
      <div style={{ background: T.panel, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <LinhaPreco label="Ingresso" valor={BRL(precoCents / 100)} />
        {quemPagaTaxa === "comprador" ? (
          <LinhaPreco label={`Taxa de serviço (${meio === "pix" ? "3%" : "2,5%"})`} valor={`+ ${BRL(taxaCents / 100)}`} />
        ) : (
          <LinhaPreco label="Taxa absorvida pelo organizador" valor="— incluída" muted />
        )}
        <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 10, paddingTop: 10 }}>
          <LinhaPreco label="Total" valor={BRL(totalCents / 100)} negrito />
        </div>
      </div>

      {erro && <ErroBox texto={erro} />}

      <button
        type="button"
        disabled={estado === "carregando"}
        onClick={chamarCheckout}
        style={{ width: "100%", padding: "13px", background: estado === "carregando" ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: estado === "carregando" ? "not-allowed" : "pointer", fontFamily: fontBody }}
      >
        {estado === "carregando" ? "Aguarde…" : meio === "pix" ? `Gerar QR Pix — ${BRL(totalCents / 100)}` : `Pagar com ${meio === "cartao" ? "cartão" : "boleto"} — ${BRL(totalCents / 100)}`}
      </button>

      <p style={{ fontSize: 12, color: T.muted, textAlign: "center", marginTop: 12 }}>
        Ao pagar, você confirma a compra do ingresso para <strong>{eventoTitulo}</strong>.
      </p>
    </PaginaBase>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function PaginaBase({ eventoTitulo, eventoSlug, children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href={`/e/${eventoSlug}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 20, color: T.muted, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {eventoTitulo}
        </Link>
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(24px,5vw,34px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 18px", letterSpacing: "-0.02em" }}>Comprar ingresso</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function ResumoLote({ loteNome, eventoTitulo, precoCents, dataFmt }) {
  return (
    <div style={{ background: T.panel, borderRadius: 12, padding: "14px 18px", marginBottom: 22 }}>
      <p style={{ fontSize: 13, color: T.muted, margin: "0 0 3px" }}>Ingresso para</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{eventoTitulo}</p>
      <p style={{ fontSize: 13, color: T.ink2, margin: 0 }}>{loteNome} · {BRL(precoCents / 100)} · {dataFmt}</p>
    </div>
  );
}

function MeioRow({ label, sublabel, selecionado, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${selecionado ? T.ink : T.line}`, background: selecionado ? "#F6F4FF" : "#fff", cursor: "pointer", textAlign: "left", fontFamily: fontBody, width: "100%" }}>
      <div style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${selecionado ? T.ink : T.line}`, background: selecionado ? T.ink : "#fff", flexShrink: 0, display: "grid", placeItems: "center" }}>
        {selecionado && <div style={{ width: 8, height: 8, borderRadius: 99, background: "#fff" }} />}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>{sublabel}</p>
      </div>
    </button>
  );
}

function LinhaPreco({ label, valor, negrito, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: muted ? T.muted : T.ink, fontWeight: negrito ? 600 : 400, marginBottom: 6 }}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

function IconeCircle({ cor, children }) {
  return (
    <div style={{ width: 52, height: 52, background: cor, borderRadius: 99, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{children}</svg>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, minLength }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} minLength={minLength}
        style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }} />
    </div>
  );
}

function Botao({ texto, carregando }) {
  return (
    <button type="submit" disabled={carregando} style={{ width: "100%", padding: "13px", background: carregando ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody, marginTop: 4 }}>
      {carregando ? "Aguarde…" : texto}
    </button>
  );
}

function ErroBox({ texto }) {
  return (
    <div style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 14 }}>{texto}</div>
  );
}
