-- Esquema de la base de datos del Sistema de Constancias.
-- Corresponde a la sección "Modelo de datos" del Documento de Diseño Técnico,
-- ampliado con las tablas de configuración editable (sello/firma, firmantes
-- de graduación, catálogo de folios) y el catálogo de subtipos de graduación que
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
  articulo_evento TEXT CHECK (articulo_evento IS NULL OR articulo_evento IN ('del', 'de la', 'de los', 'de las')),
  forma_articulo_evento TEXT CHECK (forma_articulo_evento IS NULL OR forma_articulo_evento IN ('en el', 'en la'))
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
  universidad_origen TEXT,
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
-- `persona_firmante` / `cargo_firmante`: datos que se imprimen como texto
-- SOLO cuando se usa el sello en blanco; el sello con firma ya los trae
-- horneados en la imagen.
CREATE TABLE IF NOT EXISTS configuracion_sello (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  persona_firmante TEXT NOT NULL DEFAULT '',
  cargo_firmante TEXT NOT NULL DEFAULT 'Directora',
  ruta_sello_con_firma TEXT,
  ruta_sello_sin_firma TEXT,
  sello_activo_id INTEGER,
  fecha_actualizacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sello_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  ruta_imagen TEXT UNIQUE NOT NULL,
  incluye_firma INTEGER NOT NULL CHECK (incluye_firma IN (0, 1)),
  fecha_actualizacion TEXT NOT NULL
);

-- Reglas de emisión editables. `max_constancias_por_persona`: cuántas
-- constancias puede recibir una persona en un evento; la siguiente ya se
-- emite como RECONOCIMIENTO (6 => la 7ª es reconocimiento). Singleton.
CREATE TABLE IF NOT EXISTS configuracion_reglas (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_constancias_por_persona INTEGER NOT NULL DEFAULT 6 CHECK (max_constancias_por_persona >= 1),
  fecha_actualizacion TEXT NOT NULL
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

-- Catálogo de folios: folios ya existentes (capturados a mano) o folios
-- autogenerados que se quieren corregir. El folio es único.
CREATE TABLE IF NOT EXISTS folio_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  nombre_referencia TEXT,
  fecha_registro TEXT NOT NULL
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

-- Filas semilla de las tablas singleton (SCHEMA_SEED_SQL en schema.ts, NO
-- va en el mismo bloque que SCHEMA_SQL): se insertan una sola vez. La
-- combinación de CHECK(id = 1) + INSERT OR IGNORE garantiza que, aunque
-- este script se ejecute en cada arranque de la app, no se dupliquen ni se
-- sobrescriban cambios ya guardados por la persona operadora.
-- Por la MISMA razón explicada arriba para los índices de `constancia`
-- (IF NOT EXISTS no agrega columnas a una tabla que ya existía), este seed
-- se ejecuta en connection.ts DESPUÉS de `ejecutarMigraciones()`: si
-- corriera junto con el resto del esquema, fallaría con "no such column"
-- en una base de datos vieja mientras esa columna no exista todavía.
INSERT OR IGNORE INTO configuracion_sello (id, persona_firmante, cargo_firmante, ruta_sello_con_firma, ruta_sello_sin_firma, fecha_actualizacion)
VALUES (1, '', 'Directora', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO configuracion_reglas (id, max_constancias_por_persona, fecha_actualizacion)
VALUES (1, 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO configuracion_firmantes_graduacion (id, rector_nombre, rector_cargo, director_nombre, director_cargo, fecha_actualizacion)
VALUES (1, '', 'Rectora', '', 'Directora', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
