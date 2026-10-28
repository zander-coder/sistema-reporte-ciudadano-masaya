/* =========================================================
   Validación y saneamiento de datos de entrada (lado servidor).
   Nunca se confía en lo que valida el frontend.
   ========================================================= */
const config = require('../config');
const { badRequest } = require('./errores');

const TIPOS = ['bache', 'luminaria', 'fuga', 'otro'];
const ESTADOS = ['recibido', 'revision', 'proceso', 'resuelto'];

// Elimina caracteres de control (excepto salto de línea/tabulación) y recorta espacios.
const limpiar = (s) =>
  String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

function validarNuevoReporte(body = {}) {
  const errores = {};

  const tipo = limpiar(body.tipo);
  if (!TIPOS.includes(tipo)) errores.tipo = `Debe ser uno de: ${TIPOS.join(', ')}.`;

  const descripcion = limpiar(body.descripcion);
  if (descripcion.length < 5 || descripcion.length > 300) {
    errores.descripcion = 'La descripción debe tener entre 5 y 300 caracteres.';
  }

  const direccionRef = limpiar(body.direccionRef);
  if (direccionRef.length > 120) errores.direccionRef = 'Máximo 120 caracteres.';

  const telefono = limpiar(body.telefono);
  if (telefono && !/^[0-9+\-() ]{7,20}$/.test(telefono)) {
    errores.telefono = 'Teléfono inválido (solo números, espacios, guiones y +).';
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (body.lat === undefined || body.lng === undefined || body.lat === '' || body.lng === '' ||
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    errores.ubicacion = 'Ubicación inválida (lat/lng).';
  } else if (config.validarZona) {
    const z = config.zona;
    if (lat < z.latMin || lat > z.latMax || lng < z.lngMin || lng > z.lngMax) {
      errores.ubicacion = 'La ubicación debe estar dentro del municipio de Masaya.';
    }
  }

  if (Object.keys(errores).length) throw badRequest('Hay datos inválidos en el reporte.', errores);

  return { tipo, descripcion, direccionRef: direccionRef || null, telefono: telefono || null, lat, lng };
}

function validarEstado(body = {}) {
  const estado = limpiar(body.estado);
  if (!ESTADOS.includes(estado)) {
    throw badRequest('Estado inválido.', { estado: `Debe ser uno de: ${ESTADOS.join(', ')}.` });
  }
  return estado;
}

function validarId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Identificador inválido.');
  return id;
}

function validarFecha(valor, nombre) {
  if (valor === undefined || valor === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw badRequest(`El parámetro "${nombre}" debe tener formato AAAA-MM-DD.`);
  }
  return valor;
}

module.exports = { TIPOS, ESTADOS, limpiar, validarNuevoReporte, validarEstado, validarId, validarFecha };
