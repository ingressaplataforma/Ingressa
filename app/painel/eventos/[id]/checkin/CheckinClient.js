"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";
const fontDisplay = "var(--font-display), Georgia, serif";

// ─── Motivos legíveis ──────────────────────────────────────────────────
const MOTIVO_PT = {
  malformado: "QR inválido ou corrompido",
  assinatura_invalida: "QR adulterado",
  evento_errado: "QR de outro evento",
  fora_da_janela: "QR expirado",
  nao_encontrado: "Ingresso não encontrado",
};

// ─── ID persistente do dispositivo (para auditoria offline) ───────────
function getDispositivo() {
  try {
    let id = localStorage.getItem("ingressa-dispositivo");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("ingressa-dispositivo", id);
    }
    return id;
  } catch { return "desconhecido"; }
}

// ─── IndexedDB helpers ────────────────────────────────────────────────
const DB_NAME = "ingressa-checkin-db";
const DB_VER = 1;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("dadosEvento"))
        db.createObjectStore("dadosEvento", { keyPath: "eventoId" });
      if (!db.objectStoreNames.contains("checkinsPendentes")) {
        const s = db.createObjectStore("checkinsPendentes", { keyPath: "codigo" });
        s.createIndex("eventoId", "eventoId");
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSalvar(dados) {
  const db = await abrirDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("dadosEvento", "readwrite");
    tx.objectStore("dadosEvento").put(dados);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

async function idbCarregar(eventoId) {
  const db = await abrirDB();
  return new Promise((res, rej) => {
    const req = db.transaction("dadosEvento").objectStore("dadosEvento").get(eventoId);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
}

async function idbMarcarUsado(codigo, eventoId, dispositivo) {
  const db = await abrirDB();
  const usadoEm = new Date().toISOString();

  await new Promise((res) => {
    const tx = db.transaction("dadosEvento", "readwrite");
    const store = tx.objectStore("dadosEvento");
    const req = store.get(eventoId);
    req.onsuccess = () => {
      const d = req.result;
      if (d) {
        const ing = d.ingressos.find((i) => i.codigo === codigo);
        if (ing) { ing.status = "usado"; ing.usado_em = usadoEm; d.presentes = (d.presentes || 0) + 1; }
        store.put(d);
      }
      tx.oncomplete = res;
    };
  });

  const tx2 = (await abrirDB()).transaction("checkinsPendentes", "readwrite");
  tx2.objectStore("checkinsPendentes").put({ codigo, eventoId, usadoEm, dispositivo, sincronizado: false });
  await new Promise((res) => { tx2.oncomplete = res; });

  return usadoEm;
}

async function idbGetPendentes(eventoId) {
  const db = await abrirDB();
  return new Promise((res, rej) => {
    const idx = db.transaction("checkinsPendentes").objectStore("checkinsPendentes").index("eventoId");
    const req = idx.getAll(eventoId);
    req.onsuccess = () => res((req.result || []).filter((c) => !c.sincronizado));
    req.onerror = () => rej(req.error);
  });
}

async function idbMarcarSincronizados(codigos) {
  const db = await abrirDB();
  return new Promise((res) => {
    const tx = db.transaction("checkinsPendentes", "readwrite");
    const store = tx.objectStore("checkinsPendentes");
    for (const cod of codigos) {
      const r = store.get(cod);
      r.onsuccess = () => { if (r.result) store.put({ ...r.result, sincronizado: true }); };
    }
    tx.oncomplete = res;
  });
}

// ─── Validação browser (Web Crypto — offline) ─────────────────────────
function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const bin = atob(b64 + "=".repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function ctEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function validarTokenBrowser(token, eventoId, chaveHex) {
  try {
    const partes = token.split(".");
    if (partes.length !== 2) return { valido: false, motivo: "malformado" };
    const [corpo, sigRec] = partes;

    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(corpo)));
    } catch { return { valido: false, motivo: "malformado" }; }

    if (payload.evento_id !== eventoId) return { valido: false, motivo: "evento_errado" };

    const agora = Math.floor(Date.now() / 1000);
    if (agora < payload.nbf || agora > payload.exp) return { valido: false, motivo: "fora_da_janela" };

    const key = await crypto.subtle.importKey(
      "raw", hexToBytes(chaveHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigCalc = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(corpo)));
    if (!ctEqual(sigCalc, b64urlToBytes(sigRec))) return { valido: false, motivo: "assinatura_invalida" };

    return { valido: true, payload };
  } catch { return { valido: false, motivo: "malformado" }; }
}

// ─── Som / vibração ───────────────────────────────────────────────────
function tocar(tipo) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (tipo === "ok") {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else if (tipo === "ja_usado") {
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }
    ctx.close();
  } catch {}
  try {
    if (tipo === "ok") navigator.vibrate?.(100);
    else if (tipo === "ja_usado") navigator.vibrate?.([100, 50, 100]);
    else navigator.vibrate?.(500);
  } catch {}
}

// ─── Componente de resultado ──────────────────────────────────────────
function Resultado({ r }) {
  if (!r) return null;
  const cfg = {
    ok:         { bg: "#E8FBF4", border: "#00C896", icon: "✓", titulo: "Entrada liberada", cor: "#00734F" },
    offline_ok: { bg: "#E8FBF4", border: "#00C896", icon: "✓", titulo: "Entrada liberada (offline)", cor: "#00734F" },
    ja_usado:   { bg: "#FFFBEB", border: "#F5C842", icon: "⚠", titulo: "Já fez check-in", cor: "#7A5C00" },
    invalido:   { bg: "#FFF0F0", border: "#FFD0D0", icon: "✗", titulo: "Ingresso inválido", cor: "#C0392B" },
  };
  const c = cfg[r.tipo] ?? cfg.invalido;
  return (
    <div style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 16, padding: "24px 28px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,.12)" }}>
      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>{c.icon}</div>
      <p style={{ fontSize: 22, fontWeight: 700, color: c.cor, margin: "0 0 6px", fontFamily: fontDisplay }}>{c.titulo}</p>
      {r.nome && <p style={{ fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{r.nome}</p>}
      {r.email && <p style={{ fontSize: 14, color: T.muted, margin: "0 0 4px" }}>{r.email}</p>}
      {r.lote && <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{r.lote}</p>}
      {r.usadoEm && <p style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>às {r.usadoEm}</p>}
      {r.motivo && <p style={{ fontSize: 14, color: c.cor, marginTop: 8 }}>{r.motivo}</p>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────
export default function CheckinClient({ eventoId, eventoTitulo }) {
  const [modo, setModo] = useState("camera");
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [presentes, setPresentes] = useState(0);
  const [total, setTotal] = useState(0);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [syncPendente, setSyncPendente] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [cameraErro, setCameraErro] = useState("");
  const [busca, setBusca] = useState("");
  const [listaLocal, setListaLocal] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const pausadoRef = useRef(false);
  const resultTimerRef = useRef(null);

  // ── Inicializa SW + conexão ─────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw-checkin.js", { scope: "/painel/eventos/" }).catch(() => {});
  }, []);

  useEffect(() => {
    const on = () => { setOnline(true); sincronizarOffline(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Carrega dados (online) e cache offline ──────────────────────────
  const baixarDados = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${eventoId}/checkin-key`);
      if (!res.ok) return;
      const json = await res.json();
      setPresentes(json.presentes);
      setTotal(json.total);
      setListaLocal(json.ingressos ?? []);
      await idbSalvar({ ...json, eventoId, ts: Date.now() });
      setOfflineReady(true);
    } catch {
      // rede falhou — tenta carregar do cache
      const cache = await idbCarregar(eventoId).catch(() => null);
      if (cache) {
        setPresentes(cache.presentes ?? 0);
        setTotal(cache.total ?? 0);
        setListaLocal(cache.ingressos ?? []);
        setOfflineReady(true);
      }
    }
    // Conta pendentes
    const pend = await idbGetPendentes(eventoId).catch(() => []);
    setSyncPendente(pend.length);
  }, [eventoId]);

  useEffect(() => { baixarDados(); }, [baixarDados]);

  // ── Sync offline → servidor ─────────────────────────────────────────
  const sincronizarOffline = useCallback(async () => {
    const pend = await idbGetPendentes(eventoId).catch(() => []);
    if (pend.length === 0) return;
    setSincronizando(true);
    try {
      const res = await fetch(`/api/eventos/${eventoId}/checkin/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkins: pend }),
      });
      if (res.ok) {
        await idbMarcarSincronizados(pend.map((c) => c.codigo));
        setSyncPendente(0);
        baixarDados();
      }
    } catch {}
    setSincronizando(false);
  }, [eventoId, baixarDados]);

  // ── Processamento de um token (QR ou manual) ───────────────────────
  const processarCodigo = useCallback(async (tokenOuCodigo, isToken = true) => {
    if (carregando) return;
    setCarregando(true);

    let r;
    if (online) {
      const campo = isToken ? { token: tokenOuCodigo } : { codigo: tokenOuCodigo };
      try {
        const res = await fetch(`/api/eventos/${eventoId}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campo),
        });
        const json = await res.json();
        if (json.resultado === "ok") {
          r = { tipo: "ok", nome: json.nome, email: json.email, lote: json.lote };
          setPresentes((p) => p + 1);
        } else if (json.resultado === "ja_usado") {
          const h = json.usado_em ? new Date(json.usado_em).toLocaleTimeString("pt-BR") : "—";
          r = { tipo: "ja_usado", nome: json.nome, email: json.email, lote: json.lote, usadoEm: h };
        } else {
          r = { tipo: "invalido", motivo: json.motivo ?? "Ingresso inválido" };
        }
      } catch {
        r = { tipo: "invalido", motivo: "Erro de conexão — tente novamente" };
      }
    } else {
      // Validação offline (apenas QR, não busca manual sem rede)
      if (!isToken) {
        r = { tipo: "invalido", motivo: "Busca manual requer conexão" };
      } else {
        const cache = await idbCarregar(eventoId).catch(() => null);
        if (!cache?.chaveEvento) {
          r = { tipo: "invalido", motivo: "Dados offline não disponíveis. Conecte à internet e recarregue." };
        } else {
          const vr = await validarTokenBrowser(tokenOuCodigo, eventoId, cache.chaveEvento);
          if (!vr.valido) {
            r = { tipo: "invalido", motivo: MOTIVO_PT[vr.motivo] ?? vr.motivo };
          } else {
            const codigo = vr.payload.codigo;
            const ing = (cache.ingressos ?? []).find((i) => i.codigo === codigo);
            if (!ing) {
              r = { tipo: "invalido", motivo: MOTIVO_PT.nao_encontrado };
            } else if (ing.status === "usado") {
              const h = ing.usado_em ? new Date(ing.usado_em).toLocaleTimeString("pt-BR") : "—";
              r = { tipo: "ja_usado", nome: ing.nome, lote: ing.lote, usadoEm: h };
            } else if (ing.status === "cancelado") {
              r = { tipo: "invalido", motivo: "Ingresso cancelado" };
            } else {
              const disp = getDispositivo();
              await idbMarcarUsado(codigo, eventoId, disp);
              setPresentes((p) => p + 1);
              setSyncPendente((n) => n + 1);
              // Atualiza lista local em memória
              setListaLocal((ls) => ls.map((i) => i.codigo === codigo ? { ...i, status: "usado" } : i));
              r = { tipo: "offline_ok", nome: ing.nome, email: ing.email, lote: ing.lote };
            }
          }
        }
      }
    }

    tocar(r.tipo);
    setResultado(r);
    setCarregando(false);

    clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResultado(null);
      pausadoRef.current = false;
    }, 3000);
  }, [carregando, online, eventoId]);

  // ── Câmera + QR scanner ────────────────────────────────────────────
  useEffect(() => {
    if (modo !== "camera") return;
    let cancelled = false;

    async function iniciar() {
      setCameraErro("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        escanear();
      } catch (e) {
        if (!cancelled) setCameraErro(e.name === "NotAllowedError" ? "Permissão de câmera negada." : "Câmera não disponível.");
      }
    }

    function escanear() {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(async () => {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2 || pausadoRef.current) {
          escanear(); return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const jsQR = (await import("jsqr")).default;
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code?.data) {
            pausadoRef.current = true;
            await processarCodigo(code.data, true);
            escanear(); return;
          }
        } catch {}
        escanear();
      });
    }

    iniciar();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [modo, processarCodigo]);

  // ── Busca manual (por nome ou e-mail) ─────────────────────────────
  const buscaNorm = busca.trim().toLowerCase();
  const ingressosFiltrados = buscaNorm.length >= 2
    ? listaLocal.filter((i) =>
        i.nome.toLowerCase().includes(buscaNorm) ||
        (i.email && i.email.toLowerCase().includes(buscaNorm))
      )
    : listaLocal.slice(0, 20);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${T.line}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href={`/painel/eventos/${eventoId}`} style={{ color: T.muted, textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Voltar
            </Link>
            <span style={{ color: T.line }}>·</span>
            <span style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventoTitulo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Indicador online/offline */}
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: online ? "#E8FBF4" : "#FFF8EC", color: online ? "#00734F" : "#7A5C00" }}>
              {online ? "● Online" : "⚠ Offline"}
            </span>
            {/* Contador */}
            <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: T.ink, background: T.panel, padding: "4px 12px", borderRadius: 99 }}>
              {presentes}<span style={{ color: T.muted, fontWeight: 400 }}>/{total}</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        {/* Sync banner */}
        {syncPendente > 0 && (
          <div style={{ background: "#FFF8EC", border: "1px solid #F5C842", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 14, color: "#7A5C00" }}>
            <span>{syncPendente} check-in{syncPendente > 1 ? "s" : ""} pendente{syncPendente > 1 ? "s" : ""} de sincronização</span>
            {online && (
              <button
                onClick={sincronizarOffline}
                disabled={sincronizando}
                style={{ background: "#F5C842", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: sincronizando ? "not-allowed" : "pointer", color: "#5C4200", fontFamily: fontBody }}
              >
                {sincronizando ? "Sincronizando…" : "Sincronizar agora"}
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["camera", "📷 Câmera"], ["manual", "🔍 Busca manual"]].map(([m, l]) => (
            <button
              key={m}
              onClick={() => { setModo(m); setResultado(null); pausadoRef.current = false; }}
              style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${modo === m ? T.ink : T.line}`, background: modo === m ? "#F6F4FF" : "#fff", fontFamily: fontBody, fontSize: 14, fontWeight: 700, cursor: "pointer", color: T.ink }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── Modo câmera ── */}
        {modo === "camera" && (
          <div>
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3", marginBottom: 16 }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {/* Guia de leitura */}
              {!resultado && !cameraErro && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: "55%", aspectRatio: "1", border: "3px solid rgba(255,255,255,0.7)", borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
                </div>
              )}
              {/* Overlay de resultado */}
              {resultado && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <Resultado r={resultado} />
                </div>
              )}
              {cameraErro && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
                  <p style={{ color: "#fff", fontSize: 15 }}>{cameraErro}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 13, color: T.muted, textAlign: "center", margin: 0 }}>
              {carregando ? "Validando…" : "Aponte para o QR Code do ingresso"}
            </p>
          </div>
        )}

        {/* ── Modo busca manual ── */}
        {modo === "manual" && (
          <div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              style={{ width: "100%", boxSizing: "border-box", height: 48, borderRadius: 12, border: `1px solid ${T.line}`, padding: "0 16px", fontSize: 16, fontFamily: fontBody, color: T.ink, background: "#fff", outline: "none", marginBottom: 16 }}
            />
            {resultado && <div style={{ marginBottom: 16 }}><Resultado r={resultado} /></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ingressosFiltrados.map((ing) => (
                <div
                  key={ing.codigo}
                  style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ing.nome || "—"}</p>
                    {ing.email && <p style={{ fontSize: 12, color: T.muted, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ing.email}</p>}
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{ing.lote}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {ing.status === "usado" ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, background: T.panel, padding: "4px 10px", borderRadius: 99 }}>Já entrou</span>
                    ) : ing.status === "cancelado" ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B", background: "#FFF0F0", padding: "4px 10px", borderRadius: 99 }}>Cancelado</span>
                    ) : (
                      <button
                        onClick={() => processarCodigo(ing.codigo, false)}
                        disabled={carregando || !online}
                        style={{ padding: "8px 18px", background: carregando || !online ? T.muted : T.mint, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: carregando || !online ? "not-allowed" : "pointer", fontFamily: fontBody }}
                      >
                        Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {ingressosFiltrados.length === 0 && buscaNorm.length >= 2 && (
                <p style={{ fontSize: 14, color: T.muted, textAlign: "center", padding: "24px 0" }}>Nenhum participante encontrado.</p>
              )}
              {listaLocal.length === 0 && (
                <p style={{ fontSize: 14, color: T.muted, textAlign: "center", padding: "24px 0" }}>Carregando lista de participantes…</p>
              )}
            </div>
          </div>
        )}

        {/* Nota sobre limite offline (documentado, não resolvido) */}
        {!online && (
          <p style={{ fontSize: 12, color: T.muted, marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
            Modo offline: os check-ins são validados localmente e sincronizados quando a rede voltar.
            Se dois dispositivos validarem o mesmo QR offline, o servidor detecta e reporta o conflito no sync.
          </p>
        )}
      </main>
    </div>
  );
}
