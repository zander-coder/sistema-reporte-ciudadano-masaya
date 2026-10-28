const express = require('express');
const bcrypt = require('bcryptjs');
const { firmar, requiereAuth } = require('../middleware/auth');
const { ErrorApi, badRequest } = require('../utils/errores');
const { limpiar } = require('../utils/validar');

// Hash "señuelo": se compara aunque el usuario no exista para que el tiempo
// de respuesta no revele qué usuarios son válidos (ataque de enumeración).
const HASH_SENUELO = bcrypt.hashSync('contraseña-señuelo', 10);

function rutasAuth({ usuarios, limitadores }) {
  const router = express.Router();

  router.post('/login', limitadores.login, (req, res, next) => {
    try {
      const usuario = limpiar(req.body?.usuario);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!usuario || !password || password.length > 200) throw badRequest('Usuario y contraseña son obligatorios.');

      const fila = usuarios.buscarPorUsuario(usuario);
      const ok = bcrypt.compareSync(password, fila ? fila.password_hash : HASH_SENUELO);
      if (!fila || !fila.activo || !ok) {
        throw new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos.');
      }
      res.json({
        token: firmar(fila),
        usuario: { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol },
      });
    } catch (err) { next(err); }
  });

  router.get('/me', requiereAuth, (req, res, next) => {
    try {
      const u = usuarios.buscarPorId(req.usuario.sub);
      if (!u || !u.activo) throw new ErrorApi(401, 'NO_AUTORIZADO', 'Usuario no válido.');
      res.json({ id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { rutasAuth };
