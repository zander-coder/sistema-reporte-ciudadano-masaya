/* =========================================================
   MASAYA REPORTA — Cliente de la API REST
   ---------------------------------------------------------
   Reemplaza al antiguo db.js (mock con localStorage). Cada
   función hace una petición HTTP real (fetch) al backend
   Node.js/Express; los datos viven en la base de datos SQLite.
   El resto del frontend consume este objeto `api`.
   ========================================================= */

const API_URL = (window.MASAYA_CONFIG && window.MASAYA_CONFIG.API_URL) || 'http://localhost:3000/api';
const API_ORIGIN = new URL(API_URL, window.location.href).origin;
const AUTH_KEY = 'masaya_admin_session_v1';

const CENTRO_MASAYA = { lat: 11.9744, lng: -86.0940 };

class ApiError extends Error {
  constructor(status, codigo, mensaje, detalles){
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
  /** Mensaje listo para mostrar al usuario (incluye el detalle por campo si lo hay). */
  paraUsuario(){
    const det = this.detalles ? Object.values(this.detalles).join(' ') : '';
    return det ? `${this.message} ${det}` : this.message;
  }
}

function _sesion(){
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch { return null; }
}

/** Convierte la ruta relativa de la foto (/uploads/x.jpg) en URL absoluta del backend. */
function _normalizar(r){
  if (r && r.foto && r.foto.startsWith('/')) r.foto = API_ORIGIN + r.foto;
  return r;
}

async function _peticion(ruta, { metodo = 'GET', json, formData, query, auth = false } = {}){
  const url = new URL(API_URL + ruta, window.location.href);
  if (query) Object.entries(query).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });

  const headers = {};
  let body;
  if (json !== undefined){ headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (formData) body = formData; // el navegador fija el multipart/form-data con su boundary
  const sesion = _sesion();
  if (sesion && sesion.token) headers['Authorization'] = 'Bearer ' + sesion.token;

  let resp;
  try {
    resp = await fetch(url, { method: metodo, headers, body });
  } catch {
    throw new ApiError(0, 'RED', 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
  }

  if (resp.status === 204) return null;
  let data = null;
  try { data = await resp.json(); } catch { /* respuesta sin cuerpo JSON */ }

  if (!resp.ok){
    const e = (data && data.error) || {};
    if (resp.status === 401 && auth){
      sessionStorage.removeItem(AUTH_KEY);
      window.location.href = 'login.html';
    }
    throw new ApiError(resp.status, e.codigo || 'ERROR', e.mensaje || 'Ocurrió un error inesperado.', e.detalles);
  }
  return data;
}

const api = {

  reportes: {
    /** GET /api/reportes?tipo=&estado= */
    async listar(filtros = {}){
      const lista = await _peticion('/reportes', { query: filtros });
      return lista.map(_normalizar);
    },

    /** POST /api/reportes  (multipart/form-data con foto opcional) */
    async crear({ tipo, descripcion, direccionRef, telefono, lat, lng, foto }){
      const fd = new FormData();
      fd.append('tipo', tipo);
      fd.append('descripcion', descripcion);
      fd.append('lat', lat);
      fd.append('lng', lng);
      if (direccionRef) fd.append('direccionRef', direccionRef);
      if (telefono) fd.append('telefono', telefono);
      if (foto) fd.append('foto', foto);
      return _normalizar(await _peticion('/reportes', { metodo: 'POST', formData: fd }));
    },

    /** GET /api/reportes/seguimiento?codigo=  |  ?telefono=   (devuelve objeto, arreglo o null) */
    async buscar({ codigo, telefono }){
      try {
        const res = await _peticion('/reportes/seguimiento', { query: codigo ? { codigo } : { telefono } });
        return Array.isArray(res) ? res.map(_normalizar) : _normalizar(res);
      } catch (e){
        if (e.status === 404) return null;
        throw e;
      }
    },

    /** PATCH /api/reportes/:id/estado  (requiere JWT) */
    async actualizarEstado(id, estado){
      return _normalizar(await _peticion(`/reportes/${encodeURIComponent(id)}/estado`, { metodo: 'PATCH', json: { estado }, auth: true }));
    },

    /** DELETE /api/reportes/:id  (requiere JWT) */
    async eliminar(id){
      await _peticion(`/reportes/${encodeURIComponent(id)}`, { metodo: 'DELETE', auth: true });
    },

    /** GET /api/reportes/estadisticas  (requiere JWT) */
    estadisticas(){
      return _peticion('/reportes/estadisticas', { auth: true });
    },
  },

  auth: {
    /** POST /api/auth/login -> { token, usuario }  (JWT) */
    async login(usuario, password){
      const res = await _peticion('/auth/login', { metodo: 'POST', json: { usuario, password } });
      sessionStorage.setItem(AUTH_KEY, JSON.stringify({ usuario: res.usuario.nombre || res.usuario.usuario, token: res.token }));
      return res.usuario;
    },
    estaAutenticado(){
      const s = _sesion();
      return !!(s && s.token);
    },
    usuarioActual(){
      const s = _sesion();
      return s ? s.usuario : null;
    },
    cerrarSesion(){
      sessionStorage.removeItem(AUTH_KEY);
    },
  },
};
