/* =========================================================
   MASAYA REPORTA — Aplicación Express (API REST)
   Arquitectura en capas:
     routes/      -> endpoints HTTP (verbos, códigos de estado)
     middleware/  -> autenticación JWT, límites, subida de archivos
     db/          -> repositorios (acceso a datos con SQL parametrizado)
     utils/       -> validación, códigos, verificación de imágenes
   ========================================================= */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const baseConfig = require('./config');
const { crearRepositorio } = require('./db/reportesRepo');
const { crearRepositorioUsuarios } = require('./db/usuariosRepo');
const { crearLimitadores } = require('./middleware/limites');
const { rutasAuth } = require('./routes/auth');
const { rutasReportes } = require('./routes/reportes');
const { ErrorApi } = require('./utils/errores');
const openapi = require('./docs/openapi');

function crearApp({ db, config = baseConfig }) {
  const app = express();
  const limitadores = crearLimitadores(config.limites);
  const reportes = crearRepositorio(db);
  const usuarios = crearRepositorioUsuarios(db);

  app.disable('x-powered-by');
  if (config.confiarProxy) app.set('trust proxy', 1);

  // ---- Cabeceras de seguridad (CSP, X-Content-Type-Options, HSTS, etc.) ----
  // La CSP permite solo los orígenes externos que usa el frontend (Leaflet, mosaicos OSM, Google Fonts).
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // OpenStreetMap exige el encabezado Referer para servir mosaicos (con "no-referrer" responde 403).
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://unpkg.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  }));

  // ---- CORS: solo los orígenes del frontend autorizados ----
  app.use(cors({
    origin(origen, cb) {
      if (!origen || config.corsOrigenes.includes(origen)) return cb(null, true);
      cb(new ErrorApi(403, 'CORS', 'Origen no permitido por la política CORS.'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  app.use(express.json({ limit: '20kb' }));
  app.use('/api', limitadores.general);

  // ---- Fotografías subidas (archivos estáticos de solo lectura) ----
  app.use('/uploads', express.static(config.uploadsDir, {
    index: false,
    dotfiles: 'ignore',
    maxAge: '7d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    },
  }));

  // ---- Documentación OpenAPI / Swagger ----
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Masaya Reporta — API REST',
    swaggerOptions: { persistAuthorization: true },
  }));

  // ---- Endpoints ----
  app.get('/api/health', (_req, res) => {
    const r = db.prepare('SELECT COUNT(*) AS n FROM reportes').get();
    res.json({ estado: 'ok', servicio: 'masaya-reporta-api', version: '1.0.0', reportes: r.n });
  });
  app.use('/api/auth', rutasAuth({ usuarios, limitadores }));
  app.use('/api/reportes', rutasReportes({ reportes, config, limitadores }));

  if (config.servirFrontend) {
    // Un solo servicio: el frontend estático se sirve desde la raíz (/, /reportar.html, ...)
    app.use(express.static(config.frontendDir, { index: 'index.html', maxAge: '1h', extensions: ['html'] }));
  } else {
    app.get('/', (_req, res) =>
      res.json({ servicio: 'Masaya Reporta — API REST', documentacion: '/api/docs', salud: '/api/health' }));
  }

  // ---- 404 y manejo centralizado de errores ----
  app.use((_req, _res, next) => next(new ErrorApi(404, 'NO_ENCONTRADO', 'Ruta no encontrada.')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let estado = err.estado || 500;
    let codigo = err.codigo || 'ERROR_INTERNO';
    let mensaje = err.message;

    if (err.type === 'entity.parse.failed') { estado = 400; codigo = 'JSON_INVALIDO'; mensaje = 'El cuerpo de la petición no es JSON válido.'; }
    else if (err.type === 'entity.too.large') { estado = 413; codigo = 'CUERPO_GRANDE'; mensaje = 'La petición es demasiado grande.'; }
    else if (err.name === 'MulterError') {
      estado = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      codigo = 'SUBIDA_INVALIDA';
      mensaje = err.code === 'LIMIT_FILE_SIZE'
        ? `La foto supera el máximo de ${config.maxFotoMB} MB.`
        : 'Archivo no permitido en el formulario.';
    }

    if (estado >= 500) {
      console.error('[error]', err);
      mensaje = 'Ocurrió un error interno. Intenta de nuevo más tarde.'; // no se filtran detalles internos
    }
    res.status(estado).json({ error: { codigo, mensaje, ...(err.detalles ? { detalles: err.detalles } : {}) } });
  });

  return app;
}

module.exports = { crearApp };
