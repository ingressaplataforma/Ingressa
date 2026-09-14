/**
 * Gera assets derivados da logo oficial (public/ingressa_logo.png).
 * Rodar uma única vez: node scripts/crop-logo.js
 *
 * Fonte: 2172×724 RGBA
 *  - Símbolo (ingresso c/ "i"): x≈0–540, y=0–724
 *  - "Ingressa" (texto grande): x=540–1720, y=50–490
 *  - Slogan "Ingressos para eventos": x=540–1720, y=490–680
 */
const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "../public/ingressa_logo.png");

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`Fonte: ${meta.width}×${meta.height}`);

  // 1. Header: símbolo + "Ingressa" sem slogan
  //    Corta direita (x > 1720) e faixa inferior do slogan (y > 490)
  await sharp(SRC)
    .extract({ left: 0, top: 0, width: 2050, height: 490 })
    .toFile(path.join(__dirname, "../public/ingressa_logo_header.png"));
  console.log("✓ ingressa_logo_header.png  (2050×490)");

  // 2. Favicon: símbolo quadrado (apenas o ingresso c/ "i")
  //    Crop quadrado em torno do símbolo, depois reduz para 512×512
  await sharp(SRC)
    .extract({ left: 60, top: 60, width: 604, height: 604 })
    .resize(512, 512)
    .toFile(path.join(__dirname, "../public/ingressa_favicon.png"));
  console.log("✓ ingressa_favicon.png  (512×512)");
}

main().catch((e) => { console.error(e); process.exit(1); });
