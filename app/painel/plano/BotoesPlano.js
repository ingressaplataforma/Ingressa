"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export function BotaoAssinar({ planoId }) {
  const [estado, setEstado] = useState("idle"); // idle | loading | erro
  const [erro, setErro] = useState("");

  async function assinar() {
    setEstado("loading");
    setErro("");
    try {
      const res = await fetch("/api/plano/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano_id: planoId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.erro ?? "Erro ao iniciar assinatura.");
        setEstado("erro");
        return;
      }
      // Redirecionar para a página de pagamento do Asaas
      if (json.invoice_url) {
        window.location.href = json.invoice_url;
      } else {
        // Sem URL: recarrega a página para mostrar status "pendente"
        window.location.reload();
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setEstado("erro");
    }
  }

  return (
    <div>
      <button
        onClick={assinar}
        disabled={estado === "loading"}
        style={{
          padding: "14px 32px",
          background: estado === "loading" ? T.muted : T.coral,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: estado === "loading" ? "not-allowed" : "pointer",
          fontFamily: fontBody,
        }}
      >
        {estado === "loading" ? "Iniciando…" : "Assinar plano"}
      </button>
      {erro && (
        <p style={{ marginTop: 10, fontSize: 14, color: "#C0392B" }}>{erro}</p>
      )}
    </div>
  );
}

export function BotaoCancelar({ acessoAte }) {
  const router = useRouter();
  const [estado, setEstado] = useState("idle");
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");

  async function cancelar() {
    setEstado("loading");
    setErro("");
    try {
      const res = await fetch("/api/plano/cancelar", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.erro ?? "Erro ao cancelar.");
        setEstado("erro");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setEstado("erro");
    }
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        style={{
          padding: "10px 20px",
          background: "transparent",
          color: T.muted,
          border: `1px solid ${T.line}`,
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: fontBody,
        }}
      >
        Cancelar assinatura
      </button>
    );
  }

  return (
    <div style={{
      background: "#FFF8F8",
      border: "1px solid #FFD0D0",
      borderRadius: 12,
      padding: "16px 20px",
      maxWidth: 400,
    }}>
      <p style={{ fontSize: 14, color: T.ink, margin: "0 0 6px", fontWeight: 600 }}>
        Confirmar cancelamento?
      </p>
      {acessoAte && (
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 14px" }}>
          Seu acesso continua até{" "}
          {new Date(acessoAte).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={cancelar}
          disabled={estado === "loading"}
          style={{
            padding: "9px 18px",
            background: "#C0392B",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: estado === "loading" ? "not-allowed" : "pointer",
            fontFamily: fontBody,
          }}
        >
          {estado === "loading" ? "Cancelando…" : "Sim, cancelar"}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          style={{
            padding: "9px 18px",
            background: "transparent",
            color: T.ink2,
            border: `1px solid ${T.line}`,
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: fontBody,
          }}
        >
          Voltar
        </button>
      </div>
      {erro && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#C0392B" }}>{erro}</p>
      )}
    </div>
  );
}

export function BotaoPagarAgora({ url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        padding: "12px 28px",
        background: T.ink,
        color: "#fff",
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 600,
        textDecoration: "none",
        fontFamily: fontBody,
      }}
    >
      Pagar agora
    </a>
  );
}
