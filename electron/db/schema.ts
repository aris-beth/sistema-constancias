// Fuente de verdad usada en tiempo de ejecución por connection.ts.
// Debe mantenerse idéntico a schema.sql (que sirve como referencia legible
// y es lo que se documenta en el TDD).
export const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS subtipo_graduacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_subtipo TEXT UNIQUE NOT NULL,
  plantilla_texto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracion_sello (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre_directora TEXT NOT NULL DEFAULT '',
  nombre_rectora TEXT NOT NULL DEFAULT '',
  ruta_firma TEXT,
  ruta_imagen_sello TEXT,
  fecha_actualizacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracion_firmantes_graduacion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rector_nombre TEXT NOT NULL DEFAULT '',
  rector_cargo TEXT NOT NULL DEFAULT 'Rectora',
  director_nombre TEXT NOT NULL DEFAULT '',
  director_cargo TEXT NOT NULL DEFAULT 'Directora',
  fecha_actualizacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_evento TEXT UNIQUE NOT NULL,
  ruta_archivo TEXT NOT NULL,
  fecha_carga TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_constancia_evento ON constancia(evento_id);
CREATE INDEX IF NOT EXISTS idx_constancia_rol ON constancia(rol_id);
CREATE INDEX IF NOT EXISTS idx_constancia_participante_participante ON constancia_participante(participante_id);

INSERT OR IGNORE INTO configuracion_sello (id, nombre_firmante, cargo_firmante, ruta_imagen_firma, fecha_actualizacion)
VALUES (1, '', '', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO configuracion_firmantes_graduacion (id, rector_nombre, rector_cargo, director_nombre, director_cargo, fecha_actualizacion)
VALUES (1, '', 'Rectora', '', 'Directora', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`
