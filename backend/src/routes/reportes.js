const express = require('express');
const fs = require('fs');
const path = require('path');
const { requiereAuth, authOpcional } = require('../middleware/auth');
const { recibirFoto, guardarFotoEnDisco } = require('../middleware/subida');
const { badRequest, noEncontrado } = require('../utils/errores');
const v = require('../utils/validar');

function rutasReportes({ reportes, config, limitadores }) {
  const router = express.Router();

  // El teléfono es un dato personal: solo lo ven los funcionarios autenticados.
  const publico = ({ telefono, ...resto }) => resto;
  const segunRol = (req) => (req.usuario ? (r) => r : publico);

  // ---------- GET /api/reportes  (público; con token incluye teléfono) ----------
  router.get('/', authOpcional, (req, res, next) => {
    try {
      const tipo = v.limpiar(req.query.tipo);
      const estado = v.limpiar(req.query.estado);
      if (tipo && !v.TIPOS.includes(tipo)) throw badRequest('Tipo inválido.');
      if (estado && !v.ESTADOS.includes(estado)) throw badRequest('Estado inválido.');
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 500);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      res.json(reportes.listar({ tipo, estado, limit, offset }).map(segunRol(req)));
    } catch (err) { next(err); }
  });

  // ---------- GET /api/reportes/seguimiento?codigo=  |  ?telefono= (público) ----------
  router.get('/seguimiento', limitadores.consulta, (req, res, next) => {
    try {
      const codigo = v.limpiar(req.query.codigo).toUpperCase();
      const telefono = v.limpiar(req.query.telefono);
      if (codigo) {
        if (!/^MSY-[A-Z]{2}\d{4}$/.test(codigo)) throw badRequest('Código de seguimiento con formato inválido (ej. MSY-AB1234).');
        const r = reportes.buscarPorCodigo(codigo);
        if (!r) throw noEncontrado('No existe un reporte con ese código.');
        return res.json(publico(r));
      }
      if (telefono) {
        if (!/^[0-9+\-() ]{7,20}$/.test(telefono)) throw badRequest('Teléfono inválido.');
        return res.json(reportes.buscarPorTelefono(telefono).map(publico));
      }
      throw badRequest('Indica un código o un teléfono.');
    } catch (err) { next(err); }
  });

  // ---------- GET /api/reportes/estadisticas (funcionarios) ----------
  router.get('/estadisticas', requiereAuth, (req, res, next) => {
    try {
      const tipo = v.limpiar(req.query.tipo);
      if (tipo && !v.TIPOS.includes(tipo)) throw badRequest('Tipo inválido.');
      const desde = v.validarFecha(req.query.desde, 'desde');
      const hasta = v.validarFecha(req.query.hasta, 'hasta');
      res.json(reportes.estadisticas({ tipo, desde, hasta }));
    } catch (err) { next(err); }
  });

  // ---------- GET /api/reportes/:id (funcionarios) ----------
  router.get('/:id', requiereAuth, (req, res, next) => {
    try {
      const r = reportes.obtener(v.validarId(req.params.id));
      if (!r) throw noEncontrado('Reporte no encontrado.');
      res.json(r);
    } catch (err) { next(err); }
  });

  // ---------- POST /api/reportes (público, multipart/form-data con foto opcional) ----------
  router.post('/', limitadores.crearReporte, recibirFoto, (req, res, next) => {
    try {
      const datos = v.validarNuevoReporte(req.body);        // 1) validar
      const foto = req.file ? guardarFotoEnDisco(req.file, config.uploadsDir) : null; // 2) guardar foto
      try {
        const nuevo = reportes.crear({ ...datos, foto });  // 3) insertar
        res.status(201).location(`/api/reportes/seguimiento?codigo=${nuevo.codigo}`).json(publico(nuevo));
      } catch (err) {
        if (foto) fs.rm(path.join(config.uploadsDir, foto), { force: true }, () => {});
        throw err;
      }
    } catch (err) { next(err); }
  });

  // ---------- PATCH /api/reportes/:id/estado (funcionarios) ----------
  router.patch('/:id/estado', requiereAuth, (req, res, next) => {
    try {
      const id = v.validarId(req.params.id);
      const estado = v.validarEstado(req.body);
      const r = reportes.actualizarEstado(id, estado, req.usuario.sub);
      if (!r) throw noEncontrado('Reporte no encontrado.');
      res.json(r);
    } catch (err) { next(err); }
  });

  // ---------- DELETE /api/reportes/:id (funcionarios) ----------
  router.delete('/:id', requiereAuth, (req, res, next) => {
    try {
      const id = v.validarId(req.params.id);
      const borrado = reportes.eliminar(id);
      if (!borrado) throw noEncontrado('Reporte no encontrado.');
      if (borrado.foto) fs.rm(path.join(config.uploadsDir, borrado.foto), { force: true }, () => {});
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { rutasReportes };
