/**
 * meios-pagamento.js — Validação dos meios aceitos por evento.
 *
 * BLOCO 4 (checkout) deve:
 *  1. Carregar o evento incluindo aceita_cartao e aceita_boleto.
 *     (Pix é sempre true — não há coluna, é garantido pelo produto.)
 *  2. Antes de criar a cobrança no gateway, chamar meioPagamentoPermitido(evento, meio).
 *  3. Se retornar false → rejeitar com HTTP 422:
 *     "Meio de pagamento não aceito neste evento."
 *
 * A validação DEVE ocorrer no servidor (Route Handler ou Server Action).
 * Nunca confiar apenas na UI: um comprador pode forçar um meio via chamada direta.
 */

/**
 * Retorna true se o meio de pagamento é aceito pelo evento.
 * @param {{ aceita_cartao: boolean, aceita_boleto: boolean }} evento
 * @param {"pix" | "cartao" | "boleto"} meio
 */
export function meioPagamentoPermitido(evento, meio) {
  if (meio === "pix")    return true;
  if (meio === "cartao") return evento.aceita_cartao === true;
  if (meio === "boleto") return evento.aceita_boleto === true;
  return false; // meio desconhecido → recusar
}
