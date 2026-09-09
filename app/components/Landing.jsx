"use client";

import React, { useState, useMemo } from "react";
import { T, BRL } from "../../lib/tokens";


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
function Nav() {
  return (
    <header
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px clamp(20px,5vw,72px)", maxWidth: 1240, margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo />
        <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
          Ingressa
        </span>
      </div>
      <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
        {[["Como funciona", "#como-funciona"], ["Para organizadores", "#calc"], ["Preços", "#precos"]].map(([x, href]) => (
          <a key={x} href={href} style={{ color: T.ink2, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
            {x}
          </a>
        ))}
        <a href="#lista-espera" style={{ ...btn.ghost, textDecoration: "none" }}>Entrar</a>
        <a href="#lista-espera" style={{ ...btn.solid, textDecoration: "none" }}>Criar evento</a>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="1" y="6" width="28" height="18" rx="5" fill={T.ink} />
      <circle cx="1" cy="15" r="3.4" fill={T.surface} />
      <circle cx="29" cy="15" r="3.4" fill={T.surface} />
      <line x1="15" y1="9" x2="15" y2="21" stroke={T.coral} strokeWidth="2.2" strokeDasharray="2 2.4" strokeLinecap="round" />
    </svg>
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
          5,9% + processamento a custo — sem taxa escondida
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
          Venda inscrições para retiros, congressos e encontros com repasse antecipado
          e uma taxa que você entende de cabeça. Sem surpresa no fim do mês.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <a href="#lista-espera" style={{ ...btn.solid, padding: "15px 26px", fontSize: 16, textDecoration: "none" }}>Criar meu evento</a>
          <a href="#calc" style={{ ...btn.ghost, padding: "15px 26px", fontSize: 16, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Calcular minha taxa
          </a>
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 38 }}>
          <Stat n="5,9%" l="+ processamento a custo" />
          <Stat n="24h" l="para o repasse cair" />
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
  const [qty, setQty] = useState(2);
  const price = 150;
  const fee = Math.max(price * 0.059, 1.50);
  const proc = Math.max(price * 0.0099, 1.00); // Pix processing at cost
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          background: "#fff", borderRadius: 22, border: `1px solid ${T.line}`,
          boxShadow: "0 30px 60px -30px rgba(26,16,53,0.35)", overflow: "hidden",
        }}
      >
        <div style={{ background: T.ink, color: "#fff", padding: "22px 26px" }}>
          <div style={{ fontSize: 13, color: "#B9AEE0", fontWeight: 500 }}>Congresso Recomeço 2026</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, marginTop: 4 }}>
            Ingresso — Lote 1
          </div>
          <div style={{ fontSize: 13.5, color: "#B9AEE0", marginTop: 8 }}>
            14 mar · 08h · Centro de Convenções, Blumenau
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
          <Row k={`Taxa de serviço — 5,9% (${qty} × ${BRL(fee)})`} v={BRL(fee * qty)} sub />
          <Row k={`Processamento Pix (${qty} × ${BRL(proc)})`} v={BRL(proc * qty)} sub />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Total</span>
            <span style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: T.ink }}>
              {BRL(price * qty + fee * qty + proc * qty)}
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
        style={{
          maxWidth: 1240, margin: "0 auto", padding: "18px clamp(20px,5vw,72px)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}
      >
        <span style={{ fontSize: 14, color: T.muted }}>Feito para</span>
        {["Retiros e acampamentos", "Congressos e convenções", "Encontros de comunidade", "Eventos universitários", "Festivais e celebrações"].map((x) => (
          <span key={x} style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 500, color: T.ink2, opacity: 0.85 }}>
            {x}
          </span>
        ))}
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
        {field("Nome completo", "Marina Alves de Souza")}
        {field("E-mail", "marina@email.com")}
        {field("CPF", "123.456.789-00")}
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
      <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600 }}>Tudo certo, Marina!</div>
      <div style={{ fontSize: 14.5, color: T.ink2, marginTop: 8, lineHeight: 1.55 }}>
        Seu ingresso está no e-mail. Mostre o QR Code na entrada.
      </div>
      <div style={{ marginTop: 18, padding: "12px", borderRadius: 12, background: T.panel, fontSize: 13, color: T.muted }}>
        Pedido #IG-48213 · Congresso Recomeço 2026
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

  const SVC_PCT = 0.059;
  const SVC_MIN = 1.50;
  // Gateway costs (Asaas, repassed at cost, no markup)
  const PIX_PCT = 0.0099;
  const PIX_MIN = 1.00;
  const CARD_PCT = 0.0349;
  const CARD_FIX = 0.49;
  const MIX_CARD = 0.40; // 40% cartão, 60% Pix
  const MIX_PIX = 0.60;
  const PCT_COMPET = 0.079; // 7,9% e-inscrição (gateway embutido)
  const COMPET_MIN = 1.90;

  const m = useMemo(() => {
    const svcUnit = Math.max(ticket * SVC_PCT, SVC_MIN);
    const gwUnit = MIX_PIX * Math.max(ticket * PIX_PCT, PIX_MIN) + MIX_CARD * (ticket * CARD_PCT + CARD_FIX);
    const totalUnit = svcUnit + gwUnit;

    const svcYear = svcUnit * qty * events;
    const gwYear = gwUnit * qty * events;
    const totalYear = totalUnit * qty * events;

    const compUnit = Math.max(ticket * PCT_COMPET, COMPET_MIN);
    const compYear = compUnit * qty * events;

    const gmvYear = ticket * qty * events;
    const orgNetYear = absorb === "comprador" ? gmvYear : (ticket - svcUnit - gwUnit) * qty * events;
    return { svcUnit, gwUnit, totalUnit, svcYear, gwYear, totalYear, compUnit, compYear, gmvYear, orgNetYear };
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
            5,9% de serviço + processamento a custo real, separados. Compare com os 7,9% que o concorrente cobra com gateway embutido.
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
            <div style={{ background: T.mint, borderRadius: 20, padding: "clamp(22px,3vw,32px)", color: T.ink }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.mintDk }}>O nosso diferencial</div>
              <div style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "8px 0 10px" }}>
                Você vê cada centavo antes de publicar
              </div>
              <div style={{ fontSize: 14.5, color: T.ink2 }}>
                5,9% de serviço + processamento a custo real — separados, auditáveis, sem embutir na taxa.
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "clamp(22px,3vw,32px)", marginTop: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
              <ResRow k="Serviço Ingressa (5,9%)" a={BRL(m.svcUnit)} b={`${BRL(m.compUnit)} tudo junto`} />
              <ResRow k="Processamento (custo real)" a={BRL(m.gwUnit)} b="embutido" />
              <div style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 13, color: "#8F84B5", lineHeight: 1.55, margin: 0 }}>
                  No concorrente, os 7,9% cobrem serviço e gateway juntos — você nunca vê quanto é de cada.
                </p>
              </div>
              <div style={{ height:1, background:"rgba(255,255,255,0.12)", margin:"16px 0" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span style={{ fontSize:14.5, color:"#C7BDE8" }}>
                  {absorb==="comprador" ? "Você recebe (100% do valor)" : "Você recebe (líquido das taxas)"}
                </span>
                <span style={{ fontFamily:fontDisplay, fontSize:24, fontWeight:700 }}>{BRL(m.orgNetYear)}</span>
              </div>
            </div>
            <a href="#lista-espera" style={{ ...btn.solid, background:T.coral, width:"100%", marginTop:16, padding:"15px", fontSize:16, justifyContent:"center", boxSizing:"border-box", textDecoration:"none", display:"flex" }}>
              Começar com esse cenário
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResRow({ k, a, b, big }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, alignItems: "baseline", padding: "7px 0" }}>
      <span style={{ fontSize: 14, color: "#C7BDE8" }}>{k}</span>
      <span style={{ fontSize: big ? 17 : 14.5, fontWeight: 600, color: T.mint, textAlign: "right" }}>{a}</span>
      <span style={{ fontSize: big ? 15 : 13.5, color: "#8F84B5", textAlign: "right", textDecoration: "line-through" }}>{b}</span>
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
  const plans = [
    { name: "Avulso", price: "5,9%", unit: "+ processamento a custo", desc: "Sem mensalidade. Você paga 5,9% de serviço mais o custo real do Pix ou cartão, sem markup. Tudo visível antes de publicar.", feats: ["Processamento a preço de custo", "Repasse em 24h", "Check-in por QR Code", "Sem taxa escondida"], cta: "Criar evento", hot: false },
    { name: "Recorrente", price: "R$149", unit: "/mês + 3,9% serviço", desc: "Para quem faz vários eventos no ano. Taxa de serviço reduzida; processamento sempre repassado a custo.", feats: ["Serviço reduzido a 3,9%", "Processamento a custo", "Antecipação de repasse", "Página de organizador", "Suporte prioritário"], cta: "Falar com vendas", hot: true },
    { name: "Pacote", price: "a partir de R$0,99", unit: "/ingresso, pré-pago", desc: "Lote de inscrições com desconto por volume. Processamento repassado a custo à parte.", feats: ["De R$1,90 (200) a R$0,99 (5.000)", "Créditos válidos por 12 meses", "Processamento a custo", "Melhor para alto volume"], cta: "Ver pacotes", hot: false },
  ];
  return (
    <section id="precos" style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(48px,7vw,88px) clamp(20px,5vw,72px)" }}>
      <SectionHead kicker="Preços" title="Escolha pela sua recorrência, não pela letra miúda" sub="Sem taxa de setup, sem fidelidade. Mude de plano quando seu calendário mudar." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 40 }} className="plans">
        {plans.map((p) => (
          <div key={p.name} style={{
            background: p.hot ? T.ink : "#fff", color: p.hot ? "#fff" : T.ink,
            borderRadius: 20, padding: 30, border: `1px solid ${p.hot ? T.ink : T.line}`,
            position: "relative", boxShadow: p.hot ? "0 30px 60px -30px rgba(26,16,53,0.5)" : "none",
          }}>
            {p.hot && <div style={{ position:"absolute", top:20, right:20, fontSize:12, fontWeight:600, color:T.ink, background:T.mint, padding:"4px 10px", borderRadius:99 }}>Mais escolhido</div>}
            <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "14px 0 6px" }}>
              <span style={{ fontFamily: fontDisplay, fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>{p.price}</span>
              <span style={{ fontSize: 15, color: p.hot ? "#B9AEE0" : T.muted }}>{p.unit}</span>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: p.hot ? "#C7BDE8" : T.ink2, minHeight: 66 }}>{p.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "18px 0 24px" }}>
              {p.feats.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill={p.hot?"rgba(0,200,150,0.2)":"#E9FBF4"}/><path d="M7 12.5l3 3 7-7" stroke={T.mintDk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <a href="#lista-espera" style={{ ...(p.hot ? { ...btn.solid, background: T.coral } : btn.solidLight), display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", textDecoration: "none", padding: "13px" }}>
              {p.cta}
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
        <form
          action="mailto:contato@ingressa.com.br"
          method="get"
          encType="text/plain"
          style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}
        >
          <input
            type="email" name="body" placeholder="seu@email.com" required
            style={{ flex: 1, minWidth: 220, height: 48, borderRadius: 11, border: `1px solid ${T.line}`, padding: "0 16px", fontSize: 15, fontFamily: fontBody, color: T.ink, background: "#fff", outline: "none" }}
          />
          <button type="submit" style={{ ...btn.solid, padding: "0 24px", height: 48 }}>
            Entrar na lista
          </button>
        </form>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 14 }}>Sem spam. Só um aviso quando abrirmos.</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: T.panel, borderTop: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px clamp(20px,5vw,72px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo />
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18 }}>Ingressa</span>
        </div>
        <span style={{ fontSize: 13.5, color: T.muted }}>Protótipo de conceito · não é um produto real</span>
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
