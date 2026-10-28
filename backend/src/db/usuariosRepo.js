function crearRepositorioUsuarios(db) {
  return {
    buscarPorUsuario(usuario) {
      return db.prepare('SELECT id, usuario, password_hash, nombre, rol, activo FROM usuarios WHERE usuario = ?').get(usuario);
    },
    buscarPorId(id) {
      return db.prepare('SELECT id, usuario, nombre, rol, activo FROM usuarios WHERE id = ?').get(id);
    },
    guardar({ usuario, passwordHash, nombre, rol = 'administrador' }) {
      db.prepare(`INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)
                  ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash, nombre = excluded.nombre, rol = excluded.rol, activo = 1`)
        .run(usuario, passwordHash, nombre, rol);
    },
  };
}
module.exports = { crearRepositorioUsuarios };
