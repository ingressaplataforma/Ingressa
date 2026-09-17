"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { T, BRL } from "../../lib/tokens";
import { PLANOS } from "../../lib/planos-catalogo";


const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";


// ---------- Root ----------
export default function Landing() {
  return (
    <div style={{ background: T.surface, color: T.ink, fontFamily: fontBody, minHeight: "100vh" }}>
      <Nav />
      <Hero />
      <SocialProof />
      <BuyFlow />
      <Calculator />
      <PlansStrip />
      <Waitlist />
      <Footer />
    </div>
  );
}


// ---------- Nav ----------
const NAV_LINKS = [
  ["Como funciona", "#como-funciona"],
  ["Para organizadores", "#calc"],
  ["Preços", "#precos"],
  ["Eventos", "/eventos"],
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 12);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha o menu ao clicar em um link interno
  function handleNavClick(href) {
    setMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#fff",
      borderBottom: `1px solid ${scrolled || menuOpen ? T.line : "transparent"}`,
      boxShadow: scrolled ? "0 2px 16px -4px rgba(26,16,53,0.12)" : "none",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px clamp(16px,5vw,72px)", maxWidth: 1240, margin: "0 auto",
      }}>
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); window.history.pushState(null, "", "/"); }}
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0, minWidth: 130 }}
        >
          <Image src="/ingressa_logo_header.png" alt="Ingressa" width={130} height={43} style={{ width: 130, height: "auto", display: "block" }} priority />
        </a>

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{ gap: 28, alignItems: "center" }}>
          {NAV_LINKS.map(([x, href]) => (
            <a key={x} href={href} style={{ color: T.ink2, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
              {x}
            </a>
          ))}
          <a href="/entrar" style={{ ...btn.ghost, textDecoration: "none" }}>Entrar</a>
          <a href="/cadastro/organizador" style={{ ...btn.solid, textDecoration: "none" }}>Criar evento</a>
        </nav>

        {/* Mobile: botão hambúrguer */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: 8, borderRadius: 8, color: T.ink,
          }}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile menu drawer */}
      <div
        className="nav-mobile-menu"
        style={{
          flexDirection: "column",
          background: "#fff",
          borderTop: `1px solid ${T.line}`,
          padding: menuOpen ? "20px clamp(16px,5vw,72px) 28px" : 0,
          maxHeight: menuOpen ? 480 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease, padding 0.25s ease",
        }}
      >
        {NAV_LINKS.map(([x, href]) => (
          <a
            key={x}
            href={href}
            onClick={(e) => { if (href.startsWith("#")) { e.preventDefault(); handleNavClick(href); } else setMenuOpen(false); }}
            style={{ color: T.ink2, textDecoration: "none", fontSize: 17, fontWeight: 500, padding: "10px 0", borderBottom: `1px solid ${T.line}` }}
          >
            {x}
          </a>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          <a href="/entrar" onClick={() => setMenuOpen(false)}
            style={{ ...btn.ghost, textDecoration: "none", justifyContent: "center", textAlign: "center" }}>
            Entrar
          </a>
          <a href="/cadastro/organizador" onClick={() => setMenuOpen(false)}
            style={{ ...btn.solid, textDecoration: "none", justifyContent: "center", textAlign: "center" }}>
            Criar evento
          </a>
          <a href="/cadastro/comprador" onClick={() => setMenuOpen(false)}
            style={{ fontSize: 14, color: T.muted, textDecoration: "none", textAlign: "center", padding: "4px 0" }}>
            Só comprar ingressos?
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------- Hero ----------
function Hero() {
  return (
    <section
      style={{
        maxWidth: 1240, margin: "0 auto", padding: "clamp(24px,5vw,56px) clamp(20px,5vw,72px)",
        display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "center",
      }}
      className="hero"
    >
      <div>
        <div style={pill}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: T.mint, display: "inline-block" }} />
          3% no Pix · processamento Pix grátis · sem taxa escondida
        </div>
        <h1
          style={{
            fontFamily: fontDisplay, fontWeight: 600, lineHeight: 1.02,
            fontSize: "clamp(40px,6vw,68px)", letterSpacing: "-0.03em", margin: "20px 0 0",
          }}
        >
          Ingressos que <span style={{ fontStyle: "italic", color: T.coral }}>cabem</span> no
          orçamento de quem organiza.
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.55, color: T.ink2, maxWidth: 520, margin: "22px 0 32px" }}>
          3% de serviço no Pix — e o processamento Pix é grátis, repassamos essa economia inteira.
          A taxa mais transparente para shows, cursos, festas, congressos e muito mais. Sem surpresa no fim do mês.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <a href="/cadastro/organizador" style={{ ...btn.solid, padding: "15px 26px", fontSize: 16, textDecoration: "none" }}>Criar meu evento</a>
          <a href="#calc" style={{ ...btn.ghost, padding: "15px 26px", fontSize: 16, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Calcular minha taxa
          </a>
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 38 }}>
          <Stat n="3%" l="serviço no Pix · sem processamento" />
          <Stat n="Pix" l="repasse no próx. dia útil" />
          <Stat n="0%" l="em eventos gratuitos" />
        </div>
      </div>
      <TicketMock />
    </section>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 26, color: T.ink }}>{n}</div>
      <div style={{ fontSize: 13.5, color: T.muted, marginTop: 2 }}>{l}</div>
    </div>
  );
}

// Interactive ticket in hero — the product IS the purchase
function TicketMock() {
  const [qty, setQty] = useState(1);
  const price = 99;
  const fee = Math.max(price * 0.03, 0.99); // Pix: 3%, piso R$0,99
  const proc = 0; // Pix: sem taxa de processamento
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          background: "#fff", borderRadius: 22, border: `1px solid ${T.line}`,
          boxShadow: "0 30px 60px -30px rgba(26,16,53,0.35)", overflow: "hidden",
        }}
      >
        <div style={{ background: T.ink, color: "#fff", padding: "22px 26px" }}>
          <div style={{ fontSize: 13, color: "#B9AEE0", fontWeight: 500 }}>Nome do seu evento</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, marginTop: 4 }}>
            Ingresso — Lote 1
          </div>
          <div style={{ fontSize: 13.5, color: "#B9AEE0", marginTop: 8 }}>
            Data · horário · local do evento
          </div>
        </div>
        <Perf />
        <div style={{ padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: T.muted }}>Valor unitário</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600 }}>{BRL(price)}</div>
            </div>
            <Stepper qty={qty} setQty={setQty} />
          </div>
          <div style={{ height: 1, background: T.line, margin: "18px 0" }} />
          <Row k={`${qty} × ingresso`} v={BRL(price * qty)} />
          <Row k={`Taxa de serviço Pix — 3% (${qty} × ${BRL(fee)})`} v={BRL(fee * qty)} sub />
          {/* Pix: processamento grátis */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 14.5, color: T.muted }}>Processamento Pix</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.mintDk, background: "#E9FBF4", borderRadius: 6, padding: "2px 8px" }}>grátis</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Total</span>
            <span style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: T.ink }}>
              {BRL(price * qty + fee * qty)}
            </span>
          </div>
          <button style={{ ...btn.solid, width: "100%", marginTop: 18, padding: "15px", fontSize: 16, justifyContent: "center" }}>
            Pagar com Pix
          </button>
          <div style={{ textAlign: "center", fontSize: 12.5, color: T.muted, marginTop: 10 }}>
            Confirmação na hora · QR Code no seu e-mail
          </div>
        </div>
      </div>
    </div>
  );
}

function Perf() {
  return (
    <div style={{ position: "relative", height: 22, background: T.ink }}>
      <div style={{ position: "absolute", top: -11, left: -11, width: 22, height: 22, borderRadius: 99, background: T.surface }} />
      <div style={{ position: "absolute", top: -11, right: -11, width: 22, height: 22, borderRadius: 99, background: T.surface }} />
      <div style={{ position: "absolute", top: 10, left: 16, right: 16, borderTop: `2px dashed ${T.line}` }} />
    </div>
  );
}

function Stepper({ qty, setQty }) {
  const b = {
    width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.line}`,
    background: "#fff", fontSize: 20, cursor: "pointer", color: T.ink, lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button style={b} onClick={() => setQty(Math.max(1, qty - 1))}>–</button>
      <span style={{ fontWeight: 600, fontSize: 18, width: 18, textAlign: "center" }}>{qty}</span>
      <button style={b} onClick={() => setQty(Math.min(10, qty + 1))}>+</button>
    </div>
  );
}

function Row({ k, v, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
      <span style={{ fontSize: 14.5, color: sub ? T.muted : T.ink2 }}>{k}</span>
      <span style={{ fontSize: 14.5, color: sub ? T.muted : T.ink2, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

// ---------- Social proof ----------
function SocialProof() {
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, background: T.panel }}>
      <div
        className="social-proof-inner"
        style={{
          maxWidth: 1240, margin: "0 auto", padding: "18px clamp(20px,5vw,72px)",
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 28px",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
          Feito para
        </span>
        <div className="social-proof-items" style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px", alignItems: "center" }}>
          {["Shows e festivais", "Cursos e workshops", "Congressos e palestras", "Festas e celebrações", "Eventos esportivos", "Confraternizações"].map((x) => (
            <span key={x} style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 500, color: T.ink2, opacity: 0.85 }}>
              {x}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Buy flow (full purchase journey) ----------
function BuyFlow() {
  const [step, setStep] = useState(0);
  const steps = ["Escolher ingresso", "Seus dados", "Pagamento Pix", "Confirmado"];
  return (
    <section id="como-funciona" style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(48px,7vw,88px) clamp(20px,5vw,72px)" }}>
      <SectionHead
        kicker="O que seu público vê"
        title="Da escolha ao QR Code em quatro toques"
        sub="Um fluxo de compra curto converte mais. Clique pelas etapas — é exatamente o que o participante vive."
      />
      <div style={{ display: "flex", gap: 10, margin: "36px 0 28px", flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", borderRadius: 99,
              border: `1px solid ${i === step ? T.ink : T.line}`, cursor: "pointer",
              background: i === step ? T.ink : "#fff", color: i === step ? "#fff" : T.ink2,
              fontSize: 14, fontWeight: 500, transition: "all .15s",
            }}
          >
            <span
              style={{
                width: 20, height: 20, borderRadius: 99, fontSize: 12, fontWeight: 600,
                display: "grid", placeItems: "center",
                background: i === step ? T.coral : T.panel, color: i === step ? "#fff" : T.muted,
              }}
            >
              {i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>
      <div
        style={{
          background: T.panel, borderRadius: 24, border: `1px solid ${T.line}`,
          padding: "clamp(24px,4vw,44px)", minHeight: 300,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center",
        }}
        className="flowcard"
      >
        <FlowPane step={step} setStep={setStep} />
        <FlowVisual step={step} />
      </div>
    </section>
  );
}

function FlowPane({ step, setStep }) {
  const next = () => setStep(Math.min(3, step + 1));
  const panes = [
    {
      h: "Escolha o lote e a quantidade",
      p: "Lotes, meia-entrada, combos de família — tudo em uma tela. O preço final aparece antes de qualquer dado, sem taxa escondida.",
      cta: "Continuar",
    },
    {
      h: "Só o essencial",
      p: "Nome, e-mail e CPF para a nota. Nada de cadastro obrigatório com senha — quanto menos campos, menos gente desiste no meio.",
      cta: "Ir para pagamento",
    },
    {
      h: "Pix aprovado na hora",
      p: "QR Code na tela ou copia-e-cola. A confirmação chega em segundos, e o repasse pro organizador começa a contar imediatamente.",
      cta: "Simular pagamento",
    },
    {
      h: "Ingresso no bolso",
      p: "QR Code enviado por e-mail e disponível no celular. Na entrada do evento, o check-in lê o código offline — sem depender de sinal.",
      cta: "Recomeçar",
    },
  ];
  const c = panes[step];
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>
        Etapa {step + 1} de 4
      </div>
      <h3 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        {c.h}
      </h3>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: T.ink2, maxWidth: 380 }}>{c.p}</p>
      <button
        style={{ ...btn.solid, marginTop: 24, padding: "13px 24px" }}
        onClick={() => setStep(step === 3 ? 0 : step + 1)}
      >
        {c.cta}
      </button>
    </div>
  );
}

function FlowVisual({ step }) {
  const box = {
    background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, padding: 22,
    boxShadow: "0 20px 40px -28px rgba(26,16,53,0.3)",
  };
  const field = (label, val) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ height: 40, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, color: T.ink2 }}>
        {val}
      </div>
    </div>
  );

  if (step === 0)
    return (
      <div style={box}>
        {[["Lote 1 — Inteira", "R$ 150,00", true], ["Lote 1 — Meia", "R$ 75,00", false], ["Combo Família (4)", "R$ 520,00", false]].map(([n, p, on]) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${on ? T.coral : T.line}`, marginBottom: 10, background: on ? "#FFF5F5" : "#fff" }}>
            <span style={{ fontSize: 15, fontWeight: on ? 600 : 500, color: T.ink }}>{n}</span>
            <span style={{ fontSize: 15, color: T.ink2 }}>{p}</span>
          </div>
        ))}
      </div>
    );
  if (step === 1)
    return (
      <div style={box}>
        {field("Nome completo", "Participante")}
        {field("E-mail", "participante@email.com")}
        {field("CPF", "000.000.000-00")}
      </div>
    );
  if (step === 2)
    return (
      <div style={{ ...box, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>Escaneie para pagar</div>
        <QR />
        <div style={{ marginTop: 14, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>R$ 303,80</div>
        <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>Expira em 09:58</div>
      </div>
    );
  return (
    <div style={{ ...box, textAlign: "center", padding: 30 }}>
      <div style={{ width: 60, height: 60, borderRadius: 99, background: T.mint, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600 }}>Inscrição confirmada!</div>
      <div style={{ fontSize: 14.5, color: T.ink2, marginTop: 8, lineHeight: 1.55 }}>
        Seu ingresso está no e-mail. Mostre o QR Code na entrada.
      </div>
      <div style={{ marginTop: 18, padding: "12px", borderRadius: 12, background: T.panel, fontSize: 13, color: T.muted }}>
        Pedido de exemplo · Seu evento
      </div>
    </div>
  );
}

function QR() {
  // deterministic pseudo-QR
  const cells = [];
  const seed = [1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,1,0,1,0,1,1,0,1,0];
  for (let i = 0; i < 25; i++) {
    const row = [];
    for (let j = 0; j < 25; j++) {
      row.push((seed[(i * 7 + j * 3) % 25] + i * j) % 2 === 0);
    }
    cells.push(row);
  }
  return (
    <svg width="140" height="140" viewBox="0 0 25 25" style={{ background: "#fff" }}>
      {cells.map((row, i) =>
        row.map((on, j) => (on ? <rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill={T.ink} /> : null))
      )}
      {[[0,0],[18,0],[0,18]].map(([x,y],k)=>(
        <g key={k}>
          <rect x={x} y={y} width="7" height="7" fill="none" stroke={T.ink} strokeWidth="1"/>
          <rect x={x+2} y={y+2} width="3" height="3" fill={T.coral}/>
        </g>
      ))}
    </svg>
  );
}

// ---------- Calculator (conversion anchor for organizers) ----------
function Calculator() {
  const [ticket, setTicket] = useState(150);
  const [qty, setQty] = useState(500);
  const [events, setEvents] = useState(6);
  const [absorb, setAbsorb] = useState("comprador"); // quem paga a taxa

  // Serviço Ingressa por meio de pagamento
  const PIX_SVC_PCT = 0.03;    // 3% no Pix
  const PIX_SVC_MIN = 0.99;    // piso R$0,99
  const CARD_SVC_PCT = 0.025;  // 2,5% no cartão (serviço aliviado, pois o comprador já paga o custo da operadora à parte)
  // Gateway Asaas (repassado a custo, sem markup)
  // Pix: R$0,00 — grátis
  // Cartão à vista: 2,99% + R$0,49, recebimento em ~32 dias
  const CARD_PROC_PCT = 0.0299;
  const CARD_PROC_FIX = 0.49;
  const MIX_CARD = 0.40; // 40% cartão, 60% Pix (mix estimado)
  const MIX_PIX  = 0.60;
  const PCT_COMPET = 0.079; // concorrente: ~7,9% no Pix (serviço+gateway embutidos)
  const COMPET_MIN = 1.90;

  const m = useMemo(() => {
    // Serviço por transação
    const pixSvcUnit  = Math.max(ticket * PIX_SVC_PCT,  PIX_SVC_MIN);
    const cardSvcUnit = ticket * CARD_SVC_PCT;
    // Processamento por transação (apenas cartão; Pix=0)
    const cardProcUnit = ticket * CARD_PROC_PCT + CARD_PROC_FIX;
    // Custos ponderados pelo mix (por ingresso, em média)
    const pixSvcBlended   = MIX_PIX  * pixSvcUnit;
    const cardSvcBlended  = MIX_CARD * cardSvcUnit;
    const cardProcBlended = MIX_CARD * cardProcUnit;
    const svcUnit   = pixSvcBlended + cardSvcBlended;   // serviço médio
    const gwUnit    = cardProcBlended;                  // processamento médio (Pix=0)
    const totalUnit = svcUnit + gwUnit;

    const svcYear   = svcUnit   * qty * events;
    const gwYear    = gwUnit    * qty * events;
    const totalYear = totalUnit * qty * events;

    const compUnit = Math.max(ticket * PCT_COMPET, COMPET_MIN);
    const compYear = compUnit * qty * events;

    const gmvYear    = ticket * qty * events;
    const orgNetYear = absorb === "comprador" ? gmvYear : (ticket - totalUnit) * qty * events;

    const pixSvcYear  = pixSvcBlended  * qty * events;
    const cardSvcYear = cardSvcBlended * qty * events;
    const compradorPagaYear = absorb === "comprador" ? gmvYear + totalYear : gmvYear;

    return {
      pixSvcUnit, cardSvcUnit, cardProcUnit,
      pixSvcBlended, cardSvcBlended, cardProcBlended,
      svcUnit, gwUnit, totalUnit,
      svcYear, gwYear, totalYear,
      pixSvcYear, cardSvcYear, compradorPagaYear,
      compUnit, compYear, gmvYear, orgNetYear,
    };
  }, [ticket, qty, events, absorb]);

  return (
    <section id="calc" style={{ background: T.ink, color: "#fff" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(48px,7vw,88px) clamp(20px,5vw,72px)" }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 12 }}>
            Calculadora de taxa
          </div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: "clamp(30px,4.5vw,46px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0 }}>
            Veja exatamente o que você paga — antes de publicar.
          </h2>
          <p style={{ fontSize: 17, color: "#C7BDE8", marginTop: 16, lineHeight: 1.55 }}>
            3% no Pix (processamento grátis). Cartão: 2,5% de serviço + custo real da operadora. Cada linha separada — não um percentual que mistura tudo.
          </p>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 44, alignItems: "start" }}
          className="calcgrid"
        >
          {/* controls */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "clamp(22px,3vw,32px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Slider label="Valor do ingresso" value={ticket} min={10} max={500} step={5} onChange={setTicket} fmt={BRL} />
            <Slider label="Inscrições por evento" value={qty} min={20} max={3000} step={10} onChange={setQty} fmt={(v)=>v.toLocaleString("pt-BR")} />
            <Slider label="Eventos por ano" value={events} min={1} max={24} step={1} onChange={setEvents} fmt={(v)=>`${v}`} />
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 14, color: "#C7BDE8", marginBottom: 10 }}>Quem paga a taxa?</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["comprador","O comprador"],["organizador","Eu absorvo"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setAbsorb(k)}
                    style={{ flex:1, padding:"11px", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:500,
                      border:`1px solid ${absorb===k?T.coral:"rgba(255,255,255,0.18)"}`,
                      background: absorb===k?"rgba(255,90,95,0.18)":"transparent", color:"#fff" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* results */}
          <div>
            {/* 1. Conta aberta — decomposição principal */}
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "clamp(22px,3vw,32px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8F84B5", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
                Sua conta aberta — mix {(MIX_PIX*100).toFixed(0)}% Pix / {(MIX_CARD*100).toFixed(0)}% cartão
              </div>

              {/* Pix */}
              <div style={{ background: "rgba(62,207,142,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid rgba(62,207,142,0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.mintDk, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Pix ({(MIX_PIX*100).toFixed(0)}% das vendas)</div>
                <TaxaRow k={`Serviço 3% (mín. R$0,99) × ${(MIX_PIX*100).toFixed(0)}%`} v={BRL(m.pixSvcBlended)} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                  <span style={{ fontSize: 14, color: "#C7BDE8" }}>Processamento Pix</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.mintDk, background: "rgba(62,207,142,0.18)", borderRadius: 6, padding: "2px 8px" }}>grátis</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.mintDk, marginTop: 4 }}>Repasse no próximo dia útil</div>
              </div>

              {/* Cartão */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8F84B5", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cartão ({(MIX_CARD*100).toFixed(0)}% das vendas)</div>
                <TaxaRow k={`Serviço 2,5% × ${(MIX_CARD*100).toFixed(0)}%`} v={BRL(m.cardSvcBlended)} />
                <TaxaRow k={`Processamento (2,99%+R$0,49) × ${(MIX_CARD*100).toFixed(0)}%`} v={BRL(m.cardProcBlended)} />
                <div style={{ fontSize: 11.5, color: "#8F84B5", marginTop: 4 }}>Recebimento em ~32 dias</div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 13, color: "#8F84B5", lineHeight: 1.6, margin: 0 }}>
                  No mercado, cobram ~7,9% no Pix — tudo misturado. Aqui: 3% de serviço e o processamento Pix é zero. Você vê cada linha.
                </p>
              </div>

              {/* 2. Você recebe — muda com o toggle */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "20px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#C7BDE8", marginBottom: 4 }}>
                    {absorb === "comprador"
                      ? "Você recebe — o comprador paga as taxas por cima"
                      : "Você recebe — líquido de serviço e processamento"}
                  </div>
                  <div style={{ fontSize: 12, color: "#8F84B5" }}>
                    {absorb === "comprador"
                      ? `Participante paga ${BRL(m.totalUnit)} a mais por ingresso (média)`
                      : `${BRL(m.totalUnit)} descontados por ingresso (média)`}
                  </div>
                </div>
                <span style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                  {BRL(m.orgNetYear)}
                </span>
              </div>
            </div>

            {/* 2. A conta completa — resumo anual */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px 22px", marginTop: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8F84B5", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
                A conta completa — {qty.toLocaleString("pt-BR")} ingressos × {events} evento{events !== 1 ? "s" : ""}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                <span style={{ fontSize: 14, color: "#C7BDE8" }}>Faturamento bruto (GMV)</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{BRL(m.gmvYear)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0" }}>
                <div>
                  <span style={{ fontSize: 14, color: "#C7BDE8" }}>Serviço Ingressa</span>
                  <span style={{ fontSize: 11, color: T.coral, display: "block", marginTop: 1 }}>nossa receita · Pix {BRL(m.pixSvcYear)} + cartão {BRL(m.cardSvcYear)}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.coral, flexShrink: 0, marginLeft: 8 }}>−{BRL(m.svcYear)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <span style={{ fontSize: 14, color: "#C7BDE8" }}>Custo processamento cartão</span>
                  <span style={{ fontSize: 11, color: "#8F84B5", display: "block", marginTop: 1 }}>repassado a custo — Ingressa não lucra nisso</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#8F84B5", flexShrink: 0, marginLeft: 8 }}>−{BRL(m.gwYear)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Total de taxas</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.coral }}>−{BRL(m.totalYear)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 10, marginTop: 2 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {absorb === "comprador" ? "Comprador paga (total)" : "Organizador recebe (líquido)"}
                  </div>
                  <div style={{ fontSize: 11, color: "#8F84B5", marginTop: 2 }}>
                    {absorb === "comprador"
                      ? "ingresso + taxas repassadas ao participante"
                      : "GMV descontado das taxas que você absorve"}
                  </div>
                </div>
                <span style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, flexShrink: 0, marginLeft: 12,
                  color: absorb === "comprador" ? "#fff" : T.mint }}>
                  {BRL(absorb === "comprador" ? m.compradorPagaYear : m.orgNetYear)}
                </span>
              </div>
            </div>

            {/* 3. Mensagem de transparência — secundária, abaixo */}
            <div style={{ background: T.mint, borderRadius: 16, padding: "18px 22px", marginTop: 12, color: T.ink, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.mintDk, marginBottom: 3 }}>O nosso diferencial</div>
                <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  Você vê cada centavo antes de publicar
                </div>
              </div>
            </div>

            <a href="#lista-espera" style={{ ...btn.solid, background: T.coral, width: "100%", marginTop: 12, padding: "15px", fontSize: 16, justifyContent: "center", boxSizing: "border-box", textDecoration: "none", display: "flex" }}>
              Começar com esse cenário
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TaxaRow({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0" }}>
      <span style={{ fontSize: 14, color: "#C7BDE8" }}>{k}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: T.mint }}>{v}</span>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#C7BDE8" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: fontDisplay }}>{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 6, borderRadius: 99, appearance: "none", cursor: "pointer",
          background: `linear-gradient(90deg, ${T.coral} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
        }}
      />
    </div>
  );
}

// ---------- Plans ----------
function PlansStrip() {
  return (
    <section id="precos" style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(48px,7vw,88px) clamp(20px,5vw,72px)" }}>
      <SectionHead
        kicker="Preços"
        title="Comece grátis. Evolua quando crescer."
        sub="Comece com 3 eventos gratuitos — sem cartão, sem aprovação. Quando seu calendário crescer, escolha o plano que cabe no seu ritmo. Sem letra miúda."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 40 }} className="plans">
        {PLANOS.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "26px 24px",
              border: p.entrada ? `2px solid ${T.coral}` : `1px solid ${T.line}`,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              opacity: p.disponivel ? 1 : 0.82,
            }}
          >
            {/* Badges */}
            {p.entrada && (
              <div style={{ position: "absolute", top: -12, left: 20, fontSize: 11, fontWeight: 700, color: "#fff", background: T.coral, padding: "3px 12px", borderRadius: 99, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Comece aqui
              </div>
            )}
            {!p.disponivel && (
              <div style={{ position: "absolute", top: 18, right: 18, fontSize: 11, fontWeight: 700, color: T.ink2, background: T.panel, border: `1px solid ${T.line}`, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Em breve
              </div>
            )}

            {/* Título */}
            <div style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, marginBottom: 14 }}>{p.nome}</div>

            {/* Preço */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: p.preco.startsWith("a partir") ? 22 : 34, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {p.preco}
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{p.unidade}</div>
            </div>

            {/* Descrição */}
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: T.ink2, margin: "0 0 16px", flexGrow: 0 }}>{p.desc}</p>

            {/* Itens */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22, flexGrow: 1 }}>
              {p.beneficios.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: T.ink2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="12" fill="#E9FBF4"/>
                    <path d="M7 12.5l3 3 7-7" stroke={T.mintDk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={p.hrefLanding}
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px",
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: fontBody,
                ...(p.entrada
                  ? { background: T.coral, color: "#fff", border: "none" }
                  : !p.disponivel
                    ? { background: "transparent", color: T.ink2, border: `1px solid ${T.line}` }
                    : { background: T.ink, color: "#fff", border: "none" }),
              }}
            >
              {p.ctaLanding}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Shared ----------
function SectionHead({ kicker, title, sub }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 12 }}>{kicker}</div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: "clamp(28px,4vw,42px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 17, color: T.ink2, marginTop: 14, lineHeight: 1.55 }}>{sub}</p>
    </div>
  );
}

// ---------- Waitlist ----------
function Waitlist() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | loading | ok | duplicate | erro

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("lista_espera")
        .insert({ email: email.trim(), origem: "landing" });
      if (error) {
        setStatus(error.code === "23505" ? "duplicate" : "erro");
      } else {
        setStatus("ok");
      }
    } catch {
      setStatus("erro");
    }
  }

  return (
    <section id="lista-espera" style={{ background: T.panel, borderTop: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(48px,7vw,80px) clamp(20px,5vw,72px)", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 12 }}>Lista de espera</div>
        <h2 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,40px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 0 14px" }}>
          Seja avisado quando abrirmos
        </h2>
        <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.6, margin: "0 0 32px" }}>
          A Ingressa está em desenvolvimento. Deixe seu e-mail e entraremos em contato assim que a plataforma estiver disponível.
        </p>

        {status === "ok" ? (
          <div style={{ background: "#E6FAF4", border: `1px solid ${T.mint}`, borderRadius: 12, padding: "16px 24px", fontSize: 15, color: T.mintDk, fontWeight: 500 }}>
            Você entrou na lista. Avisaremos quando abrir.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" required
              style={{ flex: 1, minWidth: 220, height: 48, borderRadius: 11, border: `1px solid ${T.line}`, padding: "0 16px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: "#fff", outline: "none" }}
            />
            <button type="submit" disabled={status === "loading"} style={{ ...btn.solid, padding: "0 24px", height: 48, opacity: status === "loading" ? 0.7 : 1 }}>
              {status === "loading" ? "Salvando…" : "Entrar na lista"}
            </button>
          </form>
        )}

        {status === "duplicate" && (
          <p style={{ fontSize: 14, color: T.muted, marginTop: 12 }}>Este e-mail já está na lista.</p>
        )}
        {status === "erro" && (
          <p style={{ fontSize: 14, color: T.coral, marginTop: 12 }}>Algo deu errado. Tente novamente.</p>
        )}
        {status !== "ok" && (
          <p style={{ fontSize: 13, color: T.muted, marginTop: 14 }}>Sem spam. Só um aviso quando abrirmos.</p>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: T.panel, borderTop: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px clamp(20px,5vw,72px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flexShrink: 0, minWidth: 130, lineHeight: 0 }}>
          <Image src="/ingressa_logo_header.png" alt="Ingressa" width={130} height={43} style={{ width: 130, height: "auto", display: "block" }} />
        </div>
        <span style={{ fontSize: 13.5, color: T.muted }}>© {new Date().getFullYear()} Ingressa</span>
      </div>
    </footer>
  );
}

// ---------- Buttons ----------
const btn = {
  solid: { background: T.ink, color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fontBody },
  solidLight: { background: T.ink, color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: fontBody },
  ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 11, padding: "11px 18px", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: fontBody },
};

const pill = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 99,
  background: T.panel, border: `1px solid ${T.line}`, fontSize: 13.5, fontWeight: 500, color: T.ink2,
};
