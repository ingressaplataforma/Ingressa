"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";
const labelStyle = { display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 };

function Campo({ label, value, onChange, placeholder, type = "text", hint, maxLength, rows }) {
  const common = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 10, border: `1px solid ${T.line}`,
    padding: rows ? "12px 13px" : "0 13px",
    fontSize: 15, fontFamily: fontBody, color: T.ink,
    background: T.surface, outline: "none",
    ...(rows ? { minHeight: rows * 24, resize: "vertical" } : { height: 44 }),
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={common} rows={rows} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={common} />
      )}
      {hint && <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

export default function FormPerfil({ inicial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: inicial.nome ?? "",
    bio: inicial.bio ?? "",
    whatsapp: inicial.whatsapp ?? "",
    email_contato: inicial.email_contato ?? "",
    foto_url: inicial.foto_url ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);

    const body = {
      nome: form.nome.trim(),
      bio: form.bio.trim() || null,
      whatsapp: form.whatsapp.replace(/\D/g, "") || null,
      email_contato: form.email_contato.trim() || null,
      foto_url: form.foto_url.trim() || null,
    };

    const res = await fetch("/api/painel/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) {
      setMsg({ ok: true, texto: "Perfil salvo com sucesso." });
      router.refresh();
    } else {
      setMsg({ ok: false, texto: json.erro ?? "Erro ao salvar." });
    }
    setSalvando(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <Campo label="Nome do organizador *" value={form.nome} onChange={set("nome")} placeholder="Ex.: Clube de Corrida SP" maxLength={120} />
      <Campo label="Bio / descrição curta" value={form.bio} onChange={set("bio")} placeholder="Quem é você ou sua organização? (aparece na página pública)" maxLength={300} rows={3} hint="Máx. 300 caracteres — aparece na página pública do organizador." />
      <Campo label="WhatsApp (com DDI e DDD)" value={form.whatsapp} onChange={set("whatsapp")} placeholder="5511999999999" hint="Só dígitos, sem espaços ou traços. Ex.: 5511999999999. Deixe vazio para não exibir." />
      <Campo label="E-mail de contato público" value={form.email_contato} onChange={set("email_contato")} type="email" placeholder="contato@seusite.com.br" hint="Aparece como botão de e-mail na página do evento. Deixe vazio para não exibir." />
      <Campo label="URL da foto/logo (opcional)" value={form.foto_url} onChange={set("foto_url")} placeholder="https://..." hint="Link direto para imagem pública (HTTPS). Deixe vazio para usar o ícone padrão." />

      {msg && (
        <p style={{ fontSize: 14, color: msg.ok ? T.mint : "#dc2626", margin: "0 0 14px", fontWeight: 600 }}>
          {msg.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando || !form.nome.trim()}
        style={{ height: 46, padding: "0 28px", background: T.coral, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: fontBody, cursor: "pointer", opacity: salvando ? 0.7 : 1 }}
      >
        {salvando ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
