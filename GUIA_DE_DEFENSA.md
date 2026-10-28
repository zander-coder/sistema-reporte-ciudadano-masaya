# Guía de estudio para la defensa (leer antes de presentar)

La guía del profe dice que la lógica y la arquitectura **deben defenderse con propiedad**. Esta hoja resume
qué hace cada parte y responde las preguntas típicas. Cada integrante debería poder explicar todo el flujo.

## El flujo completo en una frase
El navegador (frontend, puerto 5500) llama con `fetch()` a la API (Express, puerto 3000); la API valida,
usa **SQL parametrizado** sobre **SQLite** y responde **JSON**; el frontend dibuja ese JSON. Para el panel se usa un **JWT**.

## Dónde está cada cosa
| Tema | Archivo |
|---|---|
| Rutas / verbos HTTP | `backend/src/routes/reportes.js`, `auth.js` |
| Autenticación JWT | `backend/src/middleware/auth.js` |
| Validación de datos | `backend/src/utils/validar.js` |
| Acceso a datos (SQL) | `backend/src/db/reportesRepo.js` |
| Migraciones | `backend/src/db/migrate.js`, `database/migrations/` |
| Subida de fotos | `backend/src/middleware/subida.js`, `utils/imagen.js` |
| Límites anti-abuso | `backend/src/middleware/limites.js` |
| Cliente REST del frontend | `frontend/js/api.js` |
| Documentación API | `backend/src/docs/openapi.js` → `/api/docs` |

## Preguntas probables
**¿Por qué Express / Node?** JavaScript en front y back, middlewares para JWT/validación/CORS, despliegue gratuito en Render/Railway.

**¿Por qué SQLite y no PostgreSQL/MySQL?** Volumen bajo, cero administración y menor consumo (responsabilidad ambiental). Es relacional con claves foráneas, CHECK y transacciones. Limitación: un solo escritor y requiere disco persistente en la nube; por eso el acceso a datos está aislado en `db/` y se podría migrar a PostgreSQL.

**¿Por qué no usaron ORM?** Son 5 tablas; escribimos las consultas con sentencias preparadas para entenderlas y evitar dependencias. Cambiar a Prisma/Sequelize solo tocaría `db/`.

**¿Cómo funciona la persistencia de la API?** Cada endpoint llama a un repositorio que ejecuta SQL contra `masaya.db`. Crear un reporte y su historial ocurre en una transacción. Las fotos se guardan en `backend/uploads/` con nombre UUID y en la BD solo se guarda ese nombre.

**¿Cómo mitigaron XSS?** (1) El frontend escapa todo dato dinámico con `escapeHTML()` antes de usar `innerHTML`; (2) la API siempre responde JSON con `nosniff`; (3) Helmet pone CSP; (4) las fotos se sirven con `default-src 'none'`. Se probó con `<img onerror>` y `<script>`: se muestra como texto.

**¿Y CSRF?** El JWT va en la cabecera `Authorization`, no en cookies; el navegador no lo envía solo desde otro sitio. Además CORS limita orígenes.

**¿Inyección SQL?** Todas las consultas usan `?` con parámetros; ningún dato del usuario se concatena en el SQL.

**¿Cómo funciona el JWT?** `POST /api/auth/login` verifica la contraseña (bcrypt) y firma un token HS256 con el `JWT_SECRET` que expira en 8 h. El middleware `requiereAuth` lo verifica en cada endpoint protegido. El frontend lo guarda en `sessionStorage`.

**¿Qué pasa si adivinan contraseñas?** Máximo 10 intentos / 15 min por IP (429), hash bcrypt y comparación con hash señuelo.

**¿Qué servicio web exponen?** API REST (GET/POST/PATCH/DELETE, JSON) documentada con OpenAPI/Swagger y Postman. SOAP se descartó por ser legado.

**¿Cómo probaron?** `npm test` (28 pruebas), prueba de carga con autocannon y recorrido en navegador.

## Puntos honestos para decir si preguntan
- Aún no está desplegado (Fase 3). Las capturas son de localhost.
- La contraseña `admin/masaya2026` es de demostración y se cambia antes de publicar.
- El historial de commits debe mostrar a los tres integrantes: **cada quien debe hacer sus commits desde su cuenta**.
