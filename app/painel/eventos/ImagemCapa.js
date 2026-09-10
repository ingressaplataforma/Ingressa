"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_LARGURA = 1600;

function publicUrl(path) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/eventos/${path}`;
}

async function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale = Math.min(1, MAX_LARGURA / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha na compressão"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Imagem inválida")); };
    img.src = objUrl;
  });
}

/**
 * Campo de upload de imagem de capa.
 * @param {string|null} valorAtual – path no Storage (do banco) ou null
 * @param {(path: string|null) => void} onChange – chamado com path ou null
 */
export default function ImagemCapa({ valorAtual, onChange }) {
  const [previewUrl, setPreviewUrl] = useState(valorAtual ? publicUrl(valorAtual) : null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);
  const pathAtualRef = useRef(valorAtual ?? null);

  async function handleArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro("");

    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErro("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErro(`Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 5 MB.`);
      return;
    }

    setEnviando(true);
    try {
      const blob = await comprimirImagem(file);
      // Preview imediato com blob URL
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Remove imagem anterior do Storage antes de subir a nova (best-effort)
      if (pathAtualRef.current) {
        await supabase.storage.from("eventos").remove([pathAtualRef.current]).catch(() => {});
      }

      const path = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("eventos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (error) throw error;

      pathAtualRef.current = path;
      onChange(path);
    } catch {
      setErro("Erro ao enviar a imagem. Tente novamente.");
      setPreviewUrl(valorAtual ? publicUrl(valorAtual) : null);
    }
    setEnviando(false);
  }

  async function handleRemover() {
    if (pathAtualRef.current) {
      const supabase = createClient();
      await supabase.storage.from("eventos").remove([pathAtualRef.current]).catch(() => {});
    }
    pathAtualRef.current = null;
    setPreviewUrl(null);
    setErro("");
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink2, marginBottom: 8 }}>
        Imagem de capa <span style={{ color: T.muted, fontWeight: 400 }}>(opcional — JPG, PNG ou WebP, máx. 5 MB)</span>
      </label>

      {previewUrl ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}`, marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview da capa"
            style={{ width: "100%", aspectRatio: "3/1", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              style={{ padding: "6px 14px", background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, backdropFilter: "blur(4px)" }}
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={handleRemover}
              disabled={enviando}
              style={{ padding: "6px 14px", background: "rgba(220,50,50,0.85)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, backdropFilter: "blur(4px)" }}
            >
              Remover
            </button>
          </div>
          {enviando && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.ink2, fontWeight: 600 }}>
              Enviando…
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          style={{ width: "100%", padding: "28px 20px", background: T.panel, border: `1.5px dashed ${T.line}`, borderRadius: 12, cursor: enviando ? "not-allowed" : "pointer", color: T.muted, fontSize: 14, fontWeight: 600, fontFamily: fontBody, textAlign: "center" }}
        >
          {enviando ? "Enviando…" : "+ Adicionar imagem de capa"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleArquivo}
        style={{ display: "none" }}
      />

      {erro && (
        <p style={{ fontSize: 13, color: "#C0392B", margin: "6px 0 0" }}>{erro}</p>
      )}
    </div>
  );
}
