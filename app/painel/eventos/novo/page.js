"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/tokens";
import ImagemCapa from "../ImagemCapa";
import MeiosPagamento from "../MeiosPagamento";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const LOTE_VAZIO = () => ({ id: crypto.randomUUID(), nome: "", preco: "0", quantidade: "" });

export default function NovoEventoPage() {
  const router = useRouter();
  const [form, setForm] = useState({ titulo: "", descricao: "", local_nome: "", cep: "", endereco: "", data_inicio: "", data_fim: "", visibilidade: "publico", senha: "", imagem_url: null, aceita_cartao: true, aceita_boleto: false });
  const [lotes, setLotes] = useState([LOTE_VAZIO()]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  function setF(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  async function handleCep(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatado = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setForm((f) => ({ ...f, cep: formatado }));

    if (raw.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const partes = [data.logradouro, data.bairro, data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : ""].filter(Boolean);
          setForm((f) => ({ ...f, endereco: partes.join(", ") }));
        }
      } catch { /* ignora falhas de rede */ }
      setBuscandoCep(false);
    }
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

    if (form.visibilidade === "privado" && !form.senha.trim()) {
      setErro("Eventos privados precisam de uma senha de acesso.");
      return;
    }

    setCarregando(true);

    // Envia para API route — hash da senha feito no servidor, nunca no cliente
    const res = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descricao: form.descricao,
        local_nome: form.local_nome,
        cep: form.cep,
        endereco: form.endereco,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        visibilidade: form.visibilidade,
        senha: form.senha || undefined,
        imagem_url: form.imagem_url || null,
        aceita_cartao: form.aceita_cartao,
        aceita_boleto: form.aceita_boleto,
        lotes,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErro(json.erro || "Erro ao criar evento. Tente novamente.");
      setCarregando(false);
      return;
    }

    router.push(`/painel/eventos/${json.evento_id}`);
  }

  const temLotePago = lotes.some((l) => parseFloat(String(l.preco).replace(",", ".") || "0") > 0);

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
            <ImagemCapa
              valorAtual={form.imagem_url}
              onChange={(path) => setForm((f) => ({ ...f, imagem_url: path }))}
            />
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
              <Campo label="Local / Nome do espaço" type="text" value={form.local_nome} onChange={setF("local_nome")} placeholder="Ex.: Teatro Municipal" />
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>CEP</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={form.cep}
                    onChange={handleCep}
                    placeholder="00000-000"
                    maxLength={9}
                    style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
                  />
                  {buscandoCep && (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.muted }}>buscando…</span>
                  )}
                </div>
              </div>
            </div>
            <Campo label="Endereço completo" type="text" value={form.endereco} onChange={setF("endereco")} placeholder="Preenchido automaticamente pelo CEP, ou digitar" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Campo label="Data e hora de início *" type="datetime-local" value={form.data_inicio} onChange={setF("data_inicio")} required />
              <Campo label="Data e hora de fim" type="datetime-local" value={form.data_fim} onChange={setF("data_fim")} />
            </div>

            {/* Visibilidade */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Visibilidade</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[["publico", "Público", "Aparece na listagem de eventos"], ["nao_listado", "Não listado", "Acessível pelo link, não aparece na listagem"], ["privado", "Privado", "Exige senha para acessar"]].map(([val, label, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, visibilidade: val, senha: val !== "privado" ? "" : f.senha }))}
                    style={{
                      flex: 1, minWidth: 160, padding: "12px 14px", textAlign: "left", borderRadius: 10, cursor: "pointer", fontFamily: fontBody,
                      border: `2px solid ${form.visibilidade === val ? T.ink : T.line}`,
                      background: form.visibilidade === val ? "#F6F4FF" : "#fff",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.visibilidade === "privado" && (
              <Campo label="Senha de acesso *" type="password" value={form.senha} onChange={setF("senha")} required placeholder="Mínimo 6 caracteres" minLength={6} />
            )}
          </Secao>

          {/* Banner: lote pago sem plano */}
          {temLotePago && (
            <div style={{ background: "#FFF8EC", border: "1px solid #F5C842", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#7A5C00", lineHeight: 1.5 }}>
              <strong>Ingresso pago detectado.</strong> Eventos com ingresso pago exigem um plano para publicar — planos chegam em breve. Por enquanto você pode publicar o evento como gratuito (lotes a R$&nbsp;0).
            </div>
          )}

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

          {/* Formas de pagamento — só para evento pago */}
          {temLotePago && (
            <Secao titulo="Formas de pagamento aceitas">
              <MeiosPagamento
                aceita_cartao={form.aceita_cartao}
                aceita_boleto={form.aceita_boleto}
                onChange={(key, val) => setForm((f) => ({ ...f, [key]: val }))}
              />
            </Secao>
          )}

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
