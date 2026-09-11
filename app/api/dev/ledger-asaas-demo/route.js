/**
 * POST /api/dev/ledger-asaas-demo
 *
 * Endpoint de DESENVOLVIMENTO/TESTE do Bloco 4.1.
 * Disponível APENAS em NODE_ENV=development.
 *
 * Demonstra a integração completa: Asaas sandbox → Ledger double-entry.
 * Nenhum organizador ou comprador real é cobrado.
 *
 * Fluxo:
 *  1. Cria uma subconta (recebedor) de teste no Asaas sandbox.
 *  2. Cria uma cobrança PIX fake com split (taxa plataforma + valor org).
 *  3. Registra o correspondente no ledger: VENDA + CUSTO_GATEWAY.
 *  4. Retorna os saldos derivados e o id da cobrança no sandbox.
 *
 * Body JSON (todos opcionais, têm defaults de teste):
 *  { valorCents?: number, taxaCents?: number }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registrarTransacao, saldosOrganizador } from '@/lib/ledger';
import { criarSubconta, criarCobrancaTeste } from '@/lib/asaas';

export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ erro: 'Disponível apenas em desenvolvimento.' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const valorCents = Number(body.valorCents) || 15000;  // R$150,00 default
  const taxaCents  = Number(body.taxaCents)  || 190;    // R$1,90 default
  const orgCents   = valorCents - taxaCents;

  const resultados = {};

  try {
    // ── Passo 1: Criar recebedor (subconta) de teste no Asaas sandbox ────────
    const subconta = await criarSubconta({
      name:          `Org Teste Ingressa ${Date.now()}`,
      email:         `orgteste+${Date.now()}@ingressa.com.br`,
      cpfCnpj:       '00000000000',     // CPF inválido aceito no sandbox Asaas
      mobilePhone:   '11999999999',
      address:       'Rua Teste',
      addressNumber: '1',
      province:      'Jardim Teste',
      postalCode:    '01310100',
    });

    resultados.subconta = {
      id:       subconta.id,
      walletId: subconta.walletId,
    };

    // ── Passo 2: Criar cobrança PIX com split no sandbox ─────────────────────
    const { charge } = await criarCobrancaTeste(subconta.walletId, valorCents + taxaCents, taxaCents);
    resultados.cobranca = {
      id:          charge.id,
      status:      charge.status,
      valor:       charge.value,
      invoiceUrl:  charge.invoiceUrl,
    };

    // ── Passo 3: Registrar VENDA no ledger ───────────────────────────────────
    const chaveVenda = `VENDA:demo:${charge.id}`;
    const orgId      = user.id;    // usa o usuário autenticado como "organizador" de teste

    const txVenda = await registrarTransacao(supabase, {
      tipo:          'VENDA',
      chave:         chaveVenda,
      referenciaExt: charge.id,
      pernas: [
        { conta: 'participante:entrada',          direcao: 'debito',  valor_cents: valorCents + taxaCents },
        { conta: 'plataforma:taxa',               direcao: 'credito', valor_cents: taxaCents },
        { conta: `organizador:${orgId}:a_liberar`,direcao: 'credito', valor_cents: orgCents },
      ],
    });

    resultados.ledger_venda = txVenda;

    // ── Passo 4: Registrar CUSTO_GATEWAY (taxa do gateway, ex: 0,99% + R$0,49) ──
    // No MVP: custo fixo simbólico de R$0,49 (49 cents) cobrado da plataforma.
    // Em 4.3 calcular o valor real via webhook de pagamento confirmado.
    const custoCents = 49;
    const txCusto = await registrarTransacao(supabase, {
      tipo:          'CUSTO_GATEWAY',
      chave:         `CUSTO_GATEWAY:demo:${charge.id}`,
      referenciaExt: charge.id,
      pernas: [
        { conta: 'plataforma:taxa',          direcao: 'debito',  valor_cents: custoCents },
        { conta: 'plataforma:custo_gateway', direcao: 'credito', valor_cents: custoCents },
      ],
    });

    resultados.ledger_custo_gateway = txCusto;

    // ── Passo 5: Saldos derivados ─────────────────────────────────────────────
    resultados.saldos_organizador = await saldosOrganizador(supabase, orgId);
    resultados.saldo_plataforma_taxa_cents =
      // plataforma:taxa = taxa cobrada - custo_gateway = lucro líquido
      taxaCents - custoCents;   // derivado do que registramos acima

    return NextResponse.json({
      ok: true,
      descricao: 'Bloco 4.1: cobrança sandbox + ledger funcionando.',
      valorCents,
      taxaCents,
      orgCents,
      ...resultados,
    });

  } catch (err) {
    console.error('[ledger-asaas-demo]', err);
    return NextResponse.json(
      { erro: err.message, parcial: resultados },
      { status: 500 }
    );
  }
}
