const crypto = require('crypto');

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O para evitar confusiones

/** Genera un código de seguimiento con aleatoriedad criptográfica: MSY-AB1234 */
function generarCodigo() {
  const l1 = LETRAS[crypto.randomInt(LETRAS.length)];
  const l2 = LETRAS[crypto.randomInt(LETRAS.length)];
  const num = crypto.randomInt(1000, 10000);
  return `MSY-${l1}${l2}${num}`;
}

module.exports = { generarCodigo };
