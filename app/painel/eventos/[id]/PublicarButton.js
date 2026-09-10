"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function PublicarButton({ eventoId }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [modalPago, setModalPago] = useState(false);
  const [zerando, setZerando] = useState(false);

  async function publicar(forcarGratuito = false) {
    setErro("");
    setCarregando(true);

    const res = await fetch(`/api/eventos/${eventoId}/publicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forcar_gratuito: forcarGratuito }),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.pago) {
        setModalPago(true);
        setCarregando(false);
        return;
      }
      setErro(json.erro || "Não foi possível publicar. Tente novamente.");
      setCarregando(false);
      return;
    }

    router.refresh();
  }

  async function handlePublicarGratuito() {
    setZerando(true);
    setModalPago(false);
    await publicar(true);
    setZerando(false);
  }

  return (
    <div>
      <button
        onClick={() => publicar(false)}
        disabled={carregando || zerando}
        style={{
          padding: "12px 28px",
          background: carregando || zerando ? T.muted : T.mint,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          cursor: carregando || zerando ? "not-allowed" : "pointer",
          fontFamily: fontBody,
        }}
      >
        {carregando ? "Publicando…" : "Publicar evento"}
      </button>

      {erro && <p style={{ fontSize: 13, color: "#C0392B", marginTop: 8 }}>{erro}</p>}

      {/* Modal: evento pago sem plano */}
      {modalPago && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,16,53,0.55)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setModalPago(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "32px 36px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,.18)",
              fontFamily: fontBody,
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: "0 0 12px", lineHeight: 1.3 }}>
              Cobrar ingresso exige um plano
            </p>
            <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.6, margin: "0 0 20px" }}>
              Seu evento tem lotes com preço acima de R$&nbsp;0. Para publicar eventos pagos você precisa de um plano — que chega em breve na Ingressa.
            </p>
            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.5, margin: "0 0 28px" }}>
              Por enquanto você pode publicar o evento <strong>gratuitamente</strong> (os preços dos lotes serão zerados) e configurar os preços depois, quando os planos estiverem disponíveis.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handlePublicarGratuito}
                disabled={zerando}
                style={{
                  padding: "13px 20px",
                  background: T.mint,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: zerando ? "not-allowed" : "pointer",
                  fontFamily: fontBody,
                }}
              >
                {zerando ? "Publicando…" : "Publicar como gratuito (zerar preços)"}
              </button>
              <a
                href="/#lista-espera"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "13px 20px",
                  border: `2px solid ${T.ink}`,
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.ink,
                  textDecoration: "none",
                  fontFamily: fontBody,
                }}
              >
                Entrar na lista de espera dos planos
              </a>
              <button
                onClick={() => setModalPago(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "8px",
                  fontFamily: fontBody,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
