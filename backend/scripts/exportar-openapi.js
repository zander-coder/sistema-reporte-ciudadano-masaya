/* Exporta la especificación OpenAPI a ../docs/openapi.json (para importar en Postman / Swagger Editor). */
const fs = require('fs');
const path = require('path');
const openapi = require('../src/docs/openapi');
const salida = path.join(__dirname, '..', '..', 'docs', 'openapi.json');
fs.writeFileSync(salida, JSON.stringify(openapi, null, 2));
console.log('Generado: ' + salida);
