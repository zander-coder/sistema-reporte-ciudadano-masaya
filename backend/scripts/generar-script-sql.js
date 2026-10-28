/* Genera el script SQL único de entrega: esquema + datos de demostración.
   Uso: npm run db:script   ->  ../database/script_base_de_datos.sql */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');

const leer = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => `-- >>>>>>>>>> ${path.basename(dir)}/${f}\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

const salida = path.join(config.migracionesDir, '..', 'script_base_de_datos.sql');
fs.writeFileSync(salida,
  '-- SCRIPT DE BASE DE DATOS — Masaya Reporta (SQLite 3)\n' +
  '-- Uso:  sqlite3 masaya.db < script_base_de_datos.sql\n\n' +
  leer(config.migracionesDir) + '\n' + leer(config.seedsDir));
console.log('Generado: ' + salida);
