"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";
const labelStyle = { display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 };

function Campo({ label, value, onChange, required, placeholder, type = "text", hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
      />
      {hint && <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

export default function FormRecebimento({ organizadorId, nomeAtual }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: nomeAtual ?? "",
    email: "",
    cpfCnpj: "",
    mobilePhone: "",
    postalCode: "",
    address: "",
    addressNumber: "",
    province: "",
    city: "",
    state: "",
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const setF = (campo) => (val) => setForm((f) => ({ ...f, [campo]: val }));

  function formatarDoc(val) {
    const d = val.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
        [a, b, c].filter(Boolean).join(".") + (e ? `-${e}` : "")
      );
    }
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d2, e) =>
      `${a}.${b}.${c}/${d2}` + (e ? `-${e}` : "")
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const res = await fetch("/api/recebimento/configurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
        mobilePhone: form.mobilePhone.replace(/\D/g, ""),
        postalCode: form.postalCode.replace(/\D/g, ""),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErro(json.erro || "Erro ao configurar recebimento. Tente novamente.");
      setCarregando(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.line}`, padding: "22px 24px", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "0 0 18px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dados pessoais / empresa</p>

        <Campo label="Nome completo ou razão social *" value={form.nome} onChange={setF("nome")} required placeholder="Como aparece na nota" />
        <Campo label="E-mail *" type="email" value={form.email} onChange={setF("email")} required placeholder="email@organizador.com" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>CPF ou CNPJ *</label>
            <input
              type="text"
              value={form.cpfCnpj}
              onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: formatarDoc(e.target.value) }))}
              required
              placeholder="000.000.000-00"
              style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
            />
          </div>
          <Campo label="Celular *" value={form.mobilePhone} onChange={setF("mobilePhone")} required placeholder="(11) 99999-9999" />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.line}`, padding: "22px 24px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "0 0 18px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Endereço</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="CEP *" value={form.postalCode} onChange={setF("postalCode")} required placeholder="00000-000" />
          <Campo label="Número *" value={form.addressNumber} onChange={setF("addressNumber")} required placeholder="123" />
        </div>
        <Campo label="Logradouro *" value={form.address} onChange={setF("address")} required placeholder="Rua das Flores" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
          <Campo label="Bairro *" value={form.province} onChange={setF("province")} required placeholder="Centro" />
          <Campo label="Cidade *" value={form.city} onChange={setF("city")} required placeholder="São Paulo" />
          <Campo label="UF *" value={form.state} onChange={setF("state")} required placeholder="SP" />
        </div>
      </div>

      {erro && (
        <div style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#C0392B", marginBottom: 16 }}>
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando}
        style={{ width: "100%", padding: "14px", background: carregando ? T.muted : T.ink, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
      >
        {carregando ? "Configurando…" : "Configurar recebimento"}
      </button>
    </form>
  );
}
