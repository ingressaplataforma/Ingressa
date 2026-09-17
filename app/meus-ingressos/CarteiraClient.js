"use client";

import { useState } from "react";
import Link from "next/link";
import QrCode from "@/app/components/QrCode";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function CarteiraClient({ ingressos }) {
  const [aberto, setAberto] = useState(null);

  if (ingressos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 24px", color: T.muted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: T.ink2, margin: "0 0 8px" }}>Nenhum ingresso ainda</p>
        <p style={{ fontSize: 15, margin: "0 0 24px" }}>Encontre um evento e faça sua inscrição.</p>
        <Link href="/" style={{ color: T.coral, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>Explorar eventos</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {ingressos.map((ing) => {
        const evento = ing.evento;
        const data = new Date(evento.data_inicio);
        const dataFormatada = data.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
        const isAberto = aberto === ing.id;
        const cancelado = ing.status === "cancelado";

        return (
          <div key={ing.id} style={{ background: "#fff", borderRadius: 20, border: `1px solid ${T.line}`, overflow: "hidden", opacity: cancelado ? 0.6 : 1 }}>
            {/* Cabeçalho do ingresso */}
            <button
              onClick={() => setAberto(isAberto ? null : ing.id)}
              style={{ width: "100%", padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: fontBody }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.coral, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {ing.lote.nome}
                  {cancelado && <span style={{ color: T.muted, marginLeft: 8 }}>· Cancelado</span>}
                  {ing.status === "usado" && <span style={{ color: T.mint, marginLeft: 8 }}>· Utilizado</span>}
                </p>
                <p style={{ fontSize: 17, fontWeight: 600, color: T.ink, margin: "0 0 4px", fontFamily: fontDisplay }}>{evento.titulo}</p>
                {ing.dono_nome && (
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.ink2, margin: "0 0 2px" }}>
                    🎫 {ing.dono_nome}
                  </p>
                )}
                <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                  {dataFormatada}
                  {evento.local_nome && ` · ${evento.local_nome}`}
                </p>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: isAberto ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                <path d="M5 7.5l5 5 5-5" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* QR expandido */}
            {isAberto && !cancelado && (
              <div style={{ borderTop: `1px solid ${T.line}`, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${T.line}`, boxShadow: "0 4px 20px -8px rgba(26,16,53,0.15)" }}>
                  <QrCode value={ing.token_assinado} size={200} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: T.muted, margin: "0 0 4px" }}>Código do ingresso</p>
                  <code style={{ fontSize: 12, color: T.ink2, background: T.panel, padding: "4px 10px", borderRadius: 6 }}>
                    {ing.codigo.slice(0, 8).toUpperCase()}
                  </code>
                </div>
                <Link href={`/e/${evento.slug}`} style={{ fontSize: 14, color: T.coral, fontWeight: 600, textDecoration: "none" }}>
                  Ver página do evento
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
