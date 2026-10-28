/* =========================================================
   Servidor estático mínimo para el FRONTEND (sin dependencias).
   Uso:  node serve.js        ->  http://localhost:5500
   (Alternativa: usar la extensión "Live Server" de VS Code, puerto 5500.)
   El frontend NO contiene lógica de servidor: solo sirve los
   archivos y consume la API REST del backend (puerto 3000).
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = Number(process.env.PORT) || 5500;
const RAIZ = __dirname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta === '/') ruta = '/index.html';
  const archivo = path.normalize(path.join(RAIZ, ruta));
  // Evita salir de la carpeta del frontend (path traversal) y no sirve el propio serve.js
  if (!archivo.startsWith(RAIZ + path.sep) || archivo === __filename) { res.writeHead(403); return res.end('Prohibido'); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log(`Frontend Masaya Reporta en http://localhost:${PUERTO}`));
