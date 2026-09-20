"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// Gradientes determinísticos — mesmo sistema da vitrine
const GRADIENTES = [
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 100%)",
  "linear-gradient(145deg, #231647 0%, #1A1035 55%, #00C89618 100%)",
  "linear-gradient(145deg, #2A1A5E 0%, #3B1F3F 100%)",
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 70%, #FF5A5F14 100%)",
];
function gradiente(id) {
  return GRADIENTES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTES.length];
}

function fmtData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

// Popup aparece a cada visita (reload/nova aba) — sem localStorage.
// Fecha com: X, clique fora, ESC, ou "Agora não".
// Uma vez fechado na sessão atual, não reabre na navegação SPA.

export default function DestaquePopup({ evento }) {
  const [fechado, setFechado] = useState(false);

  const fechar = useCallback(() => setFechado(true), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fechar]);

  if (fechado) return null;

  const imageUrl = evento.imagem_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/eventos/${evento.imagem_url}`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={fechar}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(10,6,26,0.72)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Evento em destaque: ${evento.titulo}`}
        style={{
          position: "fixed", inset: 0, zIndex: 9001,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px 16px",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            width: "100%",
            maxWidth: 440,
            boxShadow: "0 24px 80px -12px rgba(10,6,26,0.55)",
            position: "relative",
          }}
        >
          {/* Botão X — bem visível, acessível */}
          <button
            onClick={fechar}
            aria-label="Fechar popup"
            style={{
              position: "absolute", top: 10, right: 10, zIndex: 2,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(10,6,26,0.55)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 20, lineHeight: 1, fontWeight: 400,
            }}
          >
            ×
          </button>

          {/* Capa (imagem ou gradiente determinístico) */}
          <div style={{
            position: "relative", height: 200, flexShrink: 0, overflow: "hidden",
            background: imageUrl ? "#000" : gradiente(evento.id),
          }}>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={evento.titulo}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.88 }}
              />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,6,26,0.65) 0%, transparent 60%)" }} />
            <span style={{
              position: "absolute", top: 12, left: 12,
              fontSize: 11, fontWeight: 700, color: "#fff",
              background: T.coral, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.05em",
            }}>
              ✦ EM DESTAQUE
            </span>
          </div>

          {/* Info */}
          <div style={{ padding: "20px 24px 24px", fontFamily: fontBody }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.coral, margin: "0 0 6px" }}>
              {fmtData(evento.data_inicio)}{evento.local_nome ? ` · ${evento.local_nome}` : ""}
            </p>
            <h2 style={{
              fontFamily: fontDisplay, fontSize: "clamp(18px,4vw,22px)", fontWeight: 600,
              color: T.ink, margin: "0 0 20px", lineHeight: 1.2, letterSpacing: "-0.02em",
            }}>
              {evento.titulo}
            </h2>
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href={`/e/${evento.slug}`}
                style={{
                  flex: 1, display: "block", textAlign: "center",
                  padding: "13px 20px", background: T.coral, color: "#fff",
                  borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none",
                }}
              >
                Ver evento
              </Link>
              <button
                onClick={fechar}
                style={{
                  padding: "13px 18px", background: T.panel, border: "none",
                  borderRadius: 12, fontWeight: 600, fontSize: 14, color: T.muted,
                  cursor: "pointer", fontFamily: fontBody,
                }}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
