/* =========================================================
   MASAYA REPORTA — Configuración del frontend
   Única línea que cambia entre desarrollo y producción:
   la URL base de la API REST (backend).
   - En local (localhost:5500) la API está en el puerto 3000.
   - Desplegado (frontend y API en el mismo dominio) usa /api.
   ========================================================= */
const esLocalSeparado = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '3000';
window.MASAYA_CONFIG = {
  API_URL: esLocalSeparado ? 'http://localhost:3000/api' : '/api',
};
