"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoverParticipante({ eventoId, ingressoId, pago }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remover() {
    const msg = pago
      ? "Remover este participante vai estornar o pagamento no Asaas e cancelar o ingresso. Confirmar?"
      : "Remover este participante e liberar a vaga?";
    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/eventos/${eventoId}/participantes/${ingressoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.erro ?? "Erro ao remover participante.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={remover}
      disabled={loading}
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#E74C3C",
        background: "transparent",
        border: "none",
        cursor: loading ? "default" : "pointer",
        padding: "4px 8px",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "..." : "Remover"}
    </button>
  );
}