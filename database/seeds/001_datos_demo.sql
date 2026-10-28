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
