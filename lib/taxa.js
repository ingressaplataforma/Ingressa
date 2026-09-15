/**
 * Cálculo de taxa de serviço e divisão do split — SERVER-ONLY.
 * Reutilizado em /api/checkout e no checkout UI (para preview).
 */

import {
  TAXA_PIX_PCT,
  TAXA_PIX_MIN_CENTS,
  TAXA_CARTAO_PCT,
  TAXA_BOLETO_MIN_CENTS,
} from './config-repasse.js';

/**
 * Calcula a taxa de serviço da plataforma sobre um lote.
 *
 * @param {number} precoCents - preço unitário em centavos
 * @param {'pix'|'cartao'|'boleto'} meio
 * @returns {number} taxa em centavos (inteiro)
 */
export function calcularTaxa(precoCents, meio) {
  if (meio === 'pix') {
    return Math.max(Math.round(precoCents * TAXA_PIX_PCT / 100), TAXA_PIX_MIN_CENTS);
  }
  if (meio === 'cartao') {
    return Math.round(precoCents * TAXA_CARTAO_PCT / 100);
  }
  if (meio === 'boleto') {
    return Math.max(Math.round(precoCents * TAXA_PIX_PCT / 100), TAXA_BOLETO_MIN_CENTS);
  }
  throw new Error(`Meio de pagamento desconhecido: ${meio}`);
}

/**
 * Monta os valores do pedido dado o preço, meio e quem paga a taxa.
 *
 * @param {object} opts
 * @param {number} opts.precoCents - preço unitário em centavos
 * @param {'pix'|'cartao'|'boleto'} opts.meio
 * @param {'comprador'|'organizador'} opts.quemPagaTaxa
 * @returns {{ taxaCents: number, orgRecebeCents: number, totalCents: number }}
 */
export function montarValoresPedido({ precoCents, meio, quemPagaTaxa }) {
  const taxaCents = calcularTaxa(precoCents, meio);

  if (quemPagaTaxa === 'comprador') {
    // Comprador paga o ingresso + a taxa por cima
    return {
      taxaCents,
      orgRecebeCents: precoCents,
      totalCents: precoCents + taxaCents,
    };
  }

  // Organizador absorve: comprador paga só o ingresso; taxa sai do repasse
  const orgRecebeCents = precoCents - taxaCents;
  if (orgRecebeCents <= 0) {
    throw new Error('Valor do ingresso é menor que a taxa de serviço.');
  }
  return {
    taxaCents,
    orgRecebeCents,
    totalCents: precoCents,
  };
}
