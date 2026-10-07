"use client";

import { useState, useEffect } from "react";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

function calcRestante(alvo) {
  const diff = alvo - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}

function Bloco({ valor, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: T.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {String(valor).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 11, color: T.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

export default function Countdown({ dataInicio }) {
  const alvo = new Date(dataInicio).getTime();
  const [restante, setRestante] = useState(() => calcRestante(alvo));

  useEffect(() => {
    if (!restante) return;
    const id = setInterval(() => setRestante(calcRestante(alvo)), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  if (!restante) return null; // evento passado — não mostrar nada

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontFamily: fontBody }}>
      <Bloco valor={restante.dias} label="dias" />
      <Separador />
      <Bloco valor={restante.horas} label="horas" />
      <Separador />
      <Bloco valor={restante.minutos} label="min" />
      <Separador />
      <Bloco valor={restante.segundos} label="seg" />
    </div>
  );
}

function Separador() {
  return <span style={{ fontSize: 22, color: T.line, fontWeight: 300, marginBottom: 14 }}>:</span>;
}
