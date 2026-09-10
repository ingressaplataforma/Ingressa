"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";
const labelStyle = { display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 };

function Campo({ label, type, value, onChange, required, placeholder, min, step, minLength, readonly }) {
  return (
    <div style={{ marginBottom: 16 }}>
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
        readOnly={readonly}
        style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: readonly ? T.muted : T.ink, background: readonly ? T.panel : T.surface, outline: "none" }}
      />
    </div>
  );
}

const LOTE_NOVO = () => ({ _novo: true, id: crypto.randomUUID(), nome: "", preco: "0", quantidade: "" });

export default function EditarEvento({ eventoId, eventoInicial, lotesIniciais }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titulo: eventoInicial.titulo ?? "",
    descricao: eventoInicial.descricao ?? "",
    local_nome: eventoInicial.local_nome ?? "",
    cep: eventoInicial.cep ? `${eventoInicial.cep.slice(0, 5)}-${eventoInicial.cep.slice(5)}` : "",
    endereco: eventoInicial.endereco ?? "",
    data_inicio: eventoInicial.data_inicio ? eventoInicial.data_inicio.slice(0, 16) : "",
    data_fim: eventoInicial.data_fim ? eventoInicial.data_fim.slice(0, 16) : "",
    visibilidade: eventoInicial.visibilidade ?? "publico",
    senha: "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);

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
      } catch { /* degrada para preenchimento manual */ }
      setBuscandoCep(false);
    }
  }
  const [lotesEdit, setLotesEdit] = useState(lotesIniciais.map((l) => ({ ...l, preco: (l.preco_cents / 100).toFixed(2) })));
  const [lotesRemover, setLotesRemover] = useState([]);
  const [lotesNovos, setLotesNovos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const setF = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function marcarRemover(id) {
    const lote = lotesEdit.find((l) => l.id === id);
    if (lote?.quantidade_vendida > 0) {
      setErro(`Lote "${lote.nome}" não pode ser removido: ${lote.quantidade_vendida} ingresso(s) já vendido(s).`);
      return;
    }
    setLotesEdit((ls) => ls.filter((l) => l.id !== id));
    setLotesRemover((ids) => [...ids, id]);
  }

  function setLoteExistente(id, campo) {
    return (e) => setLotesEdit((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: e.target.value } : l));
  }

  function setLoteNovo(id, campo) {
    return (e) => setLotesNovos((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: e.target.value } : l));
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (form.visibilidade === "privado" && !eventoInicial.tem_senha && !form.senha.trim()) {
      setErro("Eventos privados precisam de uma senha de acesso.");
      return;
    }

    setCarregando(true);
    const res = await fetch(`/api/eventos/${eventoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cep: form.cep,
        senha: form.senha || undefined,
        lotes_update: lotesEdit.map((l) => ({ id: l.id, nome: l.nome, preco: l.preco, quantidade: l.quantidade_total })),
        lotes_add: lotesNovos.filter((l) => l.nome.trim()).map((l) => ({ nome: l.nome, preco: l.preco, quantidade: l.quantidade })),
        lotes_remove: lotesRemover,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErro(json.erro || "Erro ao salvar. Tente novamente.");
      setCarregando(false);
      return;
    }

    setSucesso(true);
    setCarregando(false);
    setLotesNovos([]);
    setLotesRemover([]);
    router.refresh();
  }

  const temLotePago = [...lotesEdit, ...lotesNovos].some(
    (l) => parseFloat(String(l.preco).replace(",", ".") || "0") > 0
  );

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 20px" }}>Editar evento</h2>

      {temLotePago && (
        <div style={{ background: "#FFF8EC", border: "1px solid #F5C842", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#7A5C00", lineHeight: 1.5 }}>
          <strong>Ingresso pago detectado.</strong> Eventos com ingresso pago exigem um plano para publicar — planos chegam em breve. Por enquanto você pode publicar o evento como gratuito (lotes a R$&nbsp;0).
        </div>
      )}

      <form onSubmit={handleSalvar}>
        {/* Dados básicos */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.line}`, padding: "22px 24px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dados do evento</p>
          <Campo label="Título *" type="text" value={form.titulo} onChange={setF("titulo")} required />
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Descrição</label>
            <textarea
              value={form.descricao}
              onChange={setF("descricao")}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: `1px solid ${T.line}`, padding: "10px 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo label="Local" type="text" value={form.local_nome} onChange={setF("local_nome")} placeholder="Nome do espaço" />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>CEP</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={form.cep}
                  onChange={handleCep}
                  placeholder="00000-000"
                  maxLength={9}
                  style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 13px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
                />
                {buscandoCep && (
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.muted }}>buscando…</span>
                )}
              </div>
            </div>
          </div>
          <Campo label="Endereço completo" type="text" value={form.endereco} onChange={setF("endereco")} placeholder="Preenchido pelo CEP, ou digitar manualmente" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo label="Início *" type="datetime-local" value={form.data_inicio} onChange={setF("data_inicio")} required />
            <Campo label="Fim" type="datetime-local" value={form.data_fim} onChange={setF("data_fim")} />
          </div>

          {/* Visibilidade */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Visibilidade</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["publico", "Público"], ["nao_listado", "Não listado"], ["privado", "Privado"]].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibilidade: val, senha: val !== "privado" ? "" : f.senha }))}
                  style={{ padding: "8px 16px", borderRadius: 10, border: `2px solid ${form.visibilidade === val ? T.ink : T.line}`, background: form.visibilidade === val ? "#F6F4FF" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: fontBody, color: T.ink }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {form.visibilidade === "privado" && (
            <Campo
              label={eventoInicial.tem_senha ? "Nova senha (deixe em branco para manter a atual)" : "Senha de acesso *"}
              type="password"
              value={form.senha}
              onChange={setF("senha")}
              required={!eventoInicial.tem_senha}
              placeholder={eventoInicial.tem_senha ? "••••••••  (inalterada)" : "Mínimo 6 caracteres"}
              minLength={form.senha ? 6 : undefined}
            />
          )}
        </div>

        {/* Lotes existentes */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.line}`, padding: "22px 24px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lotes</p>
          {lotesEdit.map((lote, idx) => (
            <div key={lote.id} style={{ background: T.surface, borderRadius: 10, padding: "14px 16px", marginBottom: 10, position: "relative", border: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>Lote {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => marcarRemover(lote.id)}
                  title={lote.quantidade_vendida > 0 ? "Tem vendas — não pode remover" : "Remover lote"}
                  style={{ background: "transparent", border: "none", cursor: lote.quantidade_vendida > 0 ? "not-allowed" : "pointer", color: lote.quantidade_vendida > 0 ? T.line : T.muted, fontSize: 18, lineHeight: 1, padding: 2 }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end" }}>
                <Campo label="Nome *" type="text" value={lote.nome} onChange={setLoteExistente(lote.id, "nome")} required />
                <Campo label="Preço (R$)" type="number" value={lote.preco} onChange={setLoteExistente(lote.id, "preco")} min="0" step="0.01" />
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Vagas * {lote.quantidade_vendida > 0 ? <span style={{ color: "#E67E22", fontWeight: 400 }}>(mín. {lote.quantidade_vendida})</span> : ""}</label>
                  <input
                    type="number"
                    value={lote.quantidade_total}
                    onChange={setLoteExistente(lote.id, "quantidade_total")}
                    min={lote.quantidade_vendida || 1}
                    required
                    style={{ width: 90, height: 44, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 12px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none" }}
                  />
                </div>
              </div>
              {lote.quantidade_vendida > 0 && (
                <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0" }}>
                  {lote.quantidade_vendida} ingresso(s) vendido(s) — quantidade não pode ser reduzida abaixo desse valor
                </p>
              )}
            </div>
          ))}

          {/* Novos lotes */}
          {lotesNovos.map((lote, idx) => (
            <div key={lote.id} style={{ background: "#FFFBF0", borderRadius: 10, padding: "14px 16px", marginBottom: 10, border: `1.5px dashed ${T.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#E67E22" }}>Novo lote {lotesEdit.length + idx + 1}</span>
                <button type="button" onClick={() => setLotesNovos((ls) => ls.filter((l) => l.id !== lote.id))} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end" }}>
                <Campo label="Nome *" type="text" value={lote.nome} onChange={setLoteNovo(lote.id, "nome")} required />
                <Campo label="Preço (R$)" type="number" value={lote.preco} onChange={setLoteNovo(lote.id, "preco")} min="0" step="0.01" />
                <Campo label="Vagas *" type="number" value={lote.quantidade} onChange={setLoteNovo(lote.id, "quantidade")} min="1" required />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLotesNovos((ls) => [...ls, LOTE_NOVO()])}
            style={{ background: "transparent", border: `1.5px dashed ${T.line}`, borderRadius: 10, padding: "12px 20px", width: "100%", color: T.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}
          >
            + Adicionar lote
          </button>
        </div>

        {erro && (
          <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 16 }}>
            {erro}
          </div>
        )}
        {sucesso && (
          <div style={{ background: "#F0FFF4", border: `1px solid #A3E4B7`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1E7B3E", marginBottom: 16 }}>
            Alterações salvas com sucesso.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={carregando}
            style={{ padding: "12px 28px", background: carregando ? T.muted : T.ink, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
          >
            {carregando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
