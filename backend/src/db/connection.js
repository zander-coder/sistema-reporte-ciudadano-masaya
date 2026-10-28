/* Conexión a SQLite (better-sqlite3). Una sola conexión por proceso. */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function abrirConexion(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');        // integridad referencial activa
  if (dbPath !== ':memory:') db.pragma('journal_mode = WAL'); // mejor concurrencia lectura/escritura
  return db;
}

module.exports = { abrirConexion };
