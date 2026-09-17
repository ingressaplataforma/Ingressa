// Fonte única de verdade para os planos da Ingressa.
// Consumido pela landing (PlansStrip) e pelo painel (/painel/plano).
// Para marcar um plano como funcional ou "em breve", altere apenas `disponivel` aqui.

export const PLANOS = [
  {
    id: "gratis",
    nome: "Grátis",
    preco: "R$ 0",
    unidade: "até 3 eventos",
    desc: "Crie e publique até 3 eventos sem pagar nada. Inscrições, ingressos com QR e check-in inclusos. Ideal para começar e testar a plataforma.",
    beneficios: [
      "Até 3 eventos",
      "Inscrições ilimitadas por evento",
      "Ingresso com QR Code",
      "Check-in",
      "Sem cartão de crédito",
    ],
    ctaLanding: "Criar meu primeiro evento",
    hrefLanding: "/cadastro",
    entrada: true,    // badge "Comece aqui" + borda coral na landing
    disponivel: true,
  },
  {
    id: "recorrente",
    nome: "Recorrente",
    preco: "a partir de R$ 149",
    unidade: "/mês",
    desc: "Para quem faz muitos eventos no ano. Assinatura mensal com eventos ilimitados; processamento sempre repassado a custo real.",
    beneficios: [
      "Eventos ilimitados",
      "Ingressos pagos (split automático via Pix)",
      "Repasse antecipado ao organizador",
      "Relatórios de vendas e check-in",
    ],
    ctaLanding: "Criar conta de organizador",
    hrefLanding: "/cadastro/organizador",
    entrada: false,
    disponivel: true, // único plano pago funcional (assinatura mensal via Asaas)
  },
  {
    id: "avulso",
    nome: "Avulso",
    preco: "3% no Pix",
    unidade: "a partir de R$ 0,99 por ingresso",
    desc: "Pague só pelo que vender. No Pix: 3% (mín. R$ 0,99) — processamento grátis. No cartão: 2,5% de serviço + custo real da operadora. Sem mensalidade.",
    beneficios: [
      "Pix: 3% (mín. R$ 0,99), processamento grátis",
      "Cartão: 2,5% + custo real (2,99%+R$0,49)",
      "Repasse Pix no próx. dia útil",
      "Sem mensalidade",
    ],
    ctaLanding: "Avise-me quando lançar",
    hrefLanding: "#lista-espera",
    entrada: false,
    disponivel: false, // depende de split de pagamento (Bloco 4.3, aguardando CNPJ)
  },
  {
    id: "pacote",
    nome: "Pacote",
    preco: "a partir de R$ 0,99",
    unidade: "por ingresso, pré-pago",
    desc: "Compre inscrições em lote com desconto por volume. Quanto maior o pacote, menor o preço por ingresso. O processamento é repassado a custo à parte.",
    beneficios: [
      "De R$ 1,90 (200) a R$ 0,99 (5.000)",
      "Créditos válidos por 12 meses",
      "Processamento a custo à parte",
      "Melhor para alto volume",
    ],
    ctaLanding: "Avise-me quando lançar",
    hrefLanding: "#lista-espera",
    entrada: false,
    disponivel: false, // ainda não construído
  },
];
