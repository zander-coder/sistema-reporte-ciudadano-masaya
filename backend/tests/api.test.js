/* =========================================================
   Pruebas de integración de la API (funcionales y de seguridad).
   Usan el ejecutor nativo de Node (node:test): npm test
   Cada ejecución crea una BD SQLite en memoria y una carpeta
   temporal de uploads, por lo que no tocan datos reales.
   ========================================================= */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseConfig = require('../src/config');
const { abrirConexion } = require('../src/db/connection');
const { migrar, sembrar } = require('../src/db/migrate');
const { crearApp } = require('../src/app');

// PNG mínimo válido (1x1 píxel)
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function nuevoEntorno(limites = {}) {
  const db = abrirConexion(':memory:');
  migrar(db);
  sembrar(db);
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'masaya-up-'));
  const config = {
    ...baseConfig,
    uploadsDir,
    limites: { ...baseConfig.limites, habilitado: false, ...limites },
  };
  const app = crearApp({ db, config });
  return new Promise((resolve) => {
    const servidor = app.listen(0, () => {
      const url = `http://127.0.0.1:${servidor.address().port}`;
      resolve({ url, db, uploadsDir, cerrar: () => { servidor.close(); db.close(); fs.rmSync(uploadsDir, { recursive: true, force: true }); } });
    });
  });
}

const json = (r) => r.json();
const formulario = (campos, foto) => {
  const fd = new FormData();
  Object.entries(campos).forEach(([k, val]) => fd.append(k, String(val)));
  if (foto) fd.append('foto', new Blob([foto.buffer], { type: foto.tipo }), foto.nombre);
  return fd;
};
const reporteValido = { tipo: 'bache', descripcion: 'Bache grande frente a la escuela', lat: 11.9744, lng: -86.094, telefono: '8888-1234', direccionRef: 'Frente a la escuela' };

async function login(url, usuario = 'admin', password = 'masaya2026') {
  const r = await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password }) });
  return r;
}

test('Pruebas funcionales de la API', async (t) => {
  const env = await nuevoEntorno();
  t.after(env.cerrar);
  const { url } = env;
  let token;

  await t.test('GET /api/health responde ok', async () => {
    const r = await fetch(`${url}/api/health`);
    assert.equal(r.status, 200);
    assert.equal((await json(r)).estado, 'ok');
  });

  await t.test('GET /api/reportes devuelve la semilla y NO expone teléfonos al público', async () => {
    const r = await fetch(`${url}/api/reportes`);
    const lista = await json(r);
    assert.equal(r.status, 200);
    assert.equal(lista.length, 8);
    assert.ok(lista.every((x) => !('telefono' in x)), 'el teléfono no debe ser público');
  });

  await t.test('GET /api/reportes filtra por tipo y estado', async () => {
    const lista = await fetch(`${url}/api/reportes?tipo=bache&estado=resuelto`).then(json);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].tipo, 'bache');
    const mal = await fetch(`${url}/api/reportes?tipo=inventado`);
    assert.equal(mal.status, 400);
  });

  await t.test('POST /api/auth/login: credenciales correctas devuelven JWT', async () => {
    const r = await login(url);
    assert.equal(r.status, 200);
    const cuerpo = await json(r);
    assert.match(cuerpo.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
    token = cuerpo.token;
  });

  await t.test('POST /api/auth/login: contraseña incorrecta -> 401', async () => {
    const r = await login(url, 'admin', 'incorrecta');
    assert.equal(r.status, 401);
  });

  await t.test('Con token, el listado incluye el teléfono', async () => {
    const lista = await fetch(`${url}/api/reportes`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
    assert.ok(lista.every((x) => 'telefono' in x));
  });

  let creado;
  await t.test('POST /api/reportes crea un reporte con foto y devuelve código de seguimiento (201)', async () => {
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario(reporteValido, { buffer: PNG_1PX, tipo: 'image/png', nombre: 'foto.png' }) });
    assert.equal(r.status, 201);
    creado = await json(r);
    assert.match(creado.codigo, /^MSY-[A-Z]{2}\d{4}$/);
    assert.equal(creado.estado, 'recibido');
    assert.match(creado.foto, /^\/uploads\/[0-9a-f-]{36}\.png$/);
    assert.ok(!('telefono' in creado));
    const img = await fetch(`${url}${creado.foto}`);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
  });

  await t.test('POST /api/reportes valida los datos (400 con detalle por campo)', async () => {
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario({ tipo: 'xxx', descripcion: 'abc', lat: 'hola', lng: -86 }) });
    assert.equal(r.status, 400);
    const { error } = await json(r);
    assert.ok(error.detalles.tipo && error.detalles.descripcion && error.detalles.ubicacion);
  });

  await t.test('POST /api/reportes rechaza ubicaciones fuera del municipio', async () => {
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario({ ...reporteValido, lat: 12.13, lng: -86.25 }) });
    assert.equal(r.status, 400);
  });

  await t.test('GET /api/reportes/seguimiento por código devuelve historial y sin teléfono', async () => {
    const r = await fetch(`${url}/api/reportes/seguimiento?codigo=${creado.codigo.toLowerCase()}`);
    assert.equal(r.status, 200);
    const rep = await json(r);
    assert.equal(rep.codigo, creado.codigo);
    assert.equal(rep.historial.length, 1);
    assert.ok(!('telefono' in rep));
  });

  await t.test('GET /api/reportes/seguimiento por teléfono ignora guiones/espacios', async () => {
    const lista = await fetch(`${url}/api/reportes/seguimiento?telefono=8888%201234`).then(json);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].codigo, creado.codigo);
  });

  await t.test('Seguimiento: código inexistente -> 404, sin parámetros -> 400', async () => {
    assert.equal((await fetch(`${url}/api/reportes/seguimiento?codigo=MSY-ZZ0000`)).status, 404);
    assert.equal((await fetch(`${url}/api/reportes/seguimiento`)).status, 400);
  });

  await t.test('PATCH /api/reportes/:id/estado actualiza y agrega historial (requiere JWT)', async () => {
    const sin = await fetch(`${url}/api/reportes/${creado.id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'proceso' }) });
    assert.equal(sin.status, 401);
    const r = await fetch(`${url}/api/reportes/${creado.id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ estado: 'proceso' }) });
    assert.equal(r.status, 200);
    const rep = await json(r);
    assert.equal(rep.estado, 'proceso');
    assert.deepEqual(rep.historial.map((h) => h.estado), ['recibido', 'proceso']);
    const malo = await fetch(`${url}/api/reportes/${creado.id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ estado: 'cualquiera' }) });
    assert.equal(malo.status, 400);
  });

  await t.test('GET /api/reportes/estadisticas (requiere JWT) suma correctamente', async () => {
    assert.equal((await fetch(`${url}/api/reportes/estadisticas`)).status, 401);
    const est = await fetch(`${url}/api/reportes/estadisticas`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
    assert.equal(est.total, 9);
    assert.equal(Object.values(est.porTipo).reduce((a, b) => a + b, 0), 9);
    assert.equal(est.porEstado.proceso, 3);
  });

  await t.test('DELETE /api/reportes/:id elimina el reporte y su foto (requiere JWT)', async () => {
    assert.equal((await fetch(`${url}/api/reportes/${creado.id}`, { method: 'DELETE' })).status, 401);
    const nombre = creado.foto.replace('/uploads/', '');
    assert.ok(fs.existsSync(path.join(env.uploadsDir, nombre)));
    const r = await fetch(`${url}/api/reportes/${creado.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 204);
    await new Promise((res) => setTimeout(res, 100));
    assert.ok(!fs.existsSync(path.join(env.uploadsDir, nombre)));
    assert.equal(env.db.prepare('SELECT COUNT(*) n FROM historial_estados WHERE reporte_id = ?').get(creado.id).n, 0, 'el historial se borra en cascada');
    const otra = await fetch(`${url}/api/reportes/${creado.id}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(otra.status, 404);
  });
});

test('Pruebas de seguridad de la API', async (t) => {
  const env = await nuevoEntorno();
  t.after(env.cerrar);
  const { url } = env;

  await t.test('Inyección SQL en parámetros no altera las consultas', async () => {
    const payloads = ["' OR '1'='1", "MSY-AB1234' OR 1=1 --", "1; DROP TABLE reportes;--"];
    for (const p of payloads) {
      const a = await fetch(`${url}/api/reportes/seguimiento?codigo=${encodeURIComponent(p)}`);
      assert.ok([400, 404].includes(a.status));
      const b = await fetch(`${url}/api/reportes/seguimiento?telefono=${encodeURIComponent(p)}`);
      assert.ok([200, 400].includes(b.status));
      if (b.status === 200) assert.deepEqual(await b.json(), []);
    }
    const l = await fetch(`${url}/api/reportes?tipo=${encodeURIComponent("bache' OR '1'='1")}`);
    assert.equal(l.status, 400);
    assert.equal(env.db.prepare('SELECT COUNT(*) n FROM reportes').get().n, 8, 'la tabla sigue intacta');
  });

  await t.test('Inyección SQL en el login no permite entrar', async () => {
    const r = await login(url, "admin' --", "x' OR '1'='1");
    assert.equal(r.status, 401);
  });

  await t.test('XSS: el script se almacena como texto inerte y la API responde application/json', async () => {
    const xss = '<script>alert("xss")</script>';
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario({ ...reporteValido, descripcion: xss + ' bache' }) });
    assert.equal(r.status, 201);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok((await json(r)).descripcion.includes('<script>'), 'se guarda tal cual; el frontend lo escapa al renderizar');
  });

  await t.test('Archivo disfrazado (texto con extensión .jpg) es rechazado por su firma real', async () => {
    const falso = Buffer.from('<?php system($_GET["c"]); ?> esto no es una imagen');
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario(reporteValido, { buffer: falso, tipo: 'image/jpeg', nombre: 'malware.jpg' }) });
    assert.equal(r.status, 400);
    assert.deepEqual(fs.readdirSync(env.uploadsDir), [], 'no debe quedar ningún archivo guardado');
  });

  await t.test('Foto mayor al límite -> 413', async () => {
    const grande = Buffer.concat([PNG_1PX, Buffer.alloc(6 * 1024 * 1024)]);
    const r = await fetch(`${url}/api/reportes`, { method: 'POST', body: formulario(reporteValido, { buffer: grande, tipo: 'image/png', nombre: 'grande.png' }) });
    assert.equal(r.status, 413);
  });

  await t.test('Token manipulado o firmado con otra clave -> 401', async () => {
    const jwt = require('jsonwebtoken');
    const falso = jwt.sign({ sub: 1, usuario: 'admin', rol: 'administrador' }, 'otra-clave');
    const r = await fetch(`${url}/api/reportes/estadisticas`, { headers: { Authorization: `Bearer ${falso}` } });
    assert.equal(r.status, 401);
    const sinFirma = jwt.sign({ sub: 1, rol: 'administrador' }, '', { algorithm: 'none' });
    const r2 = await fetch(`${url}/api/reportes/estadisticas`, { headers: { Authorization: `Bearer ${sinFirma}` } });
    assert.equal(r2.status, 401);
  });

  await t.test('CORS: un origen no autorizado es rechazado; el autorizado recibe la cabecera', async () => {
    const mal = await fetch(`${url}/api/reportes`, { headers: { Origin: 'https://sitio-malicioso.example' } });
    assert.equal(mal.status, 403);
    const bien = await fetch(`${url}/api/reportes`, { headers: { Origin: 'http://localhost:5500' } });
    assert.equal(bien.status, 200);
    assert.equal(bien.headers.get('access-control-allow-origin'), 'http://localhost:5500');
  });

  await t.test('Cabeceras de seguridad (Helmet) presentes y sin X-Powered-By', async () => {
    const r = await fetch(`${url}/api/health`);
    assert.ok(r.headers.get('content-security-policy'));
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(r.headers.get('strict-transport-security'));
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  await t.test('Las contraseñas se guardan como hash bcrypt, nunca en claro', () => {
    const { password_hash } = env.db.prepare("SELECT password_hash FROM usuarios WHERE usuario = 'admin'").get();
    assert.match(password_hash, /^\$2[aby]\$10\$/);
    assert.ok(!password_hash.includes('masaya2026'));
  });

  await t.test('Errores internos no filtran detalles; rutas inexistentes -> 404 JSON', async () => {
    const r = await fetch(`${url}/api/no-existe`);
    assert.equal(r.status, 404);
    assert.equal((await json(r)).error.codigo, 'NO_ENCONTRADO');
    const mal = await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malformado' });
    assert.equal(mal.status, 400);
  });
});

test('Límite de intentos de login (fuerza bruta) -> 429', async (t) => {
  const env = await nuevoEntorno({ habilitado: true, login: { ventanaMs: 60000, max: 3 } });
  t.after(env.cerrar);
  const estados = [];
  for (let i = 0; i < 5; i++) estados.push((await login(env.url, 'admin', 'mala' + i)).status);
  assert.deepEqual(estados, [401, 401, 401, 429, 429]);
});
