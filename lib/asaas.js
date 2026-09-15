/**
 * Cliente Asaas — SERVER-ONLY.
 * NÃO importar em componentes cliente. A ASAAS_API_KEY fica apenas no servidor.
 *
 * Ambiente alvo: SANDBOX (https://api-sandbox.asaas.com/api/v3/)
 * Em produção, trocar ASAAS_BASE_URL para https://api.asaas.com/api/v3/
 *
 * Ref: https://docs.asaas.com/reference/criar-nova-subconta
 *      https://docs.asaas.com/reference/criar-nova-cobranca
 */

// Remove barra final caso ASAAS_BASE_URL venha com "/" no .env.local
const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/api/v3').replace(/\/$/, '');

function getApiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY não configurada. Adicione ao .env.local (sandbox).');
  return key;
}

async function asaasRequest(method, path, body) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'access_token': getApiKey(),
      'Content-Type': 'application/json',
      'User-Agent':   'Ingressa/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.errors?.[0]?.description ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(`Asaas ${method} ${path}: ${msg}`);
  }
  return json;
}

// ──────────────────────────────────────────────────────────────
// Subcontas / Recebedores
// ──────────────────────────────────────────────────────────────

/**
 * Cria uma subconta (recebedor para split).
 * O `walletId` retornado deve ser salvo em organizador.gateway_recipient_id.
 *
 * @param {{name:string, email:string, cpfCnpj:string, mobilePhone:string, address?:string, addressNumber?:string, province?:string, postalCode?:string}} dados
 * @returns {Promise<{id:string, walletId:string, ...}>}
 */
export async function criarSubconta(dados) {
  return asaasRequest('POST', '/accounts', dados);
}

/**
 * Consulta uma subconta pelo id.
 * @param {string} subcontaId
 */
export async function consultarSubconta(subcontaId) {
  return asaasRequest('GET', `/accounts/${subcontaId}`);
}

// ──────────────────────────────────────────────────────────────
// Clientes Asaas (necessário antes de criar cobrança)
// ──────────────────────────────────────────────────────────────

/**
 * Cria ou recupera um cliente no Asaas.
 * Asaas exige um customer para criar uma cobrança.
 *
 * @param {{name:string, email:string, cpfCnpj?:string, phone?:string}} dados
 * @returns {Promise<{id:string, ...}>}
 */
export async function criarCliente(dados) {
  return asaasRequest('POST', '/customers', dados);
}

// ──────────────────────────────────────────────────────────────
// Cobranças
// ──────────────────────────────────────────────────────────────

/**
 * Cria uma cobrança com split para o organizador.
 *
 * @param {object} opts
 * @param {string} opts.customerId     - id do cliente Asaas
 * @param {'PIX'|'BOLETO'|'CREDIT_CARD'} opts.billingType
 * @param {number} opts.valorTotal     - em REAIS (float, como o Asaas espera)
 * @param {string} opts.dueDate        - 'YYYY-MM-DD'
 * @param {string} opts.descricao
 * @param {string} opts.externalReference - nosso pedido_id (idempotência)
 * @param {string} opts.walletIdOrganizador - gateway_recipient_id do organizador
 * @param {number} opts.valorOrganizador    - em REAIS, quanto vai ao organizador
 * @returns {Promise<{id:string, status:string, invoiceUrl?:string, pixQrCode?:string, ...}>}
 */
export async function criarCobranca({
  customerId,
  billingType,
  valorTotal,
  dueDate,
  descricao,
  externalReference,
  walletIdOrganizador,
  valorOrganizador,
}) {
  return asaasRequest('POST', '/payments', {
    customer:          customerId,
    billingType,
    value:             valorTotal,
    dueDate,
    description:       descricao,
    externalReference,
    split: [
      {
        walletId:   walletIdOrganizador,
        fixedValue: valorOrganizador,
      },
    ],
  });
}

/**
 * Consulta o status de uma cobrança.
 * @param {string} chargeId - id retornado em criarCobranca
 */
export async function consultarCobranca(chargeId) {
  return asaasRequest('GET', `/payments/${chargeId}`);
}

// ──────────────────────────────────────────────────────────────
// Assinaturas recorrentes (Bloco 4.2)
// ──────────────────────────────────────────────────────────────

/**
 * Cria uma assinatura mensal recorrente no Asaas.
 * billingType=UNDEFINED → Asaas exibe página onde o cliente escolhe PIX/cartão/boleto.
 *
 * @param {object} opts
 * @param {string} opts.customerId        - id do cliente Asaas
 * @param {number} opts.valor             - em REAIS (float)
 * @param {string} opts.nextDueDate       - 'YYYY-MM-DD' (primeiro vencimento)
 * @param {string} opts.descricao
 * @param {string} opts.externalReference
 */
export async function criarAssinatura({ customerId, valor, nextDueDate, descricao, externalReference }) {
  return asaasRequest('POST', '/subscriptions', {
    customer:          customerId,
    billingType:       'UNDEFINED',
    value:             valor,
    nextDueDate,
    cycle:             'MONTHLY',
    description:       descricao,
    externalReference,
  });
}

/** Cancela uma assinatura no Asaas. */
export async function cancelarAssinatura(subscriptionId) {
  return asaasRequest('DELETE', `/subscriptions/${subscriptionId}`);
}

/**
 * Busca o primeiro pagamento de uma assinatura (para obter invoiceUrl).
 * @returns {Promise<{id:string, invoiceUrl:string, status:string, ...} | null>}
 */
export async function buscarPrimeiroPagamento(subscriptionId) {
  const result = await asaasRequest('GET', `/subscriptions/${subscriptionId}/payments?limit=1`);
  return result?.data?.[0] ?? null;
}

/** Consulta detalhes de uma assinatura (nextDueDate, status, etc.). */
export async function consultarAssinatura(subscriptionId) {
  return asaasRequest('GET', `/subscriptions/${subscriptionId}`);
}

/**
 * Busca cliente Asaas por e-mail; se não encontrar, cria um novo.
 * @param {{name:string, email:string, cpfCnpj?:string, phone?:string}} dados
 */
export async function buscarOuCriarCliente(dados) {
  // Asaas retorna 404 (não lista vazia) quando não há clientes — tratar como "não existe"
  try {
    const result = await asaasRequest('GET', `/customers?email=${encodeURIComponent(dados.email)}&limit=1`);
    if (result?.data?.length) return result.data[0];
  } catch {
    // busca falhou (404, network, endpoint) → cliente ainda não existe no Asaas
  }
  return criarCliente(dados);
}

/**
 * Busca o QR code Pix de uma cobrança (billingType=PIX).
 * @returns {Promise<{encodedImage:string, payload:string, expirationDate:string}|null>}
 */
export async function buscarPixQrCode(chargeId) {
  try {
    return await asaasRequest('GET', `/payments/${chargeId}/pixQrCode`);
  } catch {
    return null;
  }
}

/**
 * Estorna uma cobrança (reembolso total).
 * O Asaas também reverte automaticamente o split ao recebedor.
 * @param {string} chargeId
 */
export async function estornarCobranca(chargeId) {
  return asaasRequest('POST', `/payments/${chargeId}/refund`);
}

/**
 * Cria uma cobrança PIX de TESTE no sandbox com split.
 * Atalho para o endpoint demo do Bloco 4.1.
 *
 * @param {string} walletIdOrganizador - gateway_recipient_id do org de teste
 * @param {number} valorTotalCents     - em centavos
 * @param {number} taxaCents           - taxa da plataforma em centavos
 * @returns {Promise<{charge:object, walletIdOrganizador:string}>}
 */
export async function criarCobrancaTeste(walletIdOrganizador, valorTotalCents, taxaCents) {
  // Cria um cliente anônimo de teste
  const cliente = await criarCliente({
    name:  'Comprador Teste Ingressa',
    email: `teste+${Date.now()}@ingressa.com.br`,
  });

  const valorTotal      = valorTotalCents / 100;
  const valorOrg        = (valorTotalCents - taxaCents) / 100;
  const hoje            = new Date();
  const dueDate         = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const charge = await criarCobranca({
    customerId:          cliente.id,
    billingType:         'PIX',
    valorTotal,
    dueDate,
    descricao:           'Ingresso Teste — Bloco 4.1 Sandbox',
    externalReference:   `demo-bloco41-${Date.now()}`,
    walletIdOrganizador,
    valorOrganizador:    valorOrg,
  });

  return { charge, walletIdOrganizador };
}
