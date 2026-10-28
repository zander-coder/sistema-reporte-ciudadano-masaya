/* =========================================================
   Especificación OpenAPI 3.0 de la API REST de Masaya Reporta.
   Se sirve en  /api/docs  (Swagger UI)  y  /api/openapi.json
   ========================================================= */
const ejemploReporte = {
  id: 9,
  codigo: 'MSY-AB1234',
  tipo: 'bache',
  estado: 'recibido',
  descripcion: 'Bache profundo frente al mercado, afecta a motos.',
  direccionRef: 'Costado del Mercado Viejo',
  lat: 11.9752,
  lng: -86.0961,
  foto: '/uploads/3f1c0a52-6d2e-4a52-9d0e-0b1e5f4f2a11.jpg',
  creado: '2026-10-10T15:20:11.000Z',
  actualizado: '2026-10-10T15:20:11.000Z',
};

const refError = (descripcion) => ({
  description: descripcion,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Masaya Reporta — API REST',
    version: '1.0.0',
    description:
      'API del **Sistema Web de Reporte Ciudadano de Daños Urbanos** de la Alcaldía Municipal de Masaya.\n\n' +
      'Permite a los ciudadanos reportar baches, luminarias dañadas y fugas de agua (con foto y ubicación), ' +
      'consultar el estado de su reporte, y a los funcionarios municipales gestionar los reportes.\n\n' +
      '**Autenticación:** los endpoints de funcionarios usan JWT. Obtén el token en `POST /api/auth/login` ' +
      'y pulsa **Authorize** para enviarlo como `Authorization: Bearer <token>`.\n\n' +
      'Proyecto de curso — Diseño de Sistemas en Internet, Universidad Nacional de Ingeniería (UNI).',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Desarrollo local' }],
  tags: [
    { name: 'Reportes públicos', description: 'Operaciones abiertas a cualquier ciudadano' },
    { name: 'Autenticación', description: 'Inicio de sesión de funcionarios (JWT)' },
    { name: 'Gestión (funcionarios)', description: 'Requieren token JWT' },
    { name: 'Sistema', description: 'Estado del servicio' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'], summary: 'Estado del servicio',
        responses: { 200: { description: 'Servicio operativo', content: { 'application/json': { example: { estado: 'ok', servicio: 'masaya-reporta-api', version: '1.0.0', reportes: 8 } } } } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'], summary: 'Iniciar sesión (devuelve JWT)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' }, example: { usuario: 'admin', password: 'masaya2026' } } },
        },
        responses: {
          200: { description: 'Credenciales correctas', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          400: refError('Faltan datos'),
          401: refError('Usuario o contraseña incorrectos'),
          429: refError('Demasiados intentos (límite por IP)'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticación'], summary: 'Datos del funcionario autenticado', security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuario del token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } },
          401: refError('Token ausente, inválido o expirado'),
        },
      },
    },
    '/api/reportes': {
      get: {
        tags: ['Reportes públicos'], summary: 'Listar reportes (mapa público / tablero)',
        description: 'Público. Si se envía un token válido de funcionario, la respuesta incluye además el campo `telefono`.',
        parameters: [
          { name: 'tipo', in: 'query', schema: { $ref: '#/components/schemas/TipoDano' } },
          { name: 'estado', in: 'query', schema: { $ref: '#/components/schemas/Estado' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500, default: 500 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          200: { description: 'Lista de reportes (más recientes primero)', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Reporte' } } } } },
          400: refError('Filtro inválido'),
        },
      },
      post: {
        tags: ['Reportes públicos'], summary: 'Crear un reporte ciudadano',
        description: 'Recibe `multipart/form-data`. La foto es opcional (JPG, PNG o WEBP, máx. 5 MB). Devuelve el código de seguimiento.',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/NuevoReporte' } } },
        },
        responses: {
          201: { description: 'Reporte creado en estado "recibido"', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reporte' }, example: ejemploReporte } } },
          400: refError('Datos inválidos (detalle por campo en `error.detalles`)'),
          413: refError('Foto demasiado grande'),
          429: refError('Demasiados reportes desde esta IP'),
        },
      },
    },
    '/api/reportes/seguimiento': {
      get: {
        tags: ['Reportes públicos'], summary: 'Consultar el estado de un reporte',
        description: 'Con `codigo` devuelve un reporte con su historial. Con `telefono` devuelve la lista de reportes asociados a ese número.',
        parameters: [
          { name: 'codigo', in: 'query', schema: { type: 'string', example: 'MSY-AB1234' } },
          { name: 'telefono', in: 'query', schema: { type: 'string', example: '8888-0010' } },
        ],
        responses: {
          200: { description: 'Reporte (por código) o arreglo de reportes (por teléfono)', content: { 'application/json': { schema: { oneOf: [{ $ref: '#/components/schemas/ReporteDetalle' }, { type: 'array', items: { $ref: '#/components/schemas/Reporte' } }] } } } },
          400: refError('Parámetros faltantes o con formato inválido'),
          404: refError('No existe un reporte con ese código'),
          429: refError('Demasiadas consultas'),
        },
      },
    },
    '/api/reportes/estadisticas': {
      get: {
        tags: ['Gestión (funcionarios)'], summary: 'Estadísticas de reportes', security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'tipo', in: 'query', schema: { $ref: '#/components/schemas/TipoDano' } },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date', example: '2026-09-01' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date', example: '2026-10-31' } },
        ],
        responses: {
          200: { description: 'Conteos por tipo y por estado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estadisticas' } } } },
          400: refError('Parámetros inválidos'),
          401: refError('No autenticado'),
        },
      },
    },
    '/api/reportes/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: {
        tags: ['Gestión (funcionarios)'], summary: 'Detalle de un reporte (con teléfono e historial)', security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Reporte', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReporteDetalle' } } } },
          401: refError('No autenticado'),
          404: refError('No existe'),
        },
      },
      delete: {
        tags: ['Gestión (funcionarios)'], summary: 'Eliminar un reporte', security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Eliminado (también se borra su foto e historial)' }, 401: refError('No autenticado'), 404: refError('No existe') },
      },
    },
    '/api/reportes/{id}/estado': {
      patch: {
        tags: ['Gestión (funcionarios)'], summary: 'Cambiar el estado de un reporte', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['estado'], properties: { estado: { $ref: '#/components/schemas/Estado' } } }, example: { estado: 'proceso' } } } },
        responses: {
          200: { description: 'Reporte actualizado (se agrega una entrada al historial)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReporteDetalle' } } } },
          400: refError('Estado inválido'),
          401: refError('No autenticado'),
          404: refError('No existe'),
        },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      TipoDano: { type: 'string', enum: ['bache', 'luminaria', 'fuga', 'otro'] },
      Estado: { type: 'string', enum: ['recibido', 'revision', 'proceso', 'resuelto'] },
      Reporte: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          codigo: { type: 'string', example: 'MSY-AB1234' },
          tipo: { $ref: '#/components/schemas/TipoDano' },
          estado: { $ref: '#/components/schemas/Estado' },
          descripcion: { type: 'string', maxLength: 300 },
          direccionRef: { type: 'string', maxLength: 120 },
          lat: { type: 'number', example: 11.9752 },
          lng: { type: 'number', example: -86.0961 },
          foto: { type: 'string', nullable: true, description: 'Ruta relativa de la imagen (se sirve desde el backend)' },
          telefono: { type: 'string', description: 'Solo presente si la petición trae un token de funcionario' },
          creado: { type: 'string', format: 'date-time' },
          actualizado: { type: 'string', format: 'date-time' },
        },
        example: ejemploReporte,
      },
      ReporteDetalle: {
        allOf: [
          { $ref: '#/components/schemas/Reporte' },
          { type: 'object', properties: { historial: { type: 'array', items: { type: 'object', properties: { estado: { $ref: '#/components/schemas/Estado' }, fecha: { type: 'string', format: 'date-time' } } } } } },
        ],
      },
      NuevoReporte: {
        type: 'object',
        required: ['tipo', 'descripcion', 'lat', 'lng'],
        properties: {
          tipo: { $ref: '#/components/schemas/TipoDano' },
          descripcion: { type: 'string', minLength: 5, maxLength: 300 },
          lat: { type: 'number', example: 11.9752 },
          lng: { type: 'number', example: -86.0961 },
          direccionRef: { type: 'string', maxLength: 120 },
          telefono: { type: 'string', example: '8888-0000' },
          foto: { type: 'string', format: 'binary', description: 'JPG, PNG o WEBP (máx. 5 MB)' },
        },
      },
      LoginRequest: { type: 'object', required: ['usuario', 'password'], properties: { usuario: { type: 'string' }, password: { type: 'string', format: 'password' } } },
      Usuario: { type: 'object', properties: { id: { type: 'integer' }, usuario: { type: 'string' }, nombre: { type: 'string' }, rol: { type: 'string', enum: ['funcionario', 'administrador'] } } },
      LoginResponse: { type: 'object', properties: { token: { type: 'string', description: 'JWT firmado (HS256)' }, usuario: { $ref: '#/components/schemas/Usuario' } } },
      Estadisticas: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          porTipo: { type: 'object', additionalProperties: { type: 'integer' }, example: { bache: 3, luminaria: 2, fuga: 2, otro: 1 } },
          porEstado: { type: 'object', additionalProperties: { type: 'integer' }, example: { recibido: 2, revision: 2, proceso: 2, resuelto: 2 } },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              codigo: { type: 'string', example: 'DATOS_INVALIDOS' },
              mensaje: { type: 'string' },
              detalles: { type: 'object', additionalProperties: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

module.exports = openapi;
