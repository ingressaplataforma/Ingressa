// Emissão e validação de token de ingresso — SERVIDOR APENAS.
// Nunca importar em Client Components ou expor ao browser.
import crypto from "crypto";

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function deriveEventKey(master, eventoId) {
  return crypto.createHmac("sha256", master).update(eventoId).digest();
}

/** Retorna a chave derivada do evento em hex (32 bytes → 64 chars).
 *  É essa chave — e nunca a mestra — que vai ao dispositivo de check-in. */
export function deriveEventKeyHex(eventoId) {
  const master = process.env.INGRESSO_TOKEN_SECRET;
  if (!master) throw new Error("INGRESSO_TOKEN_SECRET não configurada");
  return deriveEventKey(master, eventoId).toString("hex");
}

/**
 * Valida um token de ingresso no servidor.
 * Retorna { valido: true, payload } ou { valido: false, motivo }.
 * Motivos: malformado | assinatura_invalida | evento_errado | fora_da_janela
 */
export function validarToken(token, eventoId) {
  const master = process.env.INGRESSO_TOKEN_SECRET;
  if (!master) throw new Error("INGRESSO_TOKEN_SECRET não configurada");

  try {
    const partes = token.split(".");
    if (partes.length !== 2) return { valido: false, motivo: "malformado" };
    const [corpo, sigRecebida] = partes;

    let payload;
    try {
      payload = JSON.parse(Buffer.from(corpo, "base64url").toString("utf-8"));
    } catch {
      return { valido: false, motivo: "malformado" };
    }

    if (payload.evento_id !== eventoId) return { valido: false, motivo: "evento_errado" };

    const agora = Math.floor(Date.now() / 1000);
    if (agora < payload.nbf || agora > payload.exp) return { valido: false, motivo: "fora_da_janela" };

    const eventKey = deriveEventKey(master, eventoId);
    const sigEsperada = crypto.createHmac("sha256", eventKey).update(corpo).digest();
    const sigRecBuf = Buffer.from(sigRecebida, "base64url");

    if (sigEsperada.length !== sigRecBuf.length) return { valido: false, motivo: "assinatura_invalida" };
    if (!crypto.timingSafeEqual(sigEsperada, sigRecBuf)) return { valido: false, motivo: "assinatura_invalida" };

    return { valido: true, payload };
  } catch {
    return { valido: false, motivo: "malformado" };
  }
}

/**
 * Gera um token assinado para o ingresso.
 * Formato: base64url(payload) + "." + base64url(HMAC(chave_evento, corpo))
 * A chave_evento = HMAC(mestre, evento_id) — derivada por evento.
 */
export function emitirToken({ eventoId, codigo, loteNome, nomeParticipante, validadeDias = 730 }) {
  const master = process.env.INGRESSO_TOKEN_SECRET;
  if (!master) throw new Error("INGRESSO_TOKEN_SECRET não configurada");

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    codigo,
    evento_id: eventoId,
    lote: loteNome,
    nome: nomeParticipante,
    nbf: now,
    exp: now + validadeDias * 86400,
  };

  const eventKey = deriveEventKey(master, eventoId);
  const corpo = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(crypto.createHmac("sha256", eventKey).update(corpo).digest());

  return `${corpo}.${sig}`;
}
