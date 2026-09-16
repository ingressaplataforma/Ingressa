"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function FormCompletar({ userId, email, nomeInicial }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.from("organizador").upsert({
      id: userId,
      nome: nome.trim(),
      documento: documento.trim(),
      telefone: telefone.trim() || null,
    });

    if (error) {
      setErro("Não foi possível salvar. Tente novamente.");
      setCarregando(false);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", textDecoration: "none", marginBottom: 36 }}>
          <Image src="/ingressa_logo.png" alt="Ingressa — Ingressos para eventos" width={216} height={72} style={{ width: 160, height: "auto" }} priority />
        </Link>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 6px" }}>
            Complete seu perfil
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>
            Precisamos de mais algumas informações para ativar sua conta de organizador.
          </p>

          <form onSubmit={handleSubmit}>
            {/* E-mail vem do Google, somente leitura */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                readOnly
                style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.muted, background: "#f7f7f9", outline: "none", cursor: "default" }}
              />
            </div>

            <Campo label="Nome completo" type="text" value={nome} onChange={setNome} required />
            <Campo label="CPF ou CNPJ" type="text" value={documento} onChange={setDocumento} required placeholder="Somente números" />
            <Campo label="Telefone (opcional)" type="tel" value={telefone} onChange={setTelefone} placeholder="(48) 99999-0000" />

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
              {carregando ? "Salvando…" : "Ativar conta de organizador"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, type, value, onChange, required, placeholder }) {
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
        placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
    </div>
  );
}
