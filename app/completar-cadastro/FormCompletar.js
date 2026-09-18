"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// ── Validação de CPF (dígitos verificadores) ─────────────────
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

function mascaraTelefone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d.length) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// modo: "novo_organizador" | "cpf_comprador" | "documento_organizador"
export default function FormCompletar({ userId, email, nomeInicial, modo, destinoApos }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [cpf, setCpf] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // ── Cabeçalhos por modo ──────────────────────────────────────
  const titulos = {
    novo_organizador:    "Complete seu perfil",
    cpf_comprador:       "Adicione seu CPF",
    documento_organizador: "Adicione seu CPF/CNPJ",
  };
  const subtitulos = {
    novo_organizador:    "Precisamos de mais algumas informações para ativar sua conta de organizador.",
    cpf_comprador:       "Para garantir que cada ingresso é único e intransferível, precisamos do seu CPF.",
    documento_organizador: "Para sua conta de organizador, precisamos do seu CPF ou CNPJ.",
  };
  const botaoTexto = {
    novo_organizador:    "Ativar conta de organizador",
    cpf_comprador:       "Salvar CPF e continuar",
    documento_organizador: "Salvar documento e continuar",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    // Validações específicas por modo
    if (modo === "cpf_comprador") {
      if (!validarCPF(cpf)) {
        setErro("CPF inválido. Verifique os números e tente novamente.");
        return;
      }
    }
    if (modo === "documento_organizador" || modo === "novo_organizador") {
      const docDigitos = documento.replace(/\D/g, "");
      if (docDigitos.length !== 11 && docDigitos.length !== 14) {
        setErro("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        return;
      }
      if (docDigitos.length === 11 && !validarCPF(documento)) {
        setErro("CPF inválido. Verifique os números e tente novamente.");
        return;
      }
    }

    setCarregando(true);
    const supabase = createClient();

    if (modo === "cpf_comprador") {
      const { error } = await supabase.from("comprador").update({
        cpf: cpf.replace(/\D/g, ""),
      }).eq("id", userId);

      if (error) {
        setErro("Não foi possível salvar. Tente novamente.");
        setCarregando(false);
        return;
      }
    } else if (modo === "documento_organizador") {
      const { error } = await supabase.from("organizador").update({
        documento: documento.replace(/\D/g, ""),
      }).eq("id", userId);

      if (error) {
        setErro("Não foi possível salvar. Tente novamente.");
        setCarregando(false);
        return;
      }
    } else {
      // novo_organizador: comportamento original
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
    }

    router.push(destinoApos || "/");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", textDecoration: "none", marginBottom: 36 }}>
          <Image src="/ingressa_logo.png" alt="Ingressa" width={216} height={72} style={{ width: 160, height: "auto" }} priority />
        </Link>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "clamp(28px,5vw,40px)", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 6px" }}>
            {titulos[modo]}
          </h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 28px" }}>
            {subtitulos[modo]}
          </p>

          <form onSubmit={handleSubmit}>
            {/* E-mail sempre somente leitura */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                value={email}
                readOnly
                style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.muted, background: "#f7f7f9", outline: "none", cursor: "default" }}
              />
            </div>

            {/* Nome: só no fluxo original de novo organizador */}
            {modo === "novo_organizador" && (
              <Campo label="Nome completo" type="text" value={nome} onChange={setNome} required />
            )}

            {/* CPF do comprador */}
            {modo === "cpf_comprador" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>CPF *</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(mascaraCPF(e.target.value))}
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
                />
              </div>
            )}

            {/* Documento (CPF ou CNPJ) para organizador */}
            {(modo === "documento_organizador" || modo === "novo_organizador") && (
              <Campo label="CPF ou CNPJ" type="text" value={documento} onChange={setDocumento} required placeholder="Somente números" />
            )}

            {/* Telefone: opcional no fluxo original */}
            {modo === "novo_organizador" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>Telefone (opcional)</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                  placeholder="(48) 99999-0000"
                  style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
                />
              </div>
            )}

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
              {carregando ? "Salvando…" : botaoTexto[modo]}
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
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>{label}</label>
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
