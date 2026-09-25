# Masaya Reporta — Prototipo Fase 1

Prototipo navegable del **Sistema Web de Reporte Ciudadano de Daños Urbanos**
para la Alcaldía Municipal de Masaya (Fase 1, Diseño de Sistemas en Internet).

Cubre las 5 pantallas de wireframes de alta fidelidad del documento:
mapa público, formulario de nuevo reporte, confirmación/seguimiento,
login de funcionario y panel administrativo (Kanban, mapa admin, estadísticas).

## Cómo abrirlo

1. Descomprimí el `.zip`.
2. Abrí la carpeta `masaya-reportes` en Visual Studio Code.
3. Instalá la extensión **Live Server** (si no la tenés) y clic derecho
   sobre `index.html` → **"Open with Live Server"**.
4. Se abre en `http://127.0.0.1:5500/index.html` (o el puerto que uses).

No necesita `npm install` ni Node — es HTML/CSS/JS puro, pensado exactamente
para correr con Live Server.

## Acceso al panel administrativo

- URL: `login.html`
- Usuario: `admin`
- Contraseña: `masaya2026`

## Estructura

```
masaya-reportes/
├── index.html          Mapa público de reportes (home)
├── reportar.html        Formulario de nuevo reporte
├── confirmacion.html    Código de seguimiento tras enviar
├── seguimiento.html     Consulta pública de estado
├── login.html           Acceso de funcionarios
├── admin.html           Panel administrativo (Kanban / Mapa / Estadísticas)
├── css/
│   ├── tokens.css        Paleta, tipografía, espaciados
│   ├── base.css          Reset y estilos base
│   ├── components.css    Botones, badges, formularios, modal, stepper
│   ├── layout.css        Layout de páginas públicas
│   └── admin.css         Sidebar, kanban, estadísticas
└── js/
    ├── icons.js          Set de íconos SVG
    ├── utils.js          Helpers + catálogos de tipos/estados
    ├── db.js             "API" simulada con localStorage (ver nota abajo)
    ├── map-public.js      Mapa público (Leaflet) + filtros
    ├── reportar.js         Lógica del formulario
    ├── seguimiento.js      Lógica de consulta de estado
    ├── auth.js             Login demo
    └── admin.js            Kanban, mapa admin, estadísticas
```

## Sobre `js/db.js` — importante para Fase 2 y 3

El documento define una arquitectura de 3 capas con **Frontend y Backend
totalmente desacoplados**, comunicados por una API REST (Node.js + Express +
SQLite). Como este entregable corre solo con Live Server (sin servidor
backend), `db.js` simula esa API usando `localStorage`, pero **cada función
está nombrada y comentada con el endpoint REST que reemplazará** en la Fase 2:

```js
db.reportes.listar(filtros)        // Futuro: GET /api/reportes
db.reportes.crear(data)            // Futuro: POST /api/reportes
db.reportes.buscar({codigo})       // Futuro: GET /api/reportes/seguimiento
db.reportes.actualizarEstado(id,e) // Futuro: PATCH /api/reportes/:id/estado
db.reportes.eliminar(id)           // Futuro: DELETE /api/reportes/:id
db.reportes.estadisticas()         // Futuro: GET /api/reportes/estadisticas
db.auth.login(user, pass)          // Futuro: POST /api/auth/login (JWT)
```

Cuando armés el backend real en Express, la migración es reemplazar el
contenido de cada función por un `fetch()` al endpoint correspondiente — el
resto del frontend (formularios, mapa, kanban) no debería necesitar cambios,
porque ya consume estas funciones como si fueran la API.

Las fotos se guardan como `base64` en `localStorage` solo para esta demo;
en el backend real esto lo resuelve **Multer** guardando el archivo en
`uploads/`, tal como está descrito en el documento (sección 2.2).

## Paleta de color (por qué estos colores)

Pensada para un sistema **municipal e institucional**, no para un producto
de consumo:

- **Teal institucional** `#0E7C86` — color primario, transmite confianza y
  formalidad sin ser el azul genérico de cualquier dashboard.
- **Barro/terracota** `#C1502E` — acento tomado de la identidad artesanal
  de Masaya (cerámica de San Juan de Oriente / Masaya), usado también como
  color del estado "En revisión" (llama la atención sin ser alarmista).
- **Fondo gris-verde suave** `#F1F4F1` — neutro, cómodo para lectura larga
  en el panel administrativo.
- **Estados semánticos**: gris azulado (Recibido) → terracota (En revisión)
  → ámbar (En proceso) → verde (Resuelto), para que cualquier ciudadano
  entienda el avance de un vistazo, incluso sin leer el texto.
- **Sidebar oscuro** (`#24343F`) en el panel admin, para diferenciar
  claramente el espacio "público" (mapa claro) del espacio "interno"
  (gestión municipal).

## Datos de ejemplo

`db.js` siembra 8 reportes de ejemplo distribuidos en distintos barrios de
Masaya (Mercado Viejo, San Jerónimo, Malecón, Monimbó, etc.) para que el
mapa, el Kanban y las estadísticas no se vean vacíos en la primera carga.
Para reiniciar los datos de ejemplo, abrí la consola del navegador y ejecutá:

```js
localStorage.clear()
```

## Qué falta para Fase 2 / Fase 3 (según el documento)

- Backend real en Node.js + Express + SQLite (`better-sqlite3`), JWT y
  Multer — hoy simulado en `db.js`.
- Documentación de la API con OpenAPI/Swagger o colección de Postman.
- Despliegue: frontend en Netlify/Vercel, backend en Render/Railway.
