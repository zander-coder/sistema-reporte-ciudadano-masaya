/* =========================================================
   MASAYA REPORTA — Configuración centralizada
   Todo se lee de variables de entorno (archivo .env en local,
   panel de la plataforma cloud en producción). Nunca se
   escriben secretos en el código.
   ========================================================= */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const esProduccion = process.env.NODE_ENV === 'production';

if (esProduccion && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción (defínelo en las variables de entorno).');
}

const lista = (valor, porDefecto) =>
  (valor || porDefecto).split(',').map((s) => s.trim()).filter(Boolean);

const config = {
  esProduccion,
  puerto: Number(process.env.PORT) || 3000,

  // Cadena de conexión a la base de datos (SQLite: ruta del archivo).
  dbPath: path.resolve(
    path.join(__dirname, '..'),
    process.env.DB_PATH || '../database/masaya.db'
  ),
  migracionesDir: path.join(__dirname, '..', '..', 'database', 'migrations'),
  seedsDir: path.join(__dirname, '..', '..', 'database', 'seeds'),

  // Autenticación JWT
  jwtSecret: process.env.JWT_SECRET || 'solo-para-desarrollo-cambiar-en-produccion',
  jwtExpira: process.env.JWT_EXPIRA || '8h',

  // CORS: orígenes del frontend autorizados a consumir la API
  corsOrigenes: lista(
    process.env.CORS_ORIGENES,
    'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501'
  ),

  // Subida de fotografías
  uploadsDir: path.resolve(path.join(__dirname, '..'), process.env.UPLOADS_DIR || 'uploads'),
  maxFotoMB: Number(process.env.MAX_FOTO_MB) || 5,

  // Zona geográfica válida (casco urbano y alrededores de Masaya)
  validarZona: process.env.VALIDAR_ZONA !== 'false',
  zona: { latMin: 11.80, latMax: 12.10, lngMin: -86.30, lngMax: -85.90 },

  // Límites de peticiones (anti abuso / fuerza bruta)
  limites: {
    habilitado: process.env.RATE_LIMIT !== 'off',
    general: { ventanaMs: 15 * 60 * 1000, max: 600 },
    login: { ventanaMs: 15 * 60 * 1000, max: 10 },
    crearReporte: { ventanaMs: 60 * 60 * 1000, max: 20 },
    consulta: { ventanaMs: 15 * 60 * 1000, max: 60 },
  },

  // Despliegue en un solo servicio: la API también sirve el frontend estático
  servirFrontend: process.env.SERVIR_FRONTEND === 'true',
  frontendDir: path.join(__dirname, '..', '..', 'frontend'),
  // Carga datos de demostración si la BD está vacía (útil en hosting gratuito de disco efímero)
  seedDemo: process.env.SEED_DEMO === 'true',

  // Detrás de un proxy (Render, Railway, Nginx) hay que confiar en X-Forwarded-For
  confiarProxy: process.env.TRUST_PROXY === 'true',
};

module.exports = config;
