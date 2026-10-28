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
