/**
 * Ledger double-entry — implementação em memória.
 * Mesmas invariantes do schema.sql e repasse.py, sem dependência de banco.
 * Usado diretamente nos testes (jest/vitest) e como referência para a camada DB.
 *
 * Regras inegociáveis:
 *  - Valores sempre em CENTAVOS (inteiros).
 *  - Append-only: nenhuma mutação nos lançamentos existentes.
 *  - Toda transação fecha em zero (débitos = créditos).
 *  - Idempotência por chave única: duplicata é no-op silencioso.
 *  - Saldo derivado (soma dos lançamentos), nunca coluna guardada.
 */

import { randomUUID } from 'crypto';

// ──────────────────────────────────────────────────────────────
// Erro do ledger
// ──────────────────────────────────────────────────────────────
export class LedgerErro extends Error {
  constructor(msg) { super(msg); this.name = 'LedgerErro'; }
}

// ──────────────────────────────────────────────────────────────
// Ledger em memória
// ──────────────────────────────────────────────────────────────
export class LedgerMemoria {
  constructor() {
    this._lancamentos = [];  // { transacao_id, conta, direcao, valor_cents }
    this._chaves = new Set();
  }

  /**
   * Registra uma transação atômica.
   * @param {string} tipo - Ex: 'VENDA', 'LIBERACAO', ...
   * @param {string} chaveIdempotencia - chave única por evento
   * @param {Array<{conta:string, direcao:'debito'|'credito', valor_cents:number}>} pernas
   * @returns {'duplicada'|string} 'duplicada' se já processado, ou transacao_id
   */
  registrar(tipo, chaveIdempotencia, pernas) {
    if (this._chaves.has(chaveIdempotencia)) return 'duplicada';

    if (pernas.some(p => p.valor_cents <= 0)) {
      throw new LedgerErro('Valor de lançamento deve ser positivo.');
    }

    const somaZero = pernas.reduce(
      (acc, p) => p.direcao === 'debito' ? acc + p.valor_cents : acc - p.valor_cents,
      0
    );
    if (somaZero !== 0) {
      throw new LedgerErro(`Transação ${tipo} não fecha em zero (saldo=${somaZero}).`);
    }

    const tid = randomUUID();
    for (const { conta, direcao, valor_cents } of pernas) {
      this._lancamentos.push({ transacao_id: tid, conta, direcao, valor_cents });
    }
    this._chaves.add(chaveIdempotencia);
    return tid;
  }

  /** Saldo derivado de uma conta (crédito positivo). */
  saldo(conta) {
    return this._lancamentos
      .filter(l => l.conta === conta)
      .reduce((acc, l) => l.direcao === 'credito' ? acc + l.valor_cents : acc - l.valor_cents, 0);
  }
}

// ──────────────────────────────────────────────────────────────
// Estado de um lote em trânsito na máquina de repasse
// ──────────────────────────────────────────────────────────────
export const EstadoLote = Object.freeze({
  A_LIBERAR:  'a_liberar',
  DISPONIVEL: 'disponivel',
  REPASSADO:  'repassado',
  BLOQUEADO:  'bloqueado',
});

export function criarLoteVenda({
  pedidoId,
  organizadorId,
  valorCents,
  dataEvento,
  reservaPct = 15,
  reservaDiasPosEvento = 7,
}) {
  return {
    pedidoId,
    organizadorId,
    valorCents,
    dataEvento,
    reservaPct,
    reservaDiasPosEvento,
    estado: EstadoLote.A_LIBERAR,
    reservaCents() { return Math.round(this.valorCents * this.reservaPct / 100); },
    disponivelCents() { return this.valorCents - this.reservaCents(); },
    _c() { return `organizador:${this.organizadorId}`; },
  };
}

// ──────────────────────────────────────────────────────────────
// Máquina de repasse
// ──────────────────────────────────────────────────────────────
export class Repasse {
  constructor(ledger) {
    this.ledger = ledger;
  }

  /** Transição 1: venda confirmada → credita a_liberar do organizador. */
  registrarVenda(lote, { taxaCents, totalPagoCents }) {
    this.ledger.registrar('VENDA', `VENDA:${lote.pedidoId}`, [
      { conta: 'participante:entrada',      direcao: 'debito',  valor_cents: totalPagoCents },
      { conta: 'plataforma:taxa',           direcao: 'credito', valor_cents: taxaCents },
      { conta: `${lote._c()}:a_liberar`,    direcao: 'credito', valor_cents: lote.valorCents },
    ]);
  }

  /** Transição 2: régua permite → move a_liberar para disponivel(85%) + reserva(15%). */
  liberar(lote, agora) {
    if (lote.estado !== EstadoLote.A_LIBERAR) return false;
    if (!this._reguaPermite(lote, agora)) return false;

    this.ledger.registrar('LIBERACAO', `LIBERACAO:${lote.pedidoId}`, [
      { conta: `${lote._c()}:a_liberar`,  direcao: 'debito',  valor_cents: lote.valorCents },
      { conta: `${lote._c()}:disponivel`, direcao: 'credito', valor_cents: lote.disponivelCents() },
      { conta: `${lote._c()}:reserva`,    direcao: 'credito', valor_cents: lote.reservaCents() },
    ]);
    lote.estado = EstadoLote.DISPONIVEL;
    return true;
  }

  /** Transição 3: janela de reserva vencida → reserva vira disponivel. */
  liberarReserva(lote, agora) {
    if (lote.estado !== EstadoLote.DISPONIVEL) return false;
    const janela = new Date(lote.dataEvento.getTime() + lote.reservaDiasPosEvento * 864e5);
    if (agora < janela) return false;
    const r = lote.reservaCents();
    if (r === 0) return false;

    this.ledger.registrar('LIBERACAO_RESERVA', `LIBERACAO_RESERVA:${lote.pedidoId}`, [
      { conta: `${lote._c()}:reserva`,    direcao: 'debito',  valor_cents: r },
      { conta: `${lote._c()}:disponivel`, direcao: 'credito', valor_cents: r },
    ]);
    return true;
  }

  /** Reembolso: devolve ao participante a partir do estado atual do lote. */
  reembolsar(lote, { taxaCents, totalPagoCents, devolveTaxa = true }) {
    const contaOrigem = lote.estado === EstadoLote.A_LIBERAR ? 'a_liberar' : 'disponivel';
    const pernas = [
      { conta: `${lote._c()}:${contaOrigem}`, direcao: 'debito',  valor_cents: lote.valorCents },
    ];

    if (devolveTaxa) {
      pernas.push({ conta: 'plataforma:taxa',      direcao: 'debito',  valor_cents: taxaCents });
      pernas.push({ conta: 'participante:entrada',  direcao: 'credito', valor_cents: totalPagoCents });
    } else {
      pernas.push({ conta: 'participante:entrada',  direcao: 'credito', valor_cents: totalPagoCents - taxaCents });
    }

    this.ledger.registrar('REEMBOLSO', `REEMBOLSO:${lote.pedidoId}`, pernas);
    lote.estado = EstadoLote.BLOQUEADO;
  }

  _reguaPermite(_lote, _agora) {
    // MVP: libera na confirmação (imediato). Configurável por evento em 4.3.
    return true;
  }
}

/** Job agendado: varre lotes e aplica transições devidas. */
export function rodarJobs(repasse, lotes, agora) {
  const stats = { liberados: 0, reservasLiberadas: 0 };
  for (const lote of lotes) {
    if (repasse.liberar(lote, agora)) stats.liberados++;
    if (repasse.liberarReserva(lote, agora)) stats.reservasLiberadas++;
  }
  return stats;
}
