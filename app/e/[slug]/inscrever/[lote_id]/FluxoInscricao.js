"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import QrCode from "@/app/components/QrCode";
import { T, BRL } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function FluxoInscricao({
  loteId, loteNome, precoCents, eventoTitulo, eventoSlug, dataInicio, localNome, esgotado, temComprador,
}) {
  const [aba, setAba] = useState("cadastro"); // 'cadastro' | 'login'
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState(temComprador ? "confirmar" : "form"); // 'form' | 'confirmar' | 'carregando' | 'sucesso' | 'aguardar_email'
  const [ingresso, setIngresso] = useState(null);

  const dataFmt = new Date(dataInicio).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  async function chamarAPI() {
    const res = await fetch("/api/inscrever", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lote_id: loteId }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 409) setErro("Este lote foi esgotado. Tente outro.");
      else setErro(json.erro || "Erro ao registrar inscrição. Tente novamente.");
      setEstado(temComprador ? "confirmar" : "form");
      return;
    }
    setIngresso(json);
    setEstado("sucesso");
  }

  async function handleCadastro(e) {
    e.preventDefault();
    setErro("");
    setEstado("carregando");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErro(error.message === "User already registered" ? "E-mail já cadastrado. Use a aba 'Já tenho conta'." : error.message);
      setEstado("form");
      return;
    }

    if (!data.session) {
      // Confirmação de e-mail habilitada — não é possível concluir agora
      setEstado("aguardar_email");
      return;
    }

    // Criar perfil de comprador
    await supabase.from("comprador").upsert({ id: data.user.id, nome });
    await chamarAPI();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setEstado("carregando");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setEstado("form");
      return;
    }

    // Garantir perfil de comprador
    const { data: comp } = await supabase.from("comprador").select("nome").eq("id", data.user.id).maybeSingle();
    if (!comp) {
      // Usuário existente sem perfil de comprador (ex: organizador comprando ingresso)
      // Criar com nome dos metadados ou prefixo do e-mail
      const nomeInferido = data.user.user_metadata?.nome || data.user.user_metadata?.full_name || data.user.email.split("@")[0];
      await supabase.from("comprador").upsert({ id: data.user.id, nome: nomeInferido });
    }

    await chamarAPI();
  }

  async function handleConfirmar() {
    setErro("");
    setEstado("carregando");
    await chamarAPI();
  }

  if (esgotado) {
    return (
      <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>😔</p>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, color: T.ink, margin: "0 0 12px" }}>Lote esgotado</h2>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px" }}>Não há mais vagas para <strong>{loteNome}</strong>.</p>
          <Link href={`/e/${eventoSlug}`} style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>Ver outros lotes</Link>
        </div>
      </PaginaBase>
    );
  }

  if (estado === "aguardar_email") {
    return (
      <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ width: 56, height: 56, background: T.mint, borderRadius: 99, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="#fff"/></svg>
          </div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 22, color: T.ink, margin: "0 0 12px" }}>Confirme seu e-mail</h2>
          <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
            Enviamos um link de confirmação para <strong>{email}</strong>. Após confirmar, volte aqui e entre com sua conta para concluir a inscrição.
          </p>
          <Link href={`/e/${eventoSlug}`} style={{ color: T.coral, fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
            Voltar ao evento
          </Link>
        </div>
      </PaginaBase>
    );
  }

  if (estado === "sucesso") {
    return (
      <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
        <div style={{ textAlign: "center", padding: "32px 24px" }}>
          <div style={{ width: 56, height: 56, background: T.mint, borderRadius: 99, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, color: T.ink, margin: "0 0 6px" }}>Inscrição confirmada!</h2>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>{loteNome} · {eventoTitulo}</p>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${T.line}`, boxShadow: "0 8px 24px -8px rgba(26,16,53,0.15)" }}>
              <QrCode value={ingresso.token} size={220} />
            </div>
          </div>

          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 4px" }}>Código</p>
          <code style={{ fontSize: 13, color: T.ink2, background: T.panel, padding: "4px 12px", borderRadius: 6, display: "inline-block", marginBottom: 28 }}>
            {ingresso.codigo.slice(0, 8).toUpperCase()}
          </code>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/meus-ingressos" style={{ padding: "12px 24px", background: T.ink, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Minha carteira
            </Link>
            <Link href={`/e/${eventoSlug}`} style={{ padding: "12px 24px", background: T.panel, color: T.ink, borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Voltar ao evento
            </Link>
          </div>
        </div>
      </PaginaBase>
    );
  }

  return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      {/* Resumo */}
      <div style={{ background: T.panel, borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 4px" }}>Você está se inscrevendo em</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{eventoTitulo}</p>
        <p style={{ fontSize: 14, color: T.ink2, margin: 0 }}>
          {loteNome} · {precoCents === 0 ? "Gratuito" : BRL(precoCents / 100)} · {dataFmt}
        </p>
      </div>

      {estado === "confirmar" ? (
        <>
          <p style={{ fontSize: 15, color: T.ink2, margin: "0 0 20px" }}>Você já está logado. Confirme para gerar seu ingresso.</p>
          {erro && <ErroBox texto={erro} />}
          <button
            onClick={handleConfirmar}
            style={{ width: "100%", padding: "14px", background: T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}
          >
            Confirmar inscrição
          </button>
        </>
      ) : (
        <>
          {/* Abas */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: T.panel, borderRadius: 10, padding: 4 }}>
            {[["cadastro", "Criar conta"], ["login", "Já tenho conta"]].map(([k, label]) => (
              <button key={k} onClick={() => { setAba(k); setErro(""); }} style={{ flex: 1, padding: "10px", background: aba === k ? "#fff" : "transparent", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, color: aba === k ? T.ink : T.muted, cursor: "pointer", fontFamily: fontBody, boxShadow: aba === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
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
              <Botao texto="Criar conta e inscrever-se" carregando={estado === "carregando"} />
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <Campo label="E-mail" type="email" value={email} onChange={setEmail} required />
              <Campo label="Senha" type="password" value={senha} onChange={setSenha} required />
              <Botao texto="Entrar e inscrever-se" carregando={estado === "carregando"} />
            </form>
          )}
        </>
      )}
    </PaginaBase>
  );
}

function PaginaBase({ eventoTitulo, eventoSlug, children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href={`/e/${eventoSlug}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 24, color: T.muted, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {eventoTitulo}
        </Link>
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(24px,5vw,36px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            Inscrição
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, minLength }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
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
    <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 16 }}>
      {texto}
    </div>
  );
}
