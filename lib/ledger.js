/**
 * Camada DB do ledger — server-only.
 * NÃO importar em componentes cliente ou código exposto ao browser.
 *
 * Usa a RPC `registrar_transacao_ledger` (SECURITY DEFINER) para
 * garantir atomicidade e validação double-entry no banco.
 */

/**
 * Registra uma transação no ledger via RPC.
 *
 * @param {object} supabase - cliente Supabase server-side
 * @param {object} opts
 * @param {string} opts.tipo - tipo da transação (ex: 'VENDA')
 * @param {string} opts.chave - chave de idempotência única
 * @param {string|null} [opts.pedidoId] - FK para tabela pedido (nullable)
 * @param {string|null} [opts.referenciaExt] - id externo (ex: charge_id do Asaas)
 * @param {Array<{conta:string, direcao:'debito'|'credito', valor_cents:number}>} opts.pernas
 * @returns {Promise<{status:'ok'|'duplicada', transacao_id:string}>}
 */
export async function registrarTransacao(supabase, {
  tipo,
  chave,
  pedidoId = null,
  referenciaExt = null,
  pernas,
}) {
  // Validação JS antes do round-trip ao banco (falha rápida)
  if (!pernas || pernas.length === 0) throw new Error('Ledger: transação sem pernas.');
  if (pernas.some(p => !Number.isInteger(p.valor_cents) || p.valor_cents <= 0)) {
    throw new Error('Ledger: valor_cents deve ser inteiro positivo em todas as pernas.');
  }

  const somaZero = pernas.reduce(
    (acc, p) => p.direcao === 'debito' ? acc + p.valor_cents : acc - p.valor_cents,
    0
  );
  if (somaZero !== 0) {
    throw new Error(`Ledger: transação ${tipo} não fecha em zero (saldo=${somaZero}).`);
  }

  const { data, error } = await supabase.rpc('registrar_transacao_ledger', {
    p_tipo:          tipo,
    p_chave:         chave,
    p_pedido_id:     pedidoId,
    p_referencia_ext: referenciaExt,
    p_pernas:        pernas,
  });

  if (error) throw new Error(`Ledger DB: ${error.message}`);
  return data;  // { status: 'ok'|'duplicada', transacao_id }
}

/**
 * Saldo de uma conta específica (consultando a view saldo_conta).
 * Retorna 0 se a conta nunca teve movimentação.
 *
 * @param {object} supabase
 * @param {string} conta - ex: 'organizador:{uuid}:disponivel'
 * @returns {Promise<number>} saldo em centavos
 */
export async function saldoConta(supabase, conta) {
  const { data, error } = await supabase
    .from('saldo_conta')
    .select('saldo_cents')
    .eq('conta', conta)
    .maybeSingle();

  if (error) throw new Error(`Ledger saldo: ${error.message}`);
  return data?.saldo_cents ?? 0;
}

/**
 * Retorna todos os saldos de um organizador (a_liberar, disponivel, reserva).
 *
 * @param {object} supabase
 * @param {string} organizadorId
 * @returns {Promise<{a_liberar:number, disponivel:number, reserva:number}>}
 */
export async function saldosOrganizador(supabase, organizadorId) {
  const prefixo = `organizador:${organizadorId}:`;
  const { data, error } = await supabase
    .from('saldo_conta')
    .select('conta, saldo_cents')
    .like('conta', `${prefixo}%`);

  if (error) throw new Error(`Ledger saldos: ${error.message}`);

  const mapa = Object.fromEntries((data ?? []).map(r => [r.conta.replace(prefixo, ''), r.saldo_cents]));
  return {
    a_liberar:  mapa.a_liberar  ?? 0,
    disponivel: mapa.disponivel ?? 0,
    reserva:    mapa.reserva    ?? 0,
  };
}
