"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import QrCode from "@/app/components/QrCode";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// ── Utilities ────────────────────────────────────────────────────────────────

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += parseInt(d[i]) * (10 - i);
  let r1 = s1 % 11; if (r1 < 2) r1 = 0; else r1 = 11 - r1;
  if (r1 !== parseInt(d[9])) return false;
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += parseInt(d[i]) * (11 - i);
  let r2 = s2 % 11; if (r2 < 2) r2 = 0; else r2 = 11 - r2;
  return r2 === parseInt(d[10]);
}

function mascaraCPF(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function mascaraTel(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fmtData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

const inputBase = {
  width: "100%",
  height: 46,
  border: `1.5px solid ${T.line}`,
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 15,
  fontFamily: fontBody,
  color: T.ink,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = { fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 6, display: "block" };

// ── Ingresso card (shared) ───────────────────────────────────────────────────

function IngressoCard({ ing, expandido, onToggle, compacto }) {
  const ev = ing.evento;
  const cancelado = ing.status === "cancelado";
  const usado = ing.status === "usado";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", opacity: cancelado ? 0.6 : 1 }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", padding: compacto ? "14px 20px" : "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: fontBody }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.coral, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {ing.lote?.nome}
            {cancelado && <span style={{ color: T.muted, marginLeft: 8 }}>· Cancelado</span>}
            {usado && <span style={{ color: T.mint, marginLeft: 8 }}>· Utilizado</span>}
          </p>
          <p style={{ fontSize: compacto ? 15 : 17, fontWeight: 600, color: T.ink, margin: "0 0 3px", fontFamily: fontDisplay, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ev?.titulo}
          </p>
          {ing.dono_nome && (
            <p style={{ fontSize: 13, color: T.ink2, margin: "0 0 2px", fontWeight: 600 }}>🎫 {ing.dono_nome}</p>
          )}
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            {fmtData(ev?.data_inicio)}{ev?.local_nome ? ` · ${ev.local_nome}` : ""}
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M5 7.5l5 5 5-5" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expandido && !cancelado && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${T.line}`, boxShadow: "0 4px 20px -8px rgba(26,16,53,0.15)" }}>
            <QrCode value={ing.token_assinado} size={200} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, color: T.muted, margin: "0 0 4px" }}>Código do ingresso</p>
            <code style={{ fontSize: 12, color: T.ink2, background: T.panel, padding: "4px 10px", borderRadius: 6 }}>
              {ing.codigo?.slice(0, 8).toUpperCase()}
            </code>
          </div>
          {ev?.slug && (
            <Link href={`/e/${ev.slug}`} style={{ fontSize: 14, color: T.coral, fontWeight: 600, textDecoration: "none" }}>
              Ver página do evento
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Carteira (próximos) ─────────────────────────────────────────────────

function TabCarteira({ proximos }) {
  const [aberto, setAberto] = useState(null);

  if (proximos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 24px", color: T.muted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: T.ink2, margin: "0 0 8px" }}>Nenhum ingresso futuro</p>
        <p style={{ fontSize: 15, margin: "0 0 24px" }}>Encontre um evento e faça sua inscrição.</p>
        <Link href="/eventos" style={{ color: T.coral, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>Explorar eventos</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {proximos.map((ing) => (
        <IngressoCard
          key={ing.id}
          ing={ing}
          expandido={aberto === ing.id}
          onToggle={() => setAberto(aberto === ing.id ? null : ing.id)}
          compacto={false}
        />
      ))}
    </div>
  );
}

// ── Tab: Histórico (passados) ─────────────────────────────────────────────────

function TabHistorico({ historico }) {
  const [aberto, setAberto] = useState(null);

  if (historico.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 24px", color: T.muted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: T.ink2, margin: 0 }}>Nenhuma inscrição anterior</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {historico.map((ing) => (
        <IngressoCard
          key={ing.id}
          ing={ing}
          expandido={aberto === ing.id}
          onToggle={() => setAberto(aberto === ing.id ? null : ing.id)}
          compacto
        />
      ))}
    </div>
  );
}

// ── Tab: Meus Dados ──────────────────────────────────────────────────────────

function TabDados({ comprador }) {
  const cpfJaDefinido = !!comprador.cpf;
  const [nome, setNome] = useState(comprador.nome);
  const [cpf, setCpf] = useState(comprador.cpf ? mascaraCPF(comprador.cpf) : "");
  const [telefone, setTelefone] = useState(comprador.telefone ? mascaraTel(comprador.telefone) : "");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (!nome.trim()) return setErro("Nome é obrigatório.");

    if (!cpfJaDefinido) {
      const d = cpf.replace(/\D/g, "");
      if (!d) return setErro("CPF é obrigatório.");
      if (!validarCPF(d)) return setErro("CPF inválido — verifique os dígitos.");
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/conta/comprador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpfJaDefinido ? undefined : cpf.replace(/\D/g, ""),
          telefone: telefone.replace(/\D/g, "") || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) return setErro(json.erro ?? "Erro ao salvar.");
      setSucesso(true);
    } catch {
      setErro("Erro de rede. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        <div>
          <label style={labelStyle}>E-mail</label>
          <input value={comprador.email} readOnly style={{ ...inputBase, background: T.panel, color: T.muted, cursor: "not-allowed" }} />
          <p style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>Usado para login — não pode ser alterado aqui.</p>
        </div>

        <div>
          <label style={labelStyle}>Nome completo</label>
          <input
            value={nome}
            onChange={(e) => { setNome(e.target.value); setSucesso(false); }}
            style={inputBase}
            placeholder="Seu nome completo"
            maxLength={120}
          />
        </div>

        <div>
          <label style={labelStyle}>CPF</label>
          <input
            value={cpf}
            readOnly={cpfJaDefinido}
            onChange={cpfJaDefinido ? undefined : (e) => { setCpf(mascaraCPF(e.target.value)); setSucesso(false); }}
            style={{ ...inputBase, ...(cpfJaDefinido ? { background: T.panel, color: T.muted, cursor: "not-allowed" } : {}) }}
            placeholder="000.000.000-00"
          />
          {cpfJaDefinido && (
            <p style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>CPF validado — não pode ser alterado.</p>
          )}
        </div>

        <div>
          <label style={labelStyle}>Telefone <span style={{ fontWeight: 400, color: T.muted }}>(opcional)</span></label>
          <input
            value={telefone}
            onChange={(e) => { setTelefone(mascaraTel(e.target.value)); setSucesso(false); }}
            style={inputBase}
            placeholder="(00) 00000-0000"
          />
        </div>

        {erro && <p style={{ fontSize: 14, color: "#e53e3e", margin: 0 }}>{erro}</p>}
        {sucesso && <p style={{ fontSize: 14, color: T.mint, margin: 0, fontWeight: 600 }}>Dados salvos!</p>}

        <button
          type="submit"
          disabled={salvando}
          style={{ height: 48, borderRadius: 12, background: salvando ? T.muted : T.coral, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer", fontFamily: fontBody, transition: "background 0.15s" }}
        >
          {salvando ? "Salvando…" : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}

// ── Tab: Segurança ───────────────────────────────────────────────────────────

function TabSeguranca({ isGoogleUser }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  if (isGoogleUser) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: "28px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.panel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {/* Google logo */}
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 6px" }}>Você entra com Google</p>
            <p style={{ fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.55 }}>
              Sua autenticação é gerenciada pelo Google. Para alterar a senha, acesse as configurações de segurança da sua conta Google.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function handleSenha(e) {
    e.preventDefault();
    setErro("");
    setSucesso(false);
    if (novaSenha.length < 8) return setErro("A nova senha deve ter pelo menos 8 caracteres.");
    if (novaSenha !== confirmar) return setErro("As senhas não coincidem.");

    setSalvando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) return setErro(error.message ?? "Erro ao alterar a senha.");
      setSucesso(true);
      setNovaSenha("");
      setConfirmar("");
    } catch {
      setErro("Erro de rede. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSenha} style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>Nova senha</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => { setNovaSenha(e.target.value); setSucesso(false); }}
            style={inputBase}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label style={labelStyle}>Confirmar nova senha</label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => { setConfirmar(e.target.value); setSucesso(false); }}
            style={inputBase}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
        </div>

        {erro && <p style={{ fontSize: 14, color: "#e53e3e", margin: 0 }}>{erro}</p>}
        {sucesso && <p style={{ fontSize: 14, color: T.mint, margin: 0, fontWeight: 600 }}>Senha alterada com sucesso!</p>}

        <button
          type="submit"
          disabled={salvando}
          style={{ height: 48, borderRadius: 12, background: salvando ? T.muted : T.coral, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer", fontFamily: fontBody }}
        >
          {salvando ? "Alterando…" : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "carteira", label: "Carteira" },
  { id: "historico", label: "Histórico" },
  { id: "dados", label: "Meus dados" },
  { id: "seguranca", label: "Segurança" },
];

export default function ContaClient({ proximos, historico, comprador, isGoogleUser }) {
  const [aba, setAba] = useState("carteira");

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: `1px solid ${T.line}`, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: aba === t.id ? 700 : 500,
              color: aba === t.id ? T.ink : T.muted,
              borderBottom: aba === t.id ? `2px solid ${T.ink}` : "2px solid transparent",
              whiteSpace: "nowrap",
              fontFamily: fontBody,
              marginBottom: -1,
              transition: "color 0.15s, border-color 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.label}
            {t.id === "carteira" && proximos.length > 0 && (
              <span style={{ background: T.coral, color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 6px", lineHeight: 1.4 }}>
                {proximos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {aba === "carteira" && <TabCarteira proximos={proximos} />}
      {aba === "historico" && <TabHistorico historico={historico} />}
      {aba === "dados" && <TabDados comprador={comprador} />}
      {aba === "seguranca" && <TabSeguranca isGoogleUser={isGoogleUser} />}
    </div>
  );
}
