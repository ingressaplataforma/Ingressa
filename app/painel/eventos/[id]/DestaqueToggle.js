"use client";

import { useState } from "react";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// FUTURO: quando destaque virar recurso PAGO, este componente deve exibir o
// preço, abrir fluxo de checkout e só ativar após confirmação de pagamento.
// A validação financeira entra em /api/eventos/[id]/destaque antes de gravar.

// adminDestaque: null = admin não interferiu (org controla)
//                true = admin forçou ligado (org não pode desligar)
//               false = admin forçou desligado (org não pode ligar)
export default function DestaqueToggle({ eventoId, destaqueInicial, adminDestaque }) {
  const [destaque, setDestaque] = useState(destaqueInicial);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const adminOverride = adminDestaque !== null && adminDestaque !== undefined;
  const ativo = adminDestaque === true || (adminDestaque === null && destaque);

  async function toggle() {
    setSalvando(true);
    setMsg("");
    const novoValor = !destaque;
    const res = await fetch(`/api/eventos/${eventoId}/destaque`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destaque: novoValor }),
    });
    const json = await res.json();
    if (res.ok) {
      setDestaque(novoValor);
      setMsg(novoValor ? "Evento marcado como destaque!" : "Destaque removido.");
    } else {
      setMsg(json.erro ?? "Erro ao atualizar.");
    }
    setSalvando(false);
  }

  let avisoAdmin = null;
  if (adminDestaque === true) {
    avisoAdmin = "Destaque ativado pelo administrador — você não pode desligar.";
  } else if (adminDestaque === false) {
    avisoAdmin = "Destaque bloqueado pelo administrador.";
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${ativo ? T.mint : T.line}`, padding: "18px 20px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
            {ativo && <span style={{ fontSize: 13, color: T.mint }}>✦</span>}
            Destacar este evento
          </p>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
            Seu evento aparece em destaque na home e recebe posição privilegiada.
            Em breve este será um recurso premium.
            {avisoAdmin && (
              <span style={{ display: "block", marginTop: 4, color: adminDestaque ? T.mint : "#e53e3e", fontWeight: 600 }}>
                {avisoAdmin}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={salvando || adminOverride}
          title={avisoAdmin ?? undefined}
          style={{
            padding: "10px 20px", borderRadius: 10,
            background: destaque ? T.mint : T.surface,
            border: `2px solid ${destaque ? T.mint : T.line}`,
            color: destaque ? "#fff" : T.ink,
            fontWeight: 700, fontSize: 14,
            cursor: (salvando || adminOverride) ? "not-allowed" : "pointer",
            fontFamily: fontBody, transition: "all 0.15s",
            opacity: (salvando || adminOverride) ? 0.65 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {salvando ? "…" : destaque ? "✦ Ativo" : "Destacar"}
        </button>
      </div>
      {msg && (
        <p style={{ fontSize: 13, color: msg.toLowerCase().startsWith("erro") ? "#e53e3e" : T.mint, margin: "10px 0 0", fontWeight: 600 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
