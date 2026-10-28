/* =========================================================
   Autenticación con JWT (JSON Web Token, firma HS256).
   El token viaja en la cabecera  Authorization: Bearer <token>
   (no en cookies), por lo que la API no es vulnerable a CSRF.
   ========================================================= */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { noAutorizado, ErrorApi } = require('../utils/errores');

function extraerToken(req) {
  const h = req.headers.authorization || '';
  const [tipo, token] = h.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

function verificar(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

/** Exige un token válido; si no, responde 401. */
function requiereAuth(req, _res, next) {
  const token = extraerToken(req);
  if (!token) return next(noAutorizado());
  try {
    req.usuario = verificar(token);
    next();
  } catch {
    next(noAutorizado('Sesión inválida o expirada. Inicia sesión nuevamente.'));
  }
}

/** Token opcional: si viene y es válido, req.usuario queda definido (para mostrar datos de contacto a funcionarios). */
function authOpcional(req, _res, next) {
  const token = extraerToken(req);
  if (token) {
    try { req.usuario = verificar(token); } catch { /* se trata como visitante anónimo */ }
  }
  next();
}

function requiereRol(...roles) {
  return (req, _res, next) =>
    roles.includes(req.usuario?.rol) ? next() : next(new ErrorApi(403, 'PROHIBIDO', 'No tienes permiso para esta acción.'));
}

function firmar(usuario) {
  return jwt.sign({ sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpira,
  });
}

module.exports = { requiereAuth, authOpcional, requiereRol, firmar };
