"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { gerarSlug } from "@/lib/slug";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const LOTE_VAZIO = () => ({ id: crypto.randomUUID(), nome: "", preco: "0", quantidade: "" });

export default function NovoEventoPage() {
  const router = useRouter();
  const [form, setForm] = useState({ titulo: "", descricao: "", local_nome: "", endereco: "", data_inicio: "", data_fim: "" });
  const [lotes, setLotes] = useState([LOTE_VAZIO()]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function setF(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  function setLote(id, campo) {
    return (e) => setLotes((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: e.target.value } : l));
  }

  function addLote() {
    setLotes((ls) => [...ls, LOTE_VAZIO()]);
  }

  function removeLote(id) {
    setLotes((ls) => ls.filter((l) => l.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    // Validações básicas
    for (const l of lotes) {
      if (!l.nome.trim()) { setErro("Todos os lotes precisam de um nome."); return; }
      if (!l.quantidade || parseInt(l.quantidade) < 1) { setErro("Todos os lotes precisam de uma quantidade mínima de 1."); return; }
    }

    setCarregando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/entrar"); return; }

    const slug = gerarSlug(form.titulo);

    const { data: evento, error: evErr } = await supabase
      .from("evento")
      .insert({
        organizador_id: user.id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        local_nome: form.local_nome.trim() || null,
        endereco: form.endereco.trim() || null,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        slug,
      })
      .select("id")
      .single();

    if (evErr) {
      setErro("Erro ao criar evento. Tente novamente.");
      setCarregando(false);
      return;
    }

    const { error: loteErr } = await supabase.from("lote").insert(
      lotes.map((l) => ({
        evento_id: evento.id,
        nome: l.nome.trim(),
        preco_cents: Math.round(parseFloat(l.preco.replace(",", ".") || "0") * 100),
        quantidade_total: parseInt(l.quantidade),
      }))
    );

    if (loteErr) {
      setErro("Evento criado, mas erro ao salvar lotes. Acesse o evento para corrigir.");
      setCarregando(false);
      router.push(`/painel/eventos/${evento.id}`);
      return;
    }

    router.push(`/painel/eventos/${evento.id}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/painel/eventos" style={{ color: T.muted, textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Meus eventos
          </Link>
          <span style={{ color: T.line }}>·</span>
          <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink }}>Novo evento</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        <form onSubmit={handleSubmit}>
          {/* Dados do evento */}
          <Secao titulo="Dados do evento">
            <Campo label="Título *" type="text" value={form.titulo} onChange={setF("titulo")} required />
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Descrição</label>
              <textarea
                value={form.descricao}
                onChange={setF("descricao")}
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: `1px solid ${T.line}`, padding: "10px 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none", resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Campo label="Local" type="text" value={form.local_nome} onChange={setF("local_nome")} placeholder="Ex.: Teatro Municipal" />
              <Campo label="Endereço" type="text" value={form.endereco} onChange={setF("endereco")} placeholder="Rua, número, cidade" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Campo label="Data e hora de início *" type="datetime-local" value={form.data_inicio} onChange={setF("data_inicio")} required />
              <Campo label="Data e hora de fim" type="datetime-local" value={form.data_fim} onChange={setF("data_fim")} />
            </div>
          </Secao>

          {/* Lotes */}
          <Secao titulo="Lotes de ingresso">
            {lotes.map((lote, idx) => (
              <div key={lote.id} style={{ background: T.panel, borderRadius: 12, padding: "18px 20px", marginBottom: 12, position: "relative" }}>
                {lotes.length > 1 && (
                  <button type="button" onClick={() => removeLote(lote.id)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
                )}
                <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: "0 0 12px" }}>Lote {idx + 1}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end" }}>
                  <Campo label="Nome do lote *" type="text" value={lote.nome} onChange={setLote(lote.id, "nome")} required placeholder="Ex.: Inteira, Meia, Combo" />
                  <Campo label="Preço (R$)" type="number" value={lote.preco} onChange={setLote(lote.id, "preco")} min="0" step="0.01" placeholder="0" style={{ width: 110 }} />
                  <Campo label="Vagas *" type="number" value={lote.quantidade} onChange={setLote(lote.id, "quantidade")} required min="1" placeholder="Ex.: 100" style={{ width: 100 }} />
                </div>
              </div>
            ))}
            <button type="button" onClick={addLote} style={{ background: "transparent", border: `1.5px dashed ${T.line}`, borderRadius: 12, padding: "14px 20px", width: "100%", color: T.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
              + Adicionar lote
            </button>
          </Secao>

          {erro && (
            <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 20 }}>
              {erro}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Link href="/painel/eventos" style={{ padding: "13px 24px", background: T.panel, color: T.ink2, borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Cancelar</Link>
            <button type="submit" disabled={carregando} style={{ padding: "13px 28px", background: carregando ? T.muted : T.ink, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}>
              {carregando ? "Salvando…" : "Salvar rascunho"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 };

function Secao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 18px" }}>{titulo}</h2>
      {children}
    </div>
  );
}

function Campo({ label, type, value, onChange, required, placeholder, min, step, minLength, style: extraStyle }) {
  return (
    <div style={{ marginBottom: 18, ...extraStyle && { marginBottom: 0 } }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        minLength={minLength}
        style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none", ...extraStyle }}
      />
    </div>
  );
}
