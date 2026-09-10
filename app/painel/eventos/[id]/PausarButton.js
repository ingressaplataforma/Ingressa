"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function PausarButton({ eventoId }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");

  async function handlePausar() {
    setErro("");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("evento")
      .update({ status: "pausado" })
      .eq("id", eventoId);

    if (error) {
      setErro("Não foi possível pausar. Tente novamente.");
      setCarregando(false);
      setConfirmando(false);
      return;
    }
    router.refresh();
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        style={{ padding: "10px 20px", background: "transparent", color: T.ink2, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}
      >
        Pausar para edição
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setConfirmando(false)}
          style={{ padding: "10px 16px", background: "transparent", color: T.muted, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: fontBody }}
        >
          Cancelar
        </button>
        <button
          onClick={handlePausar}
          disabled={carregando}
          style={{ padding: "10px 20px", background: carregando ? T.muted : "#E67E22", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
        >
          {carregando ? "Pausando…" : "Confirmar pausa"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>O evento ficará invisível ao público enquanto pausado.</p>
      {erro && <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{erro}</p>}
    </div>
  );
}
