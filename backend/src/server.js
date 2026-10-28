/* Punto de entrada: abre la BD, aplica migraciones pendientes y levanta el servidor HTTP. */
const config = require('./config');
const { abrirConexion } = require('./db/connection');
const { migrar, sembrar } = require('./db/migrate');
const { crearApp } = require('./app');

const db = abrirConexion(config.dbPath);
const nuevas = migrar(db);
if (nuevas.length) console.log(`Migraciones aplicadas: ${nuevas.join(', ')}`);

let usuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
if (usuarios === 0 && config.seedDemo) {
  sembrar(db);
  usuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  console.log('Datos de demostración cargados (SEED_DEMO=true).');
}
if (usuarios === 0) {
  console.warn('⚠  No hay funcionarios registrados. Ejecuta "npm run db:init" (demo) o "npm run admin:crear -- usuario contraseña".');
}

const app = crearApp({ db, config });
const servidor = app.listen(config.puerto, () => {
  console.log(`API Masaya Reporta escuchando en http://localhost:${config.puerto}`);
  console.log(`Documentación Swagger:       http://localhost:${config.puerto}/api/docs`);
});

function cerrar() {
  servidor.close(() => { db.close(); process.exit(0); });
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
