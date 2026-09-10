"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resolverPapel, rotaParaPapel } from "@/lib/supabase/papeis";
import { T } from "../../lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : error.message);
      setCarregando(false);
      return;
    }

    const papel = await resolverPapel(supabase, data.user.id);
    router.push(rotaParaPapel(papel));
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 36, justifyContent: "center" }}>
          <LogoIcon />
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 22, color: T.ink, letterSpacing: "-0.02em" }}>Ingressa</span>
        </Link>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 6px" }}>
            Bem-vindo de volta
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>
            Entre na sua conta de organizador.
          </p>

          <form onSubmit={handleSubmit}>
            <Campo label="E-mail" type="email" value={email} onChange={setEmail} required />
            <Campo label="Senha" type="password" value={senha} onChange={setSenha} required />

            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 18 }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              style={{ width: "100%", padding: "14px", background: carregando ? T.muted : T.ink, color: "#fff", border: "none", borderRadius: 11, fontSize: 16, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
            >
              {carregando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 15, color: T.muted }}>
          Não tem conta?{" "}
          <Link href="/cadastro" style={{ color: T.coral, fontWeight: 600, textDecoration: "none" }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

function Campo({ label, type, value, onChange, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
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
