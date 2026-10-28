/* Crea o actualiza un funcionario.  Uso:  npm run admin:crear -- usuario "contraseña" "Nombre Completo" */
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { abrirConexion } = require('../src/db/connection');
const { migrar } = require('../src/db/migrate');
const { crearRepositorioUsuarios } = require('../src/db/usuariosRepo');

const [usuario, password, nombre] = process.argv.slice(2);
if (!usuario || !password || password.length < 8) {
  console.error('Uso: npm run admin:crear -- <usuario> <contraseña (mín. 8 caracteres)> ["Nombre Completo"]');
  process.exit(1);
}
const db = abrirConexion(config.dbPath);
migrar(db);
crearRepositorioUsuarios(db).guardar({ usuario, passwordHash: bcrypt.hashSync(password, 10), nombre: nombre || usuario });
console.log(`Funcionario "${usuario}" guardado.`);
db.close();
