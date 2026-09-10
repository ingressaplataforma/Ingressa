"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function GateSenha({ slug, titulo }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch("/api/evento-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, senha }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(res.status === 401 ? "Senha incorreta. Tente novamente." : json.erro || "Erro ao verificar senha.");
        setCarregando(false);
        return;
      }
      // Cookie httpOnly definido pela API — recarrega para exibir evento
      router.refresh();
    } catch {
      setErro("Erro de rede. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: "0 0 6px" }}>Evento privado</h1>
          <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>{titulo}</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, padding: "28px 28px", boxShadow: "0 20px 40px -24px rgba(26,16,53,0.18)" }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 6 }}>
              Senha de acesso
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
              style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10, border: `1px solid ${T.line}`, padding: "0 14px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: T.surface, outline: "none", marginBottom: 14 }}
            />
            {erro && (
              <div style={{ background: "#FFF0F0", border: `1px solid #FFD0D0`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#C0392B", marginBottom: 14 }}>
                {erro}
              </div>
            )}
            <button
              type="submit"
              disabled={carregando}
              style={{ width: "100%", padding: "13px", background: carregando ? T.muted : T.ink, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: fontBody }}
            >
              {carregando ? "Verificando…" : "Acessar evento"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
