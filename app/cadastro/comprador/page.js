"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BotaoGoogle from "@/app/components/BotaoGoogle";
import Image from "next/image";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// ── Máscaras ──────────────────────────────────────────────────────────
function mascaraCPF(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

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

export default function CadastroCompradorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cpf: "", telefone: "" });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [adicionando, setAdicionando] = useState(false);
  const [cpfAdicionar, setCpfAdicionar] = useState("");
  const [telefoneAdicionar, setTelefoneAdicionar] = useState("");

  useEffect(() => {
    async function checarSessao() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsuarioLogado(user);
    }
    checarSessao();
  }, []);

  function setcampo(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  function setCpf(e) {
    setForm((f) => ({ ...f, cpf: mascaraCPF(e.target.value) }));
  }

  function setTelefone(e) {
    setForm((f) => ({ ...f, telefone: mascaraTelefone(e.target.value) }));
  }

  // ── Usuário já logado: adicionar perfil de comprador ─────────────────
  async function handleAdicionarPerfil(e) {
    e.preventDefault();
    setErro("");

    if (!validarCPF(cpfAdicionar)) {
      setErro("CPF inválido. Verifique os dígitos e tente novamente.");
      return;
    }

    setAdicionando(true);
    const supabase = createClient();
    const cpfSoDigitos = cpfAdicionar.replace(/\D/g, "");
    const telefoneSoDigitos = telefoneAdicionar.replace(/\D/g, "") || null;

    const { error } = await supabase.from("comprador").upsert({
      id: usuarioLogado.id,
      nome: usuarioLogado.user_metadata?.nome || usuarioLogado.email.split("@")[0],
      email: usuarioLogado.email,
      cpf: cpfSoDigitos,
      telefone: telefoneSoDigitos,
    });

    if (error) {
      setErro(
        error.message?.includes("comprador_cpf_unique")
          ? "Este CPF já está cadastrado em outra conta."
          : error.message?.includes("comprador_cpf_valido")
          ? "CPF inválido — verifique os dígitos."
          : "Erro ao adicionar perfil: " + error.message
      );
      setAdicionando(false);
      return;
    }

    router.push("/meus-ingressos");
    router.refresh();
  }

  // ── Novo cadastro ─────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (!validarCPF(form.cpf)) {
      setErro("CPF inválido. Verifique os dígitos e tente novamente.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome },
        emailRedirectTo: `${window.location.origin}/auth/callback?role=comprador`,
      },
    });

    if (error) {
      setErro(
        error.message === "User already registered"
          ? "Este e-mail já está cadastrado. Tente entrar."
          : error.message
      );
      setCarregando(false);
      return;
    }

    const cpfSoDigitos = form.cpf.replace(/\D/g, "");
    const telefoneSoDigitos = form.telefone.replace(/\D/g, "") || null;

    if (data.session) {
      const { error: upsertErr } = await supabase.from("comprador").upsert({
        id: data.user.id,
        nome: form.nome,
        email: form.email,
        cpf: cpfSoDigitos,
        telefone: telefoneSoDigitos,
      });
      if (upsertErr) {
        setErro(
          upsertErr.message?.includes("comprador_cpf_unique")
            ? "Este CPF já está cadastrado em outra conta."
            : upsertErr.message?.includes("comprador_cpf_valido")
            ? "CPF inválido — verifique os dígitos."
            : "Não foi possível salvar o perfil: " + upsertErr.message
        );
        setCarregando(false);
        return;
      }
      router.push("/meus-ingressos");
      router.refresh();
    } else {
      setMensagem("Verifique seu e-mail e clique no link de confirmação para ativar sua conta.");
      setCarregando(false);
    }
  }

  // ── Tela de confirmação ───────────────────────────────────────────────
  if (mensagem) {
    return (
      <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 99, background: T.mint, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Quase lá!</h2>
          <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.6 }}>{mensagem}</p>
          <Link href="/entrar" style={{ display: "inline-block", marginTop: 24, color: T.coral, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  // ── Usuário já logado: formulário para adicionar CPF ─────────────────
  if (usuarioLogado) {
    return (
      <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <Link href="/" style={{ display: "flex", justifyContent: "center", textDecoration: "none", marginBottom: 36 }}>
            <Image src="/ingressa_logo.png" alt="Ingressa" width={216} height={72} style={{ width: 160, height: "auto" }} priority />
          </Link>
          <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: "center" }}>🎟️</div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: "0 0 10px", textAlign: "center" }}>
              Adicionar perfil de comprador
            </h1>
            <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px", lineHeight: 1.55, textAlign: "center" }}>
              Você já está logado. Informe seu CPF para habilitar a compra de ingressos.
            </p>
            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 18 }}>
                {erro}
              </div>
            )}
            <form onSubmit={handleAdicionarPerfil}>
              <CampoMascarado
                label="CPF"
                placeholder="000.000.000-00"
                value={cpfAdicionar}
                onChange={(e) => setCpfAdicionar(mascaraCPF(e.target.value))}
                required
                inputMode="numeric"
              />
              <CampoMascarado
                label="Telefone (opcional)"
                placeholder="(00) 00000-0000"
                value={telefoneAdicionar}
                onChange={(e) => setTelefoneAdicionar(mascaraTelefone(e.target.value))}
                inputMode="tel"
              />
              <button
                type="submit"
                disabled={adicionando}
                style={{ width: "100%", padding: "14px", background: adicionando ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 16, fontWeight: 600, cursor: adicionando ? "not-allowed" : "pointer", fontFamily: fontBody }}
              >
                {adicionando ? "Adicionando…" : "Habilitar compra de ingressos"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário principal (novo cadastro) ──────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", textDecoration: "none", marginBottom: 36 }}>
          <Image src="/ingressa_logo.png" alt="Ingressa — Ingressos para eventos" width={216} height={72} style={{ width: 160, height: "auto" }} priority />
        </Link>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 6px" }}>
            Criar conta de comprador
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>
            Compre ingressos e acompanhe seus eventos favoritos.
          </p>

          <BotaoGoogle label="Cadastrar com Google" role="comprador" />

          <form onSubmit={handleSubmit}>
            <Campo label="Nome completo" type="text" value={form.nome} onChange={setcampo("nome")} required />
            <div style={{ height: 1, background: T.line, margin: "0 0 18px" }} />
            <CampoMascarado
              label="CPF"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={setCpf}
              required
              inputMode="numeric"
            />
            <CampoMascarado
              label="Telefone (opcional)"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={setTelefone}
              inputMode="tel"
            />
            <div style={{ height: 1, background: T.line, margin: "0 0 18px" }} />
            <Campo label="E-mail" type="email" value={form.email} onChange={setcampo("email")} required />
            <Campo label="Senha (mín. 6 caracteres)" type="password" value={form.senha} onChange={setcampo("senha")} required minLength={6} />

            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 18 }}>
                {erro}{" "}
                {erro.includes("já está cadastrado") && (
                  <Link href="/entrar" style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              style={{ width: "100%", padding: "14px", background: carregando ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 16, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
            >
              {carregando ? "Criando conta…" : "Criar conta"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 15, color: T.muted }}>
          Já tem conta?{" "}
          <Link href="/entrar" style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>
            Entrar
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: T.muted }}>
          Quer criar um evento?{" "}
          <Link href="/cadastro/organizador" style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>
            Criar conta de organizador
          </Link>
        </p>
      </div>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, minLength }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
    </div>
  );
}

function CampoMascarado({ label, placeholder, value, onChange, required, inputMode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
    </div>
  );
}
