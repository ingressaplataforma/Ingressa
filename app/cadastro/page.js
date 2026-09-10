"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { T } from "../../lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", documento: "", telefone: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  function set(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setCarregando(true);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome, documento: form.documento, telefone: form.telefone || null },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    if (data.session) {
      // Confirmação de e-mail desabilitada — cria a linha do organizador imediatamente
      await supabase.from("organizador").upsert({
        id: data.user.id,
        nome: form.nome,
        documento: form.documento,
        telefone: form.telefone || null,
      });
      router.push("/painel");
      router.refresh();
    } else {
      // Confirmação de e-mail habilitada — aguardar clique no link
      setMensagem("Verifique seu e-mail e clique no link de confirmação para ativar sua conta.");
      setCarregando(false);
    }
  }

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
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 36, justifyContent: "center" }}>
          <LogoIcon />
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 22, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
        </Link>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 6px" }}>
            Criar conta de organizador
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>
            Sem mensalidade para começar. Pague só quando vender.
          </p>

          <form onSubmit={handleSubmit}>
            <Campo label="Nome completo" type="text" value={form.nome} onChange={set("nome")} required />
            <Campo label="CPF ou CNPJ" type="text" value={form.documento} onChange={set("documento")} required placeholder="Somente números" />
            <Campo label="Telefone (opcional)" type="tel" value={form.telefone} onChange={set("telefone")} placeholder="(48) 99999-0000" />
            <div style={{ height: 1, background: T.line, margin: "6px 0 18px" }} />
            <Campo label="E-mail" type="email" value={form.email} onChange={set("email")} required />
            <Campo label="Senha (mín. 6 caracteres)" type="password" value={form.senha} onChange={set("senha")} required minLength={6} />

            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 18 }}>
                {erro}
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
      </div>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, placeholder, minLength }) {
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
        placeholder={placeholder}
        minLength={minLength}
        style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
    </div>
  );
}

function LogoIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="1" y="6" width="28" height="18" rx="5" fill={T.ink} />
      <circle cx="1" cy="15" r="3.4" fill={T.surface} />
      <circle cx="29" cy="15" r="3.4" fill={T.surface} />
      <line x1="15" y1="9" x2="15" y2="21" stroke="#FF5A5F" strokeWidth="2.2" strokeDasharray="2 2.4" strokeLinecap="round" />
    </svg>
  );
}
