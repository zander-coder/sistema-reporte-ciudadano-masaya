/* Limitadores de velocidad por IP (mitigan fuerza bruta y abuso). */
const rateLimit = require('express-rate-limit');
const config = require('../config');

function crear({ ventanaMs, max }, mensaje, habilitado) {
  if (!habilitado) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: ventanaMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje } }),
  });
}

function crearLimitadores(limites = config.limites) {
  const on = limites.habilitado;
  return {
    general: crear(limites.general, 'Demasiadas peticiones. Intenta de nuevo en unos minutos.', on),
    login: crear(limites.login, 'Demasiados intentos de inicio de sesión. Espera unos minutos.', on),
    crearReporte: crear(limites.crearReporte, 'Has enviado demasiados reportes. Intenta más tarde.', on),
    consulta: crear(limites.consulta, 'Demasiadas consultas. Intenta de nuevo en unos minutos.', on),
  };
}

module.exports = { crearLimitadores };
