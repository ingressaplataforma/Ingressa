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

export default function CadastroCompradorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    async function checarSessao() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsuarioLogado(user);
    }
    checarSessao();
  }, []);

  function set(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  // Usuário já logado quer adicionar o perfil de comprador
  async function handleAdicionarPerfil() {
    setErro("");
    setAdicionando(true);
    const supabase = createClient();
    const { error } = await supabase.from("comprador").upsert({
      id: usuarioLogado.id,
      nome: usuarioLogado.user_metadata?.nome || usuarioLogado.email.split("@")[0],
    });
    if (error) {
      setErro("Erro ao adicionar perfil: " + error.message);
      setAdicionando(false);
      return;
    }
    router.push("/meus-ingressos");
    router.refresh();
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

    if (data.session) {
      await supabase.from("comprador").upsert({
        id: data.user.id,
        nome: form.nome,
      });
      router.push("/meus-ingressos");
      router.refresh();
    } else {
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
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  // Usuário já logado: oferecer adicionar perfil de comprador
  if (usuarioLogado) {
    return (
      <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <Link href="/" style={{ display: "flex", justifyContent: "center", textDecoration: "none", marginBottom: 36 }}>
            <Image src="/ingressa_logo.png" alt="Ingressa" width={216} height={72} style={{ width: 160, height: "auto" }} priority />
          </Link>
          <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎟️</div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: "0 0 10px" }}>
              Adicionar perfil de comprador
            </h1>
            <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px", lineHeight: 1.55 }}>
              Você já está logado. Clique abaixo para habilitar a compra de ingressos na sua conta.
            </p>
            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 18 }}>
                {erro}
              </div>
            )}
            <button
              onClick={handleAdicionarPerfil}
              disabled={adicionando}
              style={{ width: "100%", padding: "14px", background: adicionando ? T.muted : T.coral, color: "#fff", border: "none", borderRadius: 11, fontSize: 16, fontWeight: 600, cursor: adicionando ? "not-allowed" : "pointer", fontFamily: fontBody }}
            >
              {adicionando ? "Adicionando…" : "Habilitar compra de ingressos"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <Campo label="Nome completo" type="text" value={form.nome} onChange={set("nome")} required />
            <div style={{ height: 1, background: T.line, margin: "0 0 18px" }} />
            <Campo label="E-mail" type="email" value={form.email} onChange={set("email")} required />
            <Campo label="Senha (mín. 6 caracteres)" type="password" value={form.senha} onChange={set("senha")} required minLength={6} />

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
