/* =========================================================
   Subida de fotografías con Multer.
   - Se recibe en memoria (límite de tamaño y 1 solo archivo).
   - La firma real del archivo se verifica (JPG/PNG/WEBP).
   - Se guarda con nombre aleatorio (UUID): el nombre original
     del cliente jamás se usa, evitando path traversal.
   ========================================================= */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { badRequest } = require('../utils/errores');
const { detectarTipoImagen } = require('../utils/imagen');

const cargador = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFotoMB * 1024 * 1024, files: 1, fields: 10 },
});

const recibirFoto = cargador.single('foto');

/**
 * Verifica la firma real de la imagen y la guarda en disco con nombre aleatorio.
 * Devuelve el nombre del archivo guardado. Se llama DESPUÉS de validar el resto del formulario.
 */
function guardarFotoEnDisco(archivo, uploadsDir) {
  const tipo = detectarTipoImagen(archivo.buffer);
  if (!tipo) throw badRequest('El archivo debe ser una imagen JPG, PNG o WEBP válida.', { foto: 'Formato no permitido.' });
  const nombre = `${crypto.randomUUID()}.${tipo.ext}`;
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, nombre), archivo.buffer, { flag: 'wx' });
  return nombre;
}

module.exports = { recibirFoto, guardarFotoEnDisco };
