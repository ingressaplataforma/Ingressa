"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BotaoGoogle from "@/app/components/BotaoGoogle";
import QrCode from "@/app/components/QrCode";
import { T, BRL } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// ── Validação de CPF (dígitos verificadores) ──────────────────────────
function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += parseInt(d[i]) * (10 - i);
  let r1 = s1 % 11;
  if (r1 < 2) r1 = 0; else r1 = 11 - r1;
  if (r1 !== parseInt(d[9])) return false;
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += parseInt(d[i]) * (11 - i);
  let r2 = s2 % 11;
  if (r2 < 2) r2 = 0; else r2 = 11 - r2;
  return r2 === parseInt(d[10]);
}

function mascaraCPF(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function mascaraTelefone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d.length) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const MAX_INGRESSOS = 10;

function donoVazio() { return { nome: "", cpf: "", email: "", telefone: "" }; }

export default function FluxoInscricao({
  loteId, loteNome, precoCents, eventoTitulo, eventoSlug,
  dataInicio, localNome, esgotado, temComprador, compradorDados, disponivel,
}) {
  const [aba, setAba] = useState("cadastro");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  // estado: "form" | "donos" | "carregando" | "sucesso" | "aguardar_email"
  const [estado, setEstado] = useState(temComprador ? "donos" : "form");

  // dados do comprador logado (pode vir de props ou ser preenchido após login)
  const [compradorAtual, setCompradorAtual] = useState(compradorDados);

  // seleção de quantidade e formulário dos extras
  const [quantidade, setQuantidade] = useState(1);
  const [extras, setExtras] = useState([]); // tamanho = quantidade - 1
  const [errosExtras, setErrosExtras] = useState([]);

  // ingressos gerados (array retornado pela API)
  const [ingressosCriados, setIngressosCriados] = useState([]);

  const maxQtd = Math.min(disponivel ?? 1, MAX_INGRESSOS);
  const dataFmt = new Date(dataInicio).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  // URL de retorno após Google OAuth
  function callbackUrl() {
    const next = `/e/${eventoSlug}/inscrever/${loteId}`;
    return `${window.location.origin}/auth/callback?role=comprador&next=${encodeURIComponent(next)}`;
  }

  function handleQuantidade(q) {
    setQuantidade(q);
    // Redimensiona o array de extras
    setExtras((prev) => {
      const novos = [...prev];
      while (novos.length < q - 1) novos.push(donoVazio());
      return novos.slice(0, q - 1);
    });
    setErrosExtras([]);
  }

  function setExtra(i, campo, valor) {
    setExtras((prev) => {
      const novo = [...prev];
      novo[i] = { ...novo[i], [campo]: valor };
      return novo;
    });
  }

  function validarExtras() {
    const cpfNorm = (v) => (v ? v.replace(/\D/g, "") : "");
    const cpfComprador = cpfNorm(compradorAtual?.cpf || "");
    const cpfsVistos = new Set();

    const errs = extras.map((d) => {
      if (!d.nome.trim()) return "Nome obrigatório";
      if (!d.email.trim()) return "E-mail obrigatório";
      if (!d.cpf) return "CPF obrigatório";
      if (!validarCPF(d.cpf)) return "CPF inválido";
      const normalizado = cpfNorm(d.cpf);
      if (cpfComprador && normalizado === cpfComprador) return "CPF igual ao do seu ingresso — use outro CPF";
      if (cpfsVistos.has(normalizado)) return "CPF já usado em outro ingresso deste pedido";
      cpfsVistos.add(normalizado);
      return null;
    });
    setErrosExtras(errs);
    return errs.every((e) => e === null);
  }

  async function chamarAPI() {
    const c = compradorAtual;
    const donos = [
      { nome: c?.nome || "", cpf: c?.cpf || "", email: c?.email || "", telefone: c?.telefone || "" },
      ...extras,
    ];

    const res = await fetch("/api/inscrever", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lote_id: loteId, donos }),
    });
    const json = await res.json();

    if (!res.ok) {
      setErro(
        res.status === 409 && json.erro?.includes("esgotado")
          ? "Este lote foi esgotado. Tente outro."
          : json.erro || "Erro ao registrar inscrição. Tente novamente."
      );
      setEstado("donos");
      return;
    }

    setIngressosCriados(json.ingressos ?? []);
    setEstado("sucesso");
  }

  async function handleConfirmar() {
    setErro("");
    if (!validarExtras()) return;
    setEstado("carregando");
    await chamarAPI();
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
      setErro(error.message === "User already registered" ? "E-mail já cadastrado. Use a aba 'Já tenho conta'." : error.message);
      setEstado("form");
      return;
    }
    if (!data.session) {
      setEstado("aguardar_email");
      return;
    }
    await supabase.from("comprador").upsert({ id: data.user.id, nome });
    setCompradorAtual({ nome, email, cpf: null, telefone: null });
    setEstado("donos");
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
    const { data: comp } = await supabase.from("comprador").select("nome, cpf, telefone").eq("id", data.user.id).maybeSingle();
    if (!comp) {
      const nomeInferido = data.user.user_metadata?.nome || data.user.user_metadata?.full_name || data.user.email.split("@")[0];
      await supabase.from("comprador").upsert({ id: data.user.id, nome: nomeInferido });
      setCompradorAtual({ nome: nomeInferido, email: data.user.email, cpf: null, telefone: null });
    } else {
      setCompradorAtual({ nome: comp.nome, email: data.user.email, cpf: comp.cpf || null, telefone: comp.telefone || null });
    }
    setEstado("donos");
  }

  // ── Estados de tela ──────────────────────────────────────────────────

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

  if (estado === "aguardar_email") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ width: 52, height: 52, background: T.mint, borderRadius: 99, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="#fff"/></svg>
        </div>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, color: T.ink, margin: "0 0 10px" }}>Confirme seu e-mail</h2>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 20px" }}>
          Enviamos um link para <strong>{email}</strong>. Após confirmar, você voltará para concluir a inscrição.
        </p>
        <Link href={`/e/${eventoSlug}`} style={{ fontSize: 14, color: T.coral, fontWeight: 600, textDecoration: "none" }}>Voltar ao evento</Link>
      </div>
    </PaginaBase>
  );

  if (estado === "sucesso") return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <div style={{ textAlign: "center", paddingBottom: 16 }}>
        <div style={{ width: 52, height: 52, background: T.mint, borderRadius: 99, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 22, color: T.ink, margin: "0 0 4px" }}>
          {ingressosCriados.length === 1 ? "Inscrição confirmada!" : `${ingressosCriados.length} inscrições confirmadas!`}
        </h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 24px" }}>{loteNome} · {eventoTitulo}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {ingressosCriados.map((ing, i) => (
            <div key={ing.codigo} style={{ width: "100%" }}>
              {ingressosCriados.length > 1 && (
                <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {i === 0 ? "Seu ingresso" : `Ingresso de ${ing.dono_nome}`}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ background: "#fff", padding: 14, borderRadius: 14, border: `1px solid ${T.line}`, boxShadow: "0 8px 24px -8px rgba(26,16,53,0.15)" }}>
                  <QrCode value={ing.token} size={180} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: T.muted, margin: "8px 0 2px" }}>Código</p>
              <code style={{ fontSize: 12, color: T.ink2, background: T.panel, padding: "3px 10px", borderRadius: 6, display: "inline-block" }}>
                {ing.codigo.slice(0, 8).toUpperCase()}
              </code>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/meus-ingressos" style={{ padding: "11px 22px", background: T.ink, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Minha carteira
          </Link>
          <Link href={`/e/${eventoSlug}`} style={{ padding: "11px 22px", background: T.panel, color: T.ink, borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Voltar ao evento
          </Link>
        </div>
      </div>
    </PaginaBase>
  );

  // ── "form": login/cadastro ───────────────────────────────────────────
  if (estado === "form" || estado === "carregando" && !compradorAtual) return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <ResumoLote loteNome={loteNome} precoCents={precoCents} eventoTitulo={eventoTitulo} dataFmt={dataFmt} />

      <BotaoGoogle label="Continuar com Google" redirectTo={typeof window !== "undefined" ? callbackUrl() : undefined} />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.panel, borderRadius: 10, padding: 4 }}>
        {[["cadastro", "Criar conta"], ["login", "Já tenho conta"]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setAba(k); setErro(""); }}
            style={{ flex: 1, padding: 9, background: aba === k ? "#fff" : "transparent", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, color: aba === k ? T.ink : T.muted, cursor: "pointer", fontFamily: fontBody, boxShadow: aba === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
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

  // ── "donos": seleção de quantidade e formulário de extras ────────────
  const carregandoDonos = estado === "carregando";

  return (
    <PaginaBase eventoTitulo={eventoTitulo} eventoSlug={eventoSlug}>
      <ResumoLote loteNome={loteNome} precoCents={precoCents} eventoTitulo={eventoTitulo} dataFmt={dataFmt} />

      {/* Seleção de quantidade */}
      {maxQtd > 1 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
            Quantos ingressos?
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: maxQtd }, (_, i) => i + 1).map((q) => (
              <button key={q} type="button" onClick={() => handleQuantidade(q)}
                style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${quantidade === q ? T.coral : T.line}`, background: quantidade === q ? `${T.coral}10` : "#fff", color: quantidade === q ? T.coral : T.ink, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: fontBody }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ingresso 1: do próprio comprador */}
      <div style={{ background: T.panel, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.coral, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Ingresso 1 — Seu ingresso
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{compradorAtual?.nome || "—"}</p>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{compradorAtual?.email || "—"}</p>
        {compradorAtual?.cpf && (
          <p style={{ fontSize: 12, color: T.muted, margin: "2px 0 0" }}>CPF: {mascaraCPF(compradorAtual.cpf)}</p>
        )}
      </div>

      {/* Ingressos extras */}
      {extras.map((d, i) => (
        <div key={i} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.ink2, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ingresso {i + 2} — Dono do ingresso
          </p>
          {errosExtras[i] && <ErroBox texto={errosExtras[i]} />}
          <Campo label="Nome completo *" type="text" value={d.nome} onChange={(v) => setExtra(i, "nome", v)} required />
          <Campo label="CPF *" type="text" value={d.cpf}
            onChange={(v) => setExtra(i, "cpf", mascaraCPF(v))} required placeholder="000.000.000-00" maxLength={14} />
          <Campo label="E-mail *" type="email" value={d.email} onChange={(v) => setExtra(i, "email", v)} required />
          <Campo label="Telefone (opcional)" type="tel" value={d.telefone}
            onChange={(v) => setExtra(i, "telefone", mascaraTelefone(v))} placeholder="(00) 00000-0000" />
        </div>
      ))}

      {erro && <ErroBox texto={erro} />}

      <Botao
        texto={quantidade === 1 ? "Confirmar inscrição" : `Confirmar ${quantidade} ingressos`}
        carregando={carregandoDonos}
        onClick={handleConfirmar}
      />
    </PaginaBase>
  );
}

function PaginaBase({ eventoTitulo, eventoSlug, children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href={`/e/${eventoSlug}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 20, color: T.muted, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {eventoTitulo}
        </Link>
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(24px,5vw,34px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Inscrição
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function ResumoLote({ loteNome, precoCents, eventoTitulo, dataFmt }) {
  return (
    <div style={{ background: T.panel, borderRadius: 12, padding: "14px 18px", marginBottom: 22 }}>
      <p style={{ fontSize: 13, color: T.muted, margin: "0 0 3px" }}>Inscrição em</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{eventoTitulo}</p>
      <p style={{ fontSize: 13, color: T.ink2, margin: 0 }}>
        {loteNome} · {precoCents === 0 ? "Gratuito" : BRL(precoCents / 100)} · {dataFmt}
      </p>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, minLength, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
    </div>
  );
}

function Botao({ texto, carregando, onClick }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={carregando}
      style={{ width: "100%", padding: 13, background: carregando ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody, marginTop: 4 }}
    >
      {carregando ? "Aguarde…" : texto}
    </button>
  );
}

function ErroBox({ texto }) {
  return (
    <div style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 14 }}>
      {texto}
    </div>
  );
}
