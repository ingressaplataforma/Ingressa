"use client";

import { useState } from "react";

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ admin }) {
  if (admin === true)  return <span style={{ color: "#059669", fontWeight: 700, fontSize: 12 }}>▲ admin ON</span>;
  if (admin === false) return <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 12 }}>▼ admin OFF</span>;
  return <span style={{ color: "#6b7280", fontSize: 12 }}>— (org controla)</span>;
}

function EventoRow({ ev }) {
  const [adminDestaque, setAdminDestaque] = useState(ev.destaque_admin);
  const [ordem, setOrdem] = useState(ev.destaque_ordem ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function salvar(novoAdmin) {
    setSalvando(true);
    setMsg("");
    const body = { destaque_admin: novoAdmin };
    if (ordem !== "" && ordem !== null) body.destaque_ordem = Number(ordem);
    else body.destaque_ordem = null;

    const res = await fetch(`/api/admin/eventos/${ev.id}/destaque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) {
      setAdminDestaque(novoAdmin);
      setMsg("Salvo.");
    } else {
      setMsg(json.erro ?? "Erro.");
    }
    setSalvando(false);
  }

  const eDestaque = ev.destaque === true && adminDestaque !== false;
  const forcarOn = adminDestaque === true;

  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
      <td style={{ padding: "10px 12px", fontSize: 13, color: "#111" }}>
        <a href={`/e/${ev.slug}`} target="_blank" rel="noreferrer" style={{ color: "#111", fontWeight: 600 }}>{ev.titulo}</a>
        <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>{fmtData(ev.data_inicio)} · {ev.local_nome ?? "—"}</span>
      </td>
      <td style={{ padding: "10px 12px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: ev.destaque ? "#059669" : "#9ca3af" }}>
          {ev.destaque ? "✦ ativo" : "—"}
        </span>
      </td>
      <td style={{ padding: "10px 12px", textAlign: "center" }}>
        <StatusBadge admin={adminDestaque} />
      </td>
      <td style={{ padding: "10px 12px" }}>
        <input
          type="number"
          min="0"
          placeholder="ordem"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          style={{ width: 70, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
        />
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => salvar(true)}
            disabled={salvando || adminDestaque === true}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "#059669", color: "#fff", cursor: "pointer", opacity: adminDestaque === true ? 0.5 : 1 }}
          >Forçar ON</button>
          <button
            onClick={() => salvar(false)}
            disabled={salvando || adminDestaque === false}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", opacity: adminDestaque === false ? 0.5 : 1 }}
          >Forçar OFF</button>
          <button
            onClick={() => salvar(null)}
            disabled={salvando || adminDestaque === null}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer", opacity: adminDestaque === null ? 0.5 : 1 }}
          >↺ Org</button>
        </div>
        {msg && <span style={{ fontSize: 11, color: msg === "Salvo." ? "#059669" : "#dc2626", marginTop: 4, display: "block" }}>{msg}</span>}
      </td>
    </tr>
  );
}

export default function AdminDestaqueClient({ eventos }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <thead style={{ background: "#f9fafb" }}>
          <tr>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Evento</th>
            <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Org destaque</th>
            <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Admin override</th>
            <th style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Ordem</th>
            <th style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((ev) => <EventoRow key={ev.id} ev={ev} />)}
        </tbody>
      </table>
    </div>
  );
}
