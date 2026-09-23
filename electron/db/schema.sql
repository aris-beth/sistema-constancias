-- Esquema de la base de datos del Sistema de Constancias.
-- Corresponde a la sección "Modelo de datos" del Documento de Diseño Técnico,
-- ampliado con las tablas de configuración editable (sello/firma, firmantes
-- de graduación, catálogo de QR) y el catálogo de subtipos de graduación que
-- exige la sección "Mantenibilidad" de los requerimientos: poder ajustar
-- estos datos sin depender de un desarrollador para cada cambio.
--
-- IMPORTANTE: "CREATE TABLE IF NOT EXISTS" solo crea tablas nuevas; NO
-- modifica una tabla que ya existía con menos columnas. Los cambios a
-- `constancia` para bases de datos creadas con una versión anterior de este
-- esquema los aplica `ejecutarMigraciones()` en connection.ts, que se llama
-- justo después de este script en cada arranque de la app.

CREATE TABLE IF NOT EXISTS evento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  nombre_evento TEXT NOT NULL,
  fecha_constancia TEXT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('Presencial CU', 'Presencial CU2', 'En línea', 'Otro')),
  tipo_plantilla TEXT NOT NULL CHECK (tipo_plantilla IN ('regular', 'graduacion')),
  generacion TEXT,
  carrera TEXT,
  ruta_qr TEXT
);

CREATE TABLE IF NOT EXISTS participante (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_original TEXT NOT NULL,
  nombre_normalizado TEXT NOT NULL,
  grado_academico TEXT,
  categoria TEXT CHECK (categoria IN ('Maestro BUAP', 'Alumno BUAP', 'Externo')),
  universidad_origen TEXT
);

CREATE TABLE IF NOT EXISTS rol (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_rol TEXT UNIQUE NOT NULL,
  plantilla_texto TEXT NOT NULL
);

-- `folio_interno`: identificador único por documento que exige la sección
-- 2.1 de requerimientos, distinto del folio del evento. Formato asignado
-- por el repositorio: "{folio_evento}-{consecutivo de 4 dígitos}".
--
-- `estado`: 'generada' se asigna en el momento en que el registro de la
-- constancia se persiste exitosamente (no cuando el PDF físico se escribe
-- en disco), para que el conteo de la 7ª constancia (sección 5.3 de
-- requerimientos) pueda usar filas del mismo lote que se están procesando.
-- 'pendiente' queda reservado para el caso, poco común, de que la
-- escritura del PDF falle después de haberse creado el registro. Las filas
-- que no pasan la validación del Excel nunca llegan a insertarse aquí
-- (criterio de aceptación #8): se reportan como pendientes solo en la
-- vista previa, sin tocar esta tabla.
CREATE TABLE IF NOT EXISTS constancia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL REFERENCES evento(id),
  rol_id INTEGER NOT NULL REFERENCES rol(id),
  ponencia TEXT,
  texto_generado TEXT NOT NULL,
  es_personalizado INTEGER NOT NULL DEFAULT 0,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('constancia', 'reconocimiento')),
  numero_para_persona_evento INTEGER NOT NULL DEFAULT 1,
  fecha_generacion TEXT NOT NULL,
  folio_interno TEXT UNIQUE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'generada' CHECK (estado IN ('pendiente', 'generada'))
);

CREATE TABLE IF NOT EXISTS constancia_participante (
  constancia_id INTEGER NOT NULL REFERENCES constancia(id),
  participante_id INTEGER NOT NULL REFERENCES participante(id),
  PRIMARY KEY (constancia_id, participante_id)
);

CREATE TABLE IF NOT EXISTS abreviatura_academica (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forma_encontrada TEXT NOT NULL,
  abreviatura_aceptada TEXT NOT NULL
);

-- Catálogo de plantillas de texto para reconocimientos de graduación
-- (sección 5.2/6.5 de requerimientos: Integrante de generación, Distinción
-- al Mérito Académico, Labor docente). Mismo patrón que `rol`: vive en base
-- de datos para que el equipo de la facultad pueda ajustar el texto sin
-- depender de un desarrollador.
CREATE TABLE IF NOT EXISTS subtipo_graduacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_subtipo TEXT UNIQUE NOT NULL,
  plantilla_texto TEXT NOT NULL
);

-- Configuración editable del sello/firma de constancias regulares (sección
-- 6.4 de requerimientos). Tabla "singleton": el CHECK(id = 1) garantiza que
-- solo exista una fila, porque hay una sola configuración vigente a la vez
-- (no una por evento).
-- electron/db/schema.sql
CREATE TABLE IF NOT EXISTS configuracion_sello (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_directora TEXT NOT NULL,
    nombre_rectora TEXT NOT NULL,
    ruta_firma TEXT NOT NULL,
    ruta_imagen_sello TEXT,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registro_qr (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio_asociado TEXT NOT NULL,
    ruta_qr TEXT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configuración editable de los dos firmantes de reconocimientos de
-- graduación (Rector/a y Director/a — sección 6.5 de requerimientos).
-- También singleton: cambian con poca frecuencia y se editan desde la
-- misma pantalla que el sello, no por evento.
CREATE TABLE IF NOT EXISTS configuracion_firmantes_graduacion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rector_nombre TEXT NOT NULL DEFAULT '',
  rector_cargo TEXT NOT NULL DEFAULT 'Rectora',
  director_nombre TEXT NOT NULL DEFAULT '',
  director_cargo TEXT NOT NULL DEFAULT 'Directora',
  fecha_actualizacion TEXT NOT NULL
);

-- Catálogo de códigos QR ya cargados (sección 6.4 y 9.3 de requerimientos):
-- el asociador de QR busca aquí, por folio de evento, la imagen que debe
-- incluirse en las constancias regulares de ese evento.
CREATE TABLE IF NOT EXISTS qr_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_evento TEXT UNIQUE NOT NULL,
  ruta_archivo TEXT NOT NULL,
  fecha_carga TEXT NOT NULL
);

-- Índices: aceleran las consultas del módulo de estadísticas y de búsqueda
-- por evento, que son las más frecuentes en el flujo normal de uso.
-- NOTA: los índices sobre `estado` y `folio_interno` NO se crean aquí —
-- se crean en `ejecutarMigraciones()` (connection.ts), después de
-- garantizar que esas columnas existen. Si se crearan en este script, en
-- una base de datos con el esquema anterior (donde `constancia` ya existe
-- sin esas columnas) el CREATE INDEX fallaría, porque "IF NOT EXISTS" en
-- CREATE TABLE evita recrear la tabla pero no agrega columnas nuevas.
CREATE INDEX IF NOT EXISTS idx_constancia_evento ON constancia(evento_id);
CREATE INDEX IF NOT EXISTS idx_constancia_rol ON constancia(rol_id);
CREATE INDEX IF NOT EXISTS idx_constancia_participante_participante ON constancia_participante(participante_id);

-- Filas semilla de las tablas singleton: se insertan una sola vez. La
-- combinación de CHECK(id = 1) + INSERT OR IGNORE garantiza que, aunque
-- este script se ejecute en cada arranque de la app, no se dupliquen ni se
-- sobrescriban cambios ya guardados por la persona operadora.
INSERT OR IGNORE INTO configuracion_sello (id, nombre_directora, nombre_rectora, ruta_firma, ruta_imagen_sello, fecha_actualizacion)
VALUES (1, '', '', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO configuracion_firmantes_graduacion (id, rector_nombre, rector_cargo, director_nombre, director_cargo, fecha_actualizacion)
VALUES (1, '', 'Rectora', '', 'Directora', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
