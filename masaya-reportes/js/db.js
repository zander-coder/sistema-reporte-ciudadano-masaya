/* =========================================================
   MASAYA REPORTA — Capa de datos (mock de API REST)
   ---------------------------------------------------------
   NOTA PARA FASE 2/3:
   Este archivo simula, con localStorage, las respuestas que
   en producción vendrán del backend real (Node.js + Express +
   SQLite descrito en el documento). Cada función está
   nombrada y estructurada como el futuro endpoint que
   reemplazará (ver comentario "Futuro endpoint:" en cada una),
   para que migrar de mock -> fetch() a la API real sea directo.
   ========================================================= */

const DB_KEY = 'masaya_reportes_db_v1';
const AUTH_KEY = 'masaya_admin_session_v1';

const CENTRO_MASAYA = { lat: 11.9744, lng: -86.0940 };

function _leerDB(){
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
}
function _guardarDB(lista){
  localStorage.setItem(DB_KEY, JSON.stringify(lista));
}

function _seedIfEmpty(){
  if (localStorage.getItem(DB_KEY)) return;

  const ahora = Date.now();
  const dia = 86400000;
  const base = [
    { tipo: 'bache', estado: 'proceso', desc: 'Bache profundo frente al mercado, afecta a motos.', lat: 11.9752, lng: -86.0961, dias: 6, ref: 'Costado del Mercado Viejo' },
    { tipo: 'luminaria', estado: 'recibido', desc: 'Poste de luz apagado desde hace una semana.', lat: 11.9765, lng: -86.0930, dias: 1, ref: 'Barrio San Jerónimo, media cuadra al lago' },
    { tipo: 'fuga', estado: 'revision', desc: 'Fuga de agua potable saliendo a la calle.', lat: 11.9689, lng: -86.1027, dias: 3, ref: 'Cerca del Malecón' },
    { tipo: 'bache', estado: 'resuelto', desc: 'Varios baches en la calle principal, ya reparados.', lat: 11.9639, lng: -86.0956, dias: 12, ref: 'Barrio Monimbó, calle principal' },
    { tipo: 'luminaria', estado: 'proceso', desc: 'Tres luminarias sin funcionar en el parque.', lat: 11.9739, lng: -86.0940, dias: 4, ref: 'Parque Central de Masaya' },
    { tipo: 'otro', estado: 'recibido', desc: 'Alcantarilla sin tapadera, riesgo para peatones.', lat: 11.9711, lng: -86.0898, dias: 0, ref: 'Colonia Camilo Ortega' },
    { tipo: 'fuga', estado: 'resuelto', desc: 'Tubería rota, ya fue atendida por ENACAL.', lat: 11.9800, lng: -86.0975, dias: 9, ref: 'Barrio San Juan' },
    { tipo: 'bache', estado: 'revision', desc: 'Bache grande que se llena de agua cuando llueve.', lat: 11.9670, lng: -86.0890, dias: 2, ref: 'Entrada a Barrio Pancasán' },
  ];

  const seed = base.map((r, i) => {
    const creado = new Date(ahora - r.dias * dia).toISOString();
    const historial = [{ estado: 'recibido', fecha: creado }];
    if (r.estado !== 'recibido'){
      ORDEN_ESTADOS.slice(1, ORDEN_ESTADOS.indexOf(r.estado) + 1).forEach((est, idx) => {
        historial.push({ estado: est, fecha: new Date(ahora - (r.dias - idx - 1) * dia).toISOString() });
      });
    }
    return {
      id: 'r' + (i + 1),
      codigo: generarCodigo(),
      tipo: r.tipo,
      estado: r.estado,
      descripcion: r.desc,
      direccionRef: r.ref,
      lat: r.lat,
      lng: r.lng,
      foto: null,
      telefono: '8888-00' + (10 + i),
      creado,
      historial,
    };
  });

  _guardarDB(seed);
}
_seedIfEmpty();

const db = {

  reportes: {
    /** Futuro endpoint: GET /api/reportes?tipo=&estado= */
    listar(filtros = {}){
      let lista = _leerDB();
      if (filtros.tipo) lista = lista.filter(r => r.tipo === filtros.tipo);
      if (filtros.estado) lista = lista.filter(r => r.estado === filtros.estado);
      return lista.sort((a, b) => new Date(b.creado) - new Date(a.creado));
    },

    /** Futuro endpoint: POST /api/reportes (multipart/form-data con foto) */
    crear(data){
      const lista = _leerDB();
      const nuevo = {
        id: 'r' + Date.now(),
        codigo: generarCodigo(),
        tipo: data.tipo,
        estado: 'recibido',
        descripcion: data.descripcion || '',
        direccionRef: data.direccionRef || '',
        lat: data.lat,
        lng: data.lng,
        foto: data.foto || null,
        telefono: data.telefono || '',
        creado: new Date().toISOString(),
        historial: [{ estado: 'recibido', fecha: new Date().toISOString() }],
      };
      lista.push(nuevo);
      _guardarDB(lista);
      return nuevo;
    },

    /** Futuro endpoint: GET /api/reportes/seguimiento?codigo=&telefono= */
    buscar({ codigo, telefono }){
      const lista = _leerDB();
      const norm = (s) => (s || '').trim().toUpperCase();
      if (codigo){
        return lista.find(r => norm(r.codigo) === norm(codigo)) || null;
      }
      if (telefono){
        return lista.filter(r => (r.telefono || '').trim() === telefono.trim());
      }
      return null;
    },

    /** Futuro endpoint: PATCH /api/reportes/:id/estado */
    actualizarEstado(id, nuevoEstado){
      const lista = _leerDB();
      const r = lista.find(x => x.id === id);
      if (!r) return null;
      r.estado = nuevoEstado;
      r.historial.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      _guardarDB(lista);
      return r;
    },

    /** Futuro endpoint: DELETE /api/reportes/:id */
    eliminar(id){
      const lista = _leerDB().filter(r => r.id !== id);
      _guardarDB(lista);
    },

    /** Futuro endpoint: GET /api/reportes/estadisticas */
    estadisticas(){
      const lista = _leerDB();
      const porTipo = {}; const porEstado = {};
      Object.keys(TIPO_INFO).forEach(t => porTipo[t] = 0);
      Object.keys(ESTADO_INFO).forEach(e => porEstado[e] = 0);
      lista.forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; porEstado[r.estado] = (porEstado[r.estado] || 0) + 1; });
      return { total: lista.length, porTipo, porEstado };
    },
  },

  auth: {
    /** Futuro endpoint: POST /api/auth/login -> { token } (JWT) */
    login(usuario, password){
      if (usuario.trim().toLowerCase() === 'admin' && password === 'masaya2026'){
        const token = 'demo.' + btoa(usuario + ':' + Date.now());
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ usuario, token }));
        return true;
      }
      return false;
    },
    estaAutenticado(){
      return !!sessionStorage.getItem(AUTH_KEY);
    },
    usuarioActual(){
      const raw = sessionStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw).usuario : null;
    },
    cerrarSesion(){
      sessionStorage.removeItem(AUTH_KEY);
    },
  },
};
