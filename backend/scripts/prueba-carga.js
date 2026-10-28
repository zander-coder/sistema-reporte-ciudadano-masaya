/* Prueba de carga con autocannon sobre endpoints de lectura.
   Requiere el backend corriendo (npm start).  Uso: npm run test:carga */
const autocannon = require('autocannon');
const base = process.env.API_URL || 'http://localhost:3000';

async function correr(titulo, ruta) {
  const r = await autocannon({ url: base + ruta, connections: 50, duration: 10 });
  console.log(`\n${titulo}  (${ruta})`);
  console.log(`  Peticiones/seg (prom.): ${r.requests.average}`);
  console.log(`  Latencia prom./p99:     ${r.latency.average} ms / ${r.latency.p99} ms`);
  console.log(`  Total peticiones: ${r.requests.total}  ·  Errores: ${r.errors}  ·  Respuestas no-2xx: ${r.non2xx}`);
}

(async () => {
  console.log(`Prueba de carga contra ${base} — 50 conexiones concurrentes, 10 s por endpoint`);
  await correr('Listado de reportes (mapa público)', '/api/reportes');
  await correr('Consulta de seguimiento', '/api/reportes/seguimiento?codigo=MSY-KH4821');
  await correr('Estado del servicio', '/api/health');
})();
