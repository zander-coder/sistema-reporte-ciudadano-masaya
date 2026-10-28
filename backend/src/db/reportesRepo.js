/* =========================================================
   Repositorio de reportes — capa de acceso a datos.
   TODAS las consultas son parametrizadas (sentencias preparadas),
   lo que elimina la inyección SQL. Ningún dato del usuario se
   concatena dentro de una sentencia SQL.
   ========================================================= */
const { generarCodigo } = require('../utils/codigo');

function crearRepositorio(db) {
  const aDTO = (r) => ({
    id: r.id,
    codigo: r.codigo,
    tipo: r.tipo,
    estado: r.estado,
    descripcion: r.descripcion,
    direccionRef: r.direccion_ref || '',
    lat: r.lat,
    lng: r.lng,
    foto: r.foto ? `/uploads/${r.foto}` : null,
    telefono: r.telefono || '',
    creado: r.creado_en,
    actualizado: r.actualizado_en,
  });

  const sqlHistorial = db.prepare(`
    SELECT e.clave AS estado, h.fecha
      FROM historial_estados h JOIN estados e ON e.id = h.estado_id
     WHERE h.reporte_id = ? ORDER BY h.fecha ASC, h.id ASC`);

  const conHistorial = (dto) => ({ ...dto, historial: sqlHistorial.all(dto.id) });

  return {
    listar({ tipo, estado, limit = 500, offset = 0 } = {}) {
      const where = [];
      const params = [];
      if (tipo)   { where.push('tipo = ?');   params.push(tipo); }
      if (estado) { where.push('estado = ?'); params.push(estado); }
      const sql = `SELECT * FROM vw_reportes ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY creado_en DESC, id DESC LIMIT ? OFFSET ?`;
      return db.prepare(sql).all(...params, limit, offset).map(aDTO);
    },

    obtener(id) {
      const r = db.prepare('SELECT * FROM vw_reportes WHERE id = ?').get(id);
      return r ? conHistorial(aDTO(r)) : null;
    },

    buscarPorCodigo(codigo) {
      const r = db.prepare('SELECT * FROM vw_reportes WHERE codigo = ?').get(codigo);
      return r ? conHistorial(aDTO(r)) : null;
    },

    buscarPorTelefono(telefono) {
      // Se compara ignorando espacios, guiones y signo + (8888-0010 == 88880010).
      const solo = (s) => String(s).replace(/[^0-9]/g, '');
      return db.prepare(`SELECT * FROM vw_reportes
                          WHERE replace(replace(replace(replace(telefono, '-', ''), ' ', ''), '+', ''), '(', '') = ?
                          ORDER BY creado_en DESC LIMIT 50`)
        .all(solo(telefono)).map(aDTO);
    },

    crear({ tipo, descripcion, direccionRef, telefono, lat, lng, foto }) {
      const insertar = db.prepare(`
        INSERT INTO reportes (codigo, tipo_id, estado_id, descripcion, direccion_ref, lat, lng, foto, telefono)
        VALUES (?, (SELECT id FROM tipos_dano WHERE clave = ?), (SELECT id FROM estados WHERE clave = 'recibido'),
                ?, ?, ?, ?, ?, ?)`);
      const insertarHist = db.prepare(`
        INSERT INTO historial_estados (reporte_id, estado_id, usuario_id)
        VALUES (?, (SELECT id FROM estados WHERE clave = 'recibido'), NULL)`);

      const tx = db.transaction(() => {
        for (let intento = 0; intento < 8; intento++) {
          try {
            const info = insertar.run(generarCodigo(), tipo, descripcion, direccionRef, lat, lng, foto || null, telefono);
            insertarHist.run(info.lastInsertRowid);
            return Number(info.lastInsertRowid);
          } catch (err) {
            // Colisión improbable del código de seguimiento: se reintenta con otro.
            if (!String(err.code).startsWith('SQLITE_CONSTRAINT') || !/codigo/.test(err.message)) throw err;
          }
        }
        throw new Error('No se pudo generar un código de seguimiento único.');
      });
      return this.obtener(tx());
    },

    actualizarEstado(id, estado, usuarioId) {
      const tx = db.transaction(() => {
        const upd = db.prepare(`UPDATE reportes SET estado_id = (SELECT id FROM estados WHERE clave = ?) WHERE id = ?`)
          .run(estado, id);
        if (upd.changes === 0) return false;
        db.prepare(`INSERT INTO historial_estados (reporte_id, estado_id, usuario_id)
                    VALUES (?, (SELECT id FROM estados WHERE clave = ?), ?)`).run(id, estado, usuarioId);
        return true;
      });
      return tx() ? this.obtener(id) : null;
    },

    /** Elimina el reporte (el historial se borra en cascada). Devuelve el nombre de la foto, si tenía. */
    eliminar(id) {
      const fila = db.prepare('SELECT foto FROM reportes WHERE id = ?').get(id);
      if (!fila) return null;
      db.prepare('DELETE FROM reportes WHERE id = ?').run(id);
      return { foto: fila.foto };
    },

    estadisticas({ tipo, desde, hasta } = {}) {
      const where = [];
      const params = [];
      if (tipo)  { where.push('tipo = ?');                params.push(tipo); }
      if (desde) { where.push('date(creado_en) >= date(?)'); params.push(desde); }
      if (hasta) { where.push('date(creado_en) <= date(?)'); params.push(hasta); }
      const cond = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const porTipo = {};
      const porEstado = {};
      db.prepare('SELECT clave FROM tipos_dano').all().forEach((t) => { porTipo[t.clave] = 0; });
      db.prepare('SELECT clave FROM estados ORDER BY orden').all().forEach((e) => { porEstado[e.clave] = 0; });
      db.prepare(`SELECT tipo, COUNT(*) AS n FROM vw_reportes ${cond} GROUP BY tipo`).all(...params)
        .forEach((f) => { porTipo[f.tipo] = f.n; });
      db.prepare(`SELECT estado, COUNT(*) AS n FROM vw_reportes ${cond} GROUP BY estado`).all(...params)
        .forEach((f) => { porEstado[f.estado] = f.n; });
      const total = Object.values(porEstado).reduce((a, b) => a + b, 0);
      return { total, porTipo, porEstado };
    },
  };
}

module.exports = { crearRepositorio };
