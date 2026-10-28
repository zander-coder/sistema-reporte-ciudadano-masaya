/* =========================================================
   Migraciones de base de datos
   - Ejecuta en orden los archivos database/migrations/NNN_*.sql
   - Registra cada migración aplicada en la tabla schema_migrations,
     por lo que es seguro correrlo muchas veces (idempotente).
   Uso:
     npm run db:migrar     -> solo esquema
     npm run db:init       -> esquema + datos de demostración
     npm run db:reset      -> borra la BD y la recrea con datos demo
   ========================================================= */
const fs = require('fs');
const config = require('../config');
const { abrirConexion } = require('./connection');

function listarSql(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
}

function migrar(db, dir = config.migracionesDir) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    aplicada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const aplicadas = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const nuevas = [];
  for (const archivo of listarSql(dir)) {
    if (aplicadas.has(archivo)) continue;
    const sql = fs.readFileSync(`${dir}/${archivo}`, 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(archivo);
      db.exec('COMMIT');
      nuevas.push(archivo);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Falló la migración ${archivo}: ${err.message}`);
    }
  }
  return nuevas;
}

function sembrar(db, dir = config.seedsDir) {
  for (const archivo of listarSql(dir)) {
    db.exec(fs.readFileSync(`${dir}/${archivo}`, 'utf8'));
  }
}

module.exports = { migrar, sembrar };

// ---- Ejecución desde la línea de comandos ----
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--reset') && config.dbPath !== ':memory:') {
    for (const sufijo of ['', '-wal', '-shm']) {
      if (fs.existsSync(config.dbPath + sufijo)) fs.unlinkSync(config.dbPath + sufijo);
    }
    console.log('Base de datos anterior eliminada.');
  }
  const db = abrirConexion(config.dbPath);
  const nuevas = migrar(db);
  console.log(nuevas.length ? `Migraciones aplicadas: ${nuevas.join(', ')}` : 'Esquema al día (sin migraciones pendientes).');
  if (args.includes('--seed')) {
    sembrar(db);
    console.log('Datos de demostración cargados.');
  }
  console.log('Base de datos lista en: ' + config.dbPath);
  db.close();
}
