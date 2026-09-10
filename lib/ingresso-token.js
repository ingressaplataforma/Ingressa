// Emissão de token de ingresso — SERVIDOR APENAS.
// Nunca importar em Client Components ou expor ao browser.
import crypto from "crypto";

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function deriveEventKey(master, eventoId) {
  return crypto.createHmac("sha256", master).update(eventoId).digest();
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
