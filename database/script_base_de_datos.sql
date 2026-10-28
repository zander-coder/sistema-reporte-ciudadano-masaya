-- SCRIPT DE BASE DE DATOS — Masaya Reporta (SQLite 3)
-- Uso:  sqlite3 masaya.db < script_base_de_datos.sql

-- >>>>>>>>>> migrations/001_esquema_inicial.sql
-- =====================================================================
--  MASAYA REPORTA — Sistema Web de Reporte Ciudadano de Daños Urbanos
--  Script de base de datos (SQLite 3)  ·  Migración 001: esquema inicial
--  Alcaldía Municipal de Masaya — Diseño de Sistemas en Internet (UNI)
-- ---------------------------------------------------------------------
--  Modelo relacional (3FN):
--    usuarios ──< historial_estados >── estados
--    tipos_dano ──< reportes >── estados
--    reportes ──< historial_estados
--  Convenciones: tablas y columnas en español, snake_case, claves
--  primarias enteras autoincrementales, fechas en ISO-8601 UTC (TEXT).
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Catálogo: tipos de daño urbano
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_dano (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    clave   TEXT    NOT NULL UNIQUE,          -- bache | luminaria | fuga | otro
    nombre  TEXT    NOT NULL
);

-- ---------------------------------------------------------------------
-- Catálogo: estados del flujo de atención (Kanban)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estados (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    clave   TEXT    NOT NULL UNIQUE,          -- recibido | revision | proceso | resuelto
    nombre  TEXT    NOT NULL,
    orden   INTEGER NOT NULL UNIQUE           -- posición en el tablero
);

-- ---------------------------------------------------------------------
-- Funcionarios municipales (acceso al panel administrativo)
-- La contraseña NUNCA se guarda en claro: solo el hash bcrypt.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash  TEXT    NOT NULL,
    nombre         TEXT    NOT NULL,
    rol            TEXT    NOT NULL DEFAULT 'funcionario'
                   CHECK (rol IN ('funcionario', 'administrador')),
    activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    creado_en      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------
-- Reportes ciudadanos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,                 -- código de seguimiento: MSY-AB1234
    tipo_id         INTEGER NOT NULL REFERENCES tipos_dano(id),
    estado_id       INTEGER NOT NULL REFERENCES estados(id),
    descripcion     TEXT    NOT NULL CHECK (length(descripcion) BETWEEN 5 AND 300),
    direccion_ref   TEXT    CHECK (direccion_ref IS NULL OR length(direccion_ref) <= 120),
    lat             REAL    NOT NULL CHECK (lat BETWEEN -90  AND 90),
    lng             REAL    NOT NULL CHECK (lng BETWEEN -180 AND 180),
    foto            TEXT,                                    -- nombre del archivo en uploads/
    telefono        TEXT,                                    -- dato personal: solo visible para funcionarios
    creado_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    actualizado_en  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reportes_estado   ON reportes(estado_id);
CREATE INDEX IF NOT EXISTS idx_reportes_tipo     ON reportes(tipo_id);
CREATE INDEX IF NOT EXISTS idx_reportes_telefono ON reportes(telefono);
CREATE INDEX IF NOT EXISTS idx_reportes_creado   ON reportes(creado_en);

-- ---------------------------------------------------------------------
-- Historial de cambios de estado (trazabilidad / línea de tiempo)
-- usuario_id es NULL cuando el cambio lo genera el propio sistema
-- (estado inicial "Recibido" al crear el reporte).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_estados (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reporte_id  INTEGER NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
    estado_id   INTEGER NOT NULL REFERENCES estados(id),
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_historial_reporte ON historial_estados(reporte_id);

-- ---------------------------------------------------------------------
-- Disparador: mantiene actualizado reportes.actualizado_en cuando
-- cambia el estado del reporte.
-- ---------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_reportes_actualizado
AFTER UPDATE OF estado_id ON reportes
FOR EACH ROW
BEGIN
    UPDATE reportes
       SET actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = NEW.id;
END;

-- ---------------------------------------------------------------------
-- Vista: reportes con sus catálogos resueltos (usada por la API)
-- ---------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS vw_reportes AS
SELECT r.id,
       r.codigo,
       t.clave   AS tipo,
       e.clave   AS estado,
       r.descripcion,
       r.direccion_ref,
       r.lat,
       r.lng,
       r.foto,
       r.telefono,
       r.creado_en,
       r.actualizado_en
  FROM reportes r
  JOIN tipos_dano t ON t.id = r.tipo_id
  JOIN estados    e ON e.id = r.estado_id;

-- ---------------------------------------------------------------------
-- Datos de catálogo (necesarios para que el sistema funcione)
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO tipos_dano (clave, nombre) VALUES
    ('bache',     'Bache'),
    ('luminaria', 'Luminaria dañada'),
    ('fuga',      'Fuga de agua'),
    ('otro',      'Otro daño');

INSERT OR IGNORE INTO estados (clave, nombre, orden) VALUES
    ('recibido', 'Recibido',    1),
    ('revision', 'En revisión', 2),
    ('proceso',  'En proceso',  3),
    ('resuelto', 'Resuelto',    4);

-- >>>>>>>>>> seeds/001_datos_demo.sql
-- =====================================================================
--  MASAYA REPORTA — Datos de demostración (semilla)
--  Funcionario de prueba: usuario  admin  /  contraseña  masaya2026
--  (CAMBIAR la contraseña antes de publicar el sistema en producción)
--  Las fechas son relativas a la fecha en que se ejecuta el script.
-- =====================================================================

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO usuarios (usuario, password_hash, nombre, rol) VALUES
    ('admin', '$2a$10$I9t6kMJhVvecnqx5OjqhNe9sMsP6svNC07X9hXy65Ixdqlu3PZXoG', 'Funcionario municipal (demo)', 'administrador');

INSERT OR IGNORE INTO reportes (codigo, tipo_id, estado_id, descripcion, direccion_ref, lat, lng, foto, telefono, creado_en, actualizado_en) VALUES
    ('MSY-KH4821', (SELECT id FROM tipos_dano WHERE clave='bache'), (SELECT id FROM estados WHERE clave='proceso'), 'Bache profundo frente al mercado, afecta a motos.', 'Costado del Mercado Viejo', 11.9752, -86.0961, NULL, '8888-0010', strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days')),
    ('MSY-QD7305', (SELECT id FROM tipos_dano WHERE clave='luminaria'), (SELECT id FROM estados WHERE clave='recibido'), 'Poste de luz apagado desde hace una semana.', 'Barrio San Jerónimo, media cuadra al lago', 11.9765, -86.093, NULL, '8888-0011', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 days')),
    ('MSY-TB1962', (SELECT id FROM tipos_dano WHERE clave='fuga'), (SELECT id FROM estados WHERE clave='revision'), 'Fuga de agua potable saliendo a la calle.', 'Cerca del Malecón', 11.9689, -86.1027, NULL, '8888-0012', strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')),
    ('MSY-LM5540', (SELECT id FROM tipos_dano WHERE clave='bache'), (SELECT id FROM estados WHERE clave='resuelto'), 'Varios baches en la calle principal, ya reparados.', 'Barrio Monimbó, calle principal', 11.9639, -86.0956, NULL, '8888-0013', strftime('%Y-%m-%dT%H:%M:%fZ','now','-12 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-9 days')),
    ('MSY-RW2273', (SELECT id FROM tipos_dano WHERE clave='luminaria'), (SELECT id FROM estados WHERE clave='proceso'), 'Tres luminarias sin funcionar en el parque.', 'Parque Central de Masaya', 11.9739, -86.094, NULL, '8888-0014', strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')),
    ('MSY-ZC9087', (SELECT id FROM tipos_dano WHERE clave='otro'), (SELECT id FROM estados WHERE clave='recibido'), 'Alcantarilla sin tapadera, riesgo para peatones.', 'Colonia Camilo Ortega', 11.9711, -86.0898, NULL, '8888-0015', strftime('%Y-%m-%dT%H:%M:%fZ','now','-0 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-0 days')),
    ('MSY-XN3416', (SELECT id FROM tipos_dano WHERE clave='fuga'), (SELECT id FROM estados WHERE clave='resuelto'), 'Tubería rota, ya fue atendida por ENACAL.', 'Barrio San Juan', 11.98, -86.0975, NULL, '8888-0016', strftime('%Y-%m-%dT%H:%M:%fZ','now','-9 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days')),
    ('MSY-VP6159', (SELECT id FROM tipos_dano WHERE clave='bache'), (SELECT id FROM estados WHERE clave='revision'), 'Bache grande que se llena de agua cuando llueve.', 'Entrada a Barrio Pancasán', 11.967, -86.089, NULL, '8888-0017', strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 days'));

-- Historial de estados de cada reporte de demostración
INSERT INTO historial_estados (reporte_id, estado_id, usuario_id, fecha)
SELECT r.id, e.id, CASE WHEN e.clave = 'recibido' THEN NULL ELSE (SELECT id FROM usuarios WHERE usuario = 'admin') END, h.fecha
FROM (
    SELECT 'MSY-KH4821' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days') AS fecha
    UNION ALL
    SELECT 'MSY-KH4821', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days')
    UNION ALL
    SELECT 'MSY-KH4821', 'proceso', strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days')
    UNION ALL
    SELECT 'MSY-QD7305' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 days') AS fecha
    UNION ALL
    SELECT 'MSY-TB1962' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days') AS fecha
    UNION ALL
    SELECT 'MSY-TB1962', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')
    UNION ALL
    SELECT 'MSY-LM5540' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-12 days') AS fecha
    UNION ALL
    SELECT 'MSY-LM5540', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-11 days')
    UNION ALL
    SELECT 'MSY-LM5540', 'proceso', strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 days')
    UNION ALL
    SELECT 'MSY-LM5540', 'resuelto', strftime('%Y-%m-%dT%H:%M:%fZ','now','-9 days')
    UNION ALL
    SELECT 'MSY-RW2273' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days') AS fecha
    UNION ALL
    SELECT 'MSY-RW2273', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days')
    UNION ALL
    SELECT 'MSY-RW2273', 'proceso', strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')
    UNION ALL
    SELECT 'MSY-ZC9087' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-0 days') AS fecha
    UNION ALL
    SELECT 'MSY-XN3416' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-9 days') AS fecha
    UNION ALL
    SELECT 'MSY-XN3416', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-8 days')
    UNION ALL
    SELECT 'MSY-XN3416', 'proceso', strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')
    UNION ALL
    SELECT 'MSY-XN3416', 'resuelto', strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days')
    UNION ALL
    SELECT 'MSY-VP6159' AS codigo, 'recibido' AS estado, strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days') AS fecha
    UNION ALL
    SELECT 'MSY-VP6159', 'revision', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 days')
) h
JOIN reportes r ON r.codigo = h.codigo
JOIN estados  e ON e.clave  = h.estado
WHERE NOT EXISTS (SELECT 1 FROM historial_estados x WHERE x.reporte_id = r.id);
