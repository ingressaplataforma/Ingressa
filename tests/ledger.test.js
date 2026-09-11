/**
 * Testes do ledger double-entry (em memória, sem banco de dados).
 * Porta fiel dos cenários T1–T8 do repasse.py, mais casos extras.
 *
 * Rodar: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  LedgerMemoria,
  LedgerErro,
  Repasse,
  EstadoLote,
  criarLoteVenda,
  rodarJobs,
} from '../lib/ledger-core.js';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function novoLedger() {
  const led = new LedgerMemoria();
  return { led, rep: new Repasse(led) };
}

const HOJE    = new Date('2026-03-01');
const EVENTO  = new Date('2026-03-14');

function loteBase() {
  return criarLoteVenda({
    pedidoId:       'ped-1',
    organizadorId:  'org-42',
    valorCents:     15000,   // R$150,00
    dataEvento:     EVENTO,
  });
}

// ──────────────────────────────────────────────────────────────
// T1 — Venda credita a_liberar
// ──────────────────────────────────────────────────────────────
describe('T1: venda', () => {
  it('credita a_liberar do organizador e taxa da plataforma', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });

    expect(led.saldo('organizador:org-42:a_liberar')).toBe(15000);
    expect(led.saldo('plataforma:taxa')).toBe(190);
    expect(led.saldo('participante:entrada')).toBe(-15190);
  });
});

// ──────────────────────────────────────────────────────────────
// T2 — Liberação move a_liberar para disponivel(85%) + reserva(15%)
// ──────────────────────────────────────────────────────────────
describe('T2: liberação 85/15', () => {
  it('move a_liberar para disponivel e reserva nas proporções corretas', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    rep.liberar(lote, HOJE);

    expect(led.saldo('organizador:org-42:a_liberar')).toBe(0);
    expect(led.saldo('organizador:org-42:disponivel')).toBe(12750); // 85%
    expect(led.saldo('organizador:org-42:reserva')).toBe(2250);     // 15%
    expect(lote.estado).toBe(EstadoLote.DISPONIVEL);
  });
});

// ──────────────────────────────────────────────────────────────
// T3 — Reserva NÃO libera antes da janela (evento + 7 dias)
// ──────────────────────────────────────────────────────────────
describe('T3: reserva retida antes da janela', () => {
  it('não libera se ainda dentro do período de reserva', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    rep.liberar(lote, HOJE);

    const dentro = new Date(EVENTO.getTime() + 3 * 864e5); // +3 dias
    const liberou = rep.liberarReserva(lote, dentro);

    expect(liberou).toBe(false);
    expect(led.saldo('organizador:org-42:reserva')).toBe(2250);
  });
});

// ──────────────────────────────────────────────────────────────
// T4 — Reserva libera após a janela (evento + 7 dias)
// ──────────────────────────────────────────────────────────────
describe('T4: reserva liberada após janela', () => {
  it('move reserva para disponivel após o período', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    rep.liberar(lote, HOJE);

    const apos = new Date(EVENTO.getTime() + 8 * 864e5); // +8 dias
    rep.liberarReserva(lote, apos);

    expect(led.saldo('organizador:org-42:reserva')).toBe(0);
    expect(led.saldo('organizador:org-42:disponivel')).toBe(15000);
  });
});

// ──────────────────────────────────────────────────────────────
// T5 — Idempotência: webhook duplicado não duplica lançamento
// ──────────────────────────────────────────────────────────────
describe('T5: idempotência', () => {
  it('não duplica lançamentos ao processar a mesma chave duas vezes', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    const saldoAntes = led.saldo('organizador:org-42:a_liberar');

    // Simula webhook duplicado
    const resultado = rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    // registrarVenda internamente chama ledger.registrar que retorna 'duplicada'

    expect(led.saldo('organizador:org-42:a_liberar')).toBe(saldoAntes);
  });

  it('ledger.registrar retorna "duplicada" na segunda chamada com mesma chave', () => {
    const led = new LedgerMemoria();
    led.registrar('VENDA', 'chave-x', [
      { conta: 'a', direcao: 'debito',  valor_cents: 100 },
      { conta: 'b', direcao: 'credito', valor_cents: 100 },
    ]);
    const resultado = led.registrar('VENDA', 'chave-x', [
      { conta: 'a', direcao: 'debito',  valor_cents: 100 },
      { conta: 'b', direcao: 'credito', valor_cents: 100 },
    ]);
    expect(resultado).toBe('duplicada');
  });
});

// ──────────────────────────────────────────────────────────────
// T6 — Soma-zero imposta: transação que não fecha é rejeitada
// ──────────────────────────────────────────────────────────────
describe('T6: soma-zero imposta', () => {
  it('lança LedgerErro quando débitos ≠ créditos', () => {
    const led = new LedgerMemoria();
    expect(() =>
      led.registrar('X', 'k1', [
        { conta: 'a', direcao: 'debito',  valor_cents: 100 },
        { conta: 'b', direcao: 'credito', valor_cents: 90  },
      ])
    ).toThrow(LedgerErro);
  });

  it('lança LedgerErro para valor não-positivo', () => {
    const led = new LedgerMemoria();
    expect(() =>
      led.registrar('X', 'k2', [
        { conta: 'a', direcao: 'debito',  valor_cents: 0   },
        { conta: 'b', direcao: 'credito', valor_cents: 0   },
      ])
    ).toThrow(LedgerErro);
  });
});

// ──────────────────────────────────────────────────────────────
// T7 — Reembolso pós-liberação puxa de disponivel
// ──────────────────────────────────────────────────────────────
describe('T7: reembolso pós-liberação', () => {
  it('devolve tudo ao participante e zera a taxa da plataforma', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    rep.liberar(lote, HOJE);
    rep.reembolsar(lote, { taxaCents: 190, totalPagoCents: 15190, devolveTaxa: true });

    expect(led.saldo('participante:entrada')).toBe(0);  // recebeu tudo de volta
    expect(led.saldo('plataforma:taxa')).toBe(0);       // taxa devolvida
    // 12750 (disponivel liberado) - 15000 (reembolso) = -2250 (risco documentado)
    expect(led.saldo('organizador:org-42:disponivel')).toBe(12750 - 15000);
    expect(lote.estado).toBe(EstadoLote.BLOQUEADO);
  });
});

// ──────────────────────────────────────────────────────────────
// T8 — Job em lote: libera múltiplos lotes de uma vez
// ──────────────────────────────────────────────────────────────
describe('T8: job em lote', () => {
  it('processa 3 lotes em uma chamada e libera todos', () => {
    const { led, rep } = novoLedger();
    const lotes = [0, 1, 2].map(i => criarLoteVenda({
      pedidoId:      `p${i}`,
      organizadorId: 'org-9',
      valorCents:    10000,
      dataEvento:    EVENTO,
    }));

    for (const lo of lotes) {
      rep.registrarVenda(lo, { taxaCents: 190, totalPagoCents: 10190 });
    }

    const apos = new Date(EVENTO.getTime() + 8 * 864e5);
    const stats = rodarJobs(rep, lotes, apos);

    expect(stats.liberados).toBe(3);
    expect(stats.reservasLiberadas).toBe(3);
    expect(led.saldo('organizador:org-9:disponivel')).toBe(30000);
    expect(led.saldo('organizador:org-9:reserva')).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// Extra — invariantes de integridade
// ──────────────────────────────────────────────────────────────
describe('invariantes extras', () => {
  it('saldo de conta inexistente é 0', () => {
    const led = new LedgerMemoria();
    expect(led.saldo('organizador:ninguem:disponivel')).toBe(0);
  });

  it('liberar falha se o lote não está em A_LIBERAR', () => {
    const { rep } = novoLedger();
    const lote = loteBase();
    lote.estado = EstadoLote.DISPONIVEL;
    const result = rep.liberar(lote, HOJE);
    expect(result).toBe(false);
  });

  it('liberar_reserva falha se a janela não passou', () => {
    const { led, rep } = novoLedger();
    const lote = loteBase();
    rep.registrarVenda(lote, { taxaCents: 190, totalPagoCents: 15190 });
    rep.liberar(lote, HOJE);
    const result = rep.liberarReserva(lote, EVENTO); // exatamente no dia — não passou
    expect(result).toBe(false);
  });

  it('duas transações independentes não interferem nos saldos uma da outra', () => {
    const { led, rep } = novoLedger();
    const loteA = criarLoteVenda({ pedidoId: 'pA', organizadorId: 'orgA', valorCents: 10000, dataEvento: EVENTO });
    const loteB = criarLoteVenda({ pedidoId: 'pB', organizadorId: 'orgB', valorCents: 20000, dataEvento: EVENTO });
    rep.registrarVenda(loteA, { taxaCents: 190, totalPagoCents: 10190 });
    rep.registrarVenda(loteB, { taxaCents: 190, totalPagoCents: 20190 });

    expect(led.saldo('organizador:orgA:a_liberar')).toBe(10000);
    expect(led.saldo('organizador:orgB:a_liberar')).toBe(20000);
  });
});
