# Masaya Reporta — Sistema Web de Reporte Ciudadano de Daños Urbanos

Proyecto final de **Diseño de Sistemas en Internet** (UNI) para la **Alcaldía Municipal de Masaya**.
Los ciudadanos reportan baches, luminarias dañadas y fugas de agua (con foto y ubicación) y
consultan el estado de su reporte; los funcionarios los gestionan en un tablero Kanban, un mapa y estadísticas.

## Arquitectura (3 capas, frontend y backend desacoplados)

```
frontend/   Sitio estático (HTML5 + CSS3 + JavaScript + Leaflet)  ── fetch/JSON ──►
backend/    API REST (Node.js + Express, JWT, Multer, Helmet)     ── SQL ───────►
database/   SQLite 3: migraciones, datos de demostración y script_base_de_datos.sql
docs/       openapi.json y coleccion_postman.json
```

## Cómo ejecutarlo (desarrollo local)

Requisitos: **Node.js 18+** (recomendado 20 o 22 LTS).

```bash
# Terminal 1 — Backend + base de datos
cd backend
npm install
npm run db:init      # crea database/masaya.db con el esquema y datos de demostración
npm start            # API en http://localhost:3000  ·  Swagger en http://localhost:3000/api/docs

# Terminal 2 — Frontend
cd frontend
node serve.js        # http://localhost:5500   (o Live Server de VS Code en el puerto 5500)
```

Abrir <http://localhost:5500>. Funcionario de demostración: **admin / masaya2026**
(en `login.html`). Cambiar esta contraseña antes de publicar (`npm run admin:crear -- usuario "clave-larga" "Nombre"`).

## Base de datos

- Script completo (esquema + datos): `database/script_base_de_datos.sql` → `sqlite3 masaya.db < script_base_de_datos.sql`
- Migraciones versionadas: `database/migrations/` (se aplican solas al iniciar el backend o con `npm run db:migrar`)
- Reiniciar con datos de demostración: `npm run db:reset`
- Variable `DB_PATH` = cadena de conexión (ruta del archivo SQLite).

## API REST

Documentación interactiva (Swagger UI): `/api/docs` · Especificación: `docs/openapi.json` · Postman: `docs/coleccion_postman.json`.

| Verbo | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público → devuelve JWT |
| GET | `/api/reportes` | Público (con JWT incluye teléfono) |
| POST | `/api/reportes` | Público (multipart con foto opcional) |
| GET | `/api/reportes/seguimiento?codigo=|telefono=` | Público |
| GET | `/api/reportes/estadisticas` | JWT |
| GET / DELETE | `/api/reportes/:id` | JWT |
| PATCH | `/api/reportes/:id/estado` | JWT |

## Pruebas

```bash
cd backend
npm test             # 28 pruebas funcionales y de seguridad (BD en memoria)
npm run test:carga   # prueba de carga (requiere el backend en ejecución; usar RATE_LIMIT=off en una instancia aparte)
```

## Seguridad implementada

JWT (HS256) · contraseñas con bcrypt · SQL parametrizado · escape de salida contra XSS (`escapeHTML`) ·
Helmet (CSP, nosniff, HSTS) · CORS con lista blanca · límites de peticiones por IP ·
validación de entradas en el servidor · verificación de la firma real de las imágenes · teléfono visible solo para funcionarios.

## Despliegue (Fase 3)

Frontend en Netlify/Vercel y backend en Render/Railway (o VPS con `backend/Dockerfile`). Variables del backend:
`NODE_ENV=production`, `JWT_SECRET` (largo y aleatorio), `CORS_ORIGENES` (URL del frontend), `TRUST_PROXY=true`,
`DB_PATH` y `UPLOADS_DIR` en un disco persistente. En el frontend, cambiar `API_URL` en `frontend/js/config.js`.
