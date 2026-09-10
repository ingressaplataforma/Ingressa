"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function PublicarButton({ eventoId }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handlePublicar() {
    setErro("");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("evento")
      .update({ status: "publicado" })
      .eq("id", eventoId);

    if (error) {
      setErro("Não foi possível publicar. Tente novamente.");
      setCarregando(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handlePublicar}
        disabled={carregando}
        style={{ padding: "12px 28px", background: carregando ? T.muted : T.mint, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
      >
        {carregando ? "Publicando…" : "Publicar evento"}
      </button>
      {erro && <p style={{ fontSize: 13, color: "#C0392B", marginTop: 8 }}>{erro}</p>}
    </div>
  );
}
