/**
 * Configurações de repasse e taxa de serviço — CALIBRAR com dados reais de chargeback.
 *
 * NÃO cravar esses valores em lógica de negócio; importar sempre daqui.
 * Para alterar, mude aqui e faça deploy; nenhuma migração de banco necessária.
 */

// ── Taxa de serviço Ingressa ──────────────────────────────────────────────────

/** Pix: % sobre o valor do ingresso (ex: 3 = 3 %) */
export const TAXA_PIX_PCT = 3;

/** Pix: mínimo da taxa em centavos (R$ 0,99 = 99) */
export const TAXA_PIX_MIN_CENTS = 99;

/** Cartão e boleto: % sobre o valor do ingresso (sem custo de processadora) */
export const TAXA_CARTAO_PCT = 2.5;

/** Boleto: mínimo da taxa em centavos (mesmo patamar do Pix) */
export const TAXA_BOLETO_MIN_CENTS = 99;

// ── Reserva e repasse ─────────────────────────────────────────────────────────

/**
 * % do valor do organizador retido como reserva após o evento.
 * Cobre chargebacks e reembolsos pós-liberação.
 * Iniciar conservador; calibrar com dados reais de chargeback após 90 dias.
 */
export const RESERVA_PCT = 15;

/**
 * Dias após a data do evento para liberar a reserva.
 * CDC: prazo legal de desistência é 7 dias; reservar mais tempo protege a plataforma.
 */
export const RESERVA_DIAS_POS_EVENTO = 30;

/**
 * Prazo legal de desistência (CDC art. 49) em dias.
 * Dentro desse prazo o comprador pode solicitar reembolso total.
 */
export const CDC_PRAZO_DIAS = 7;

// ── Nota sobre split nativo do Asaas ─────────────────────────────────────────
//
// O split PIX do Asaas repassa ao recebedor no dia útil seguinte ao pagamento.
// Isso significa que, na prática, o dinheiro do organizador já saiu da conta
// da plataforma antes da janela CDC de 7 dias vencer.
//
// A reserva (RESERVA_PCT) é um conceito CONTÁBIL no ledger — não uma retenção
// real no Asaas. Se um reembolso ocorrer após o repasse, a plataforma cobre o
// prejuízo e cobra de volta do organizador fora do sistema.
//
// Para retenção real no Asaas, avaliar o recurso "split com data de liberação"
// (disponível no plano Enterprise do Asaas) quando o volume justificar.
