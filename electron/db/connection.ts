import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { SCHEMA_SEED_SQL, SCHEMA_SQL } from './schema'

let instancia: Database.Database | null = null

/**
 * Ajusta bases de datos creadas con una versión anterior del esquema para
 * que tengan las columnas que las versiones nuevas del código asumen que
 * existen. `SCHEMA_SQL` usa "CREATE TABLE IF NOT EXISTS", que es perfecto
 * para instalaciones nuevas pero NO modifica una tabla que ya existía con
 * menos columnas — de ahí que esta función se necesite además del script
 * de esquema, no en vez de él.
 *
 * Se ejecuta en cada arranque; todas las operaciones de aquí adentro
 * verifican primero si hace falta el cambio antes de aplicarlo, así que
 * correrla sobre una base de datos ya migrada no hace nada.
 */
function ejecutarMigraciones(db: Database.Database): void {
  const columnasSello = db.prepare('PRAGMA table_info(configuracion_sello)').all() as Array<{ name: string }>
  const nombresColumnasSello = new Set(columnasSello.map((columna) => columna.name))

  if (!nombresColumnasSello.has('persona_firmante')) {
    db.exec("ALTER TABLE configuracion_sello ADD COLUMN persona_firmante TEXT NOT NULL DEFAULT ''")
    // Versiones previas guardaban el nombre en "nombre_directora" y, en
    // instalaciones muy viejas, en "nombre_firmante". Las columnas viejas se
    // dejan en su lugar (SQLite no las necesita fuera) pero ya no se usan.
    if (nombresColumnasSello.has('nombre_directora')) {
      db.exec("UPDATE configuracion_sello SET persona_firmante = nombre_directora WHERE persona_firmante = '' AND nombre_directora <> ''")
    }
    if (nombresColumnasSello.has('nombre_firmante')) {
      db.exec("UPDATE configuracion_sello SET persona_firmante = nombre_firmante WHERE persona_firmante = '' AND nombre_firmante <> ''")
    }
  }
  if (!nombresColumnasSello.has('cargo_firmante')) {
    // Antes el cargo estaba fijo en el código ("Directora"): ese es el valor inicial.
    db.exec("ALTER TABLE configuracion_sello ADD COLUMN cargo_firmante TEXT NOT NULL DEFAULT 'Directora'")
  }
  if (!nombresColumnasSello.has('ruta_sello_con_firma')) {
    db.exec('ALTER TABLE configuracion_sello ADD COLUMN ruta_sello_con_firma TEXT')
    // "ruta_imagen_firma"/"ruta_firma" (versiones previas) guardaban solo la
    // firma escaneada, no el sello completo horneado con firma: no hay una
    // migración fiel posible, así que se deja vacía a propósito.
  }
  if (!nombresColumnasSello.has('ruta_sello_sin_firma')) {
    db.exec('ALTER TABLE configuracion_sello ADD COLUMN ruta_sello_sin_firma TEXT')
    // "ruta_imagen_sello" (versión previa) sí era la imagen del sello en
    // blanco: se traslada tal cual a la nueva columna.
    if (nombresColumnasSello.has('ruta_imagen_sello')) {
      db.exec('UPDATE configuracion_sello SET ruta_sello_sin_firma = ruta_imagen_sello WHERE ruta_sello_sin_firma IS NULL')
    }
  }
  if (!nombresColumnasSello.has('sello_activo_id')) {
    db.exec('ALTER TABLE configuracion_sello ADD COLUMN sello_activo_id INTEGER')
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS sello_catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ruta_imagen TEXT UNIQUE NOT NULL,
      incluye_firma INTEGER NOT NULL CHECK (incluye_firma IN (0, 1)),
      fecha_actualizacion TEXT NOT NULL
    )
  `)
  db.exec(`
    INSERT OR IGNORE INTO sello_catalogo (nombre, ruta_imagen, incluye_firma, fecha_actualizacion)
    SELECT 'Sello con firma', ruta_sello_con_firma, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    FROM configuracion_sello
    WHERE ruta_sello_con_firma IS NOT NULL
  `)
  db.exec(`
    INSERT OR IGNORE INTO sello_catalogo (nombre, ruta_imagen, incluye_firma, fecha_actualizacion)
    SELECT 'Sello en blanco', ruta_sello_sin_firma, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    FROM configuracion_sello
    WHERE ruta_sello_sin_firma IS NOT NULL
  `)
  db.exec(`
    UPDATE configuracion_sello
    SET sello_activo_id = (
      SELECT id FROM sello_catalogo
      WHERE ruta_imagen = COALESCE(ruta_sello_con_firma, ruta_sello_sin_firma)
      LIMIT 1
    )
    WHERE sello_activo_id IS NULL
      AND COALESCE(ruta_sello_con_firma, ruta_sello_sin_firma) IS NOT NULL
  `)

  const columnasEvento = db.prepare('PRAGMA table_info(evento)').all() as Array<{ name: string }>
  if (!columnasEvento.some((columna) => columna.name === 'articulo_evento')) {
    // Artículo ("del", "de la"…) con el que se redactó el nombre del evento. Los
    // eventos anteriores quedan en NULL: su texto ya se generó y no cambia.
    db.exec('ALTER TABLE evento ADD COLUMN articulo_evento TEXT')
  }
  if (!columnasEvento.some((columna) => columna.name === 'forma_articulo_evento')) {
    db.exec(`
      ALTER TABLE evento ADD COLUMN forma_articulo_evento TEXT
      CHECK (forma_articulo_evento IS NULL OR forma_articulo_evento IN ('en el', 'en la'))
    `)
  }

  const columnasConstancia = db.prepare('PRAGMA table_info(constancia)').all() as Array<{
    name: string
  }>
  const nombresColumnas = new Set(columnasConstancia.map((columna) => columna.name))

  if (!nombresColumnas.has('universidad_origen')) {
    // Los registros antiguos solo tenían la universidad en el participante,
    // un dato compartido entre eventos que puede no corresponder a esta constancia.
    db.exec('ALTER TABLE constancia ADD COLUMN universidad_origen TEXT')
  }

  if (!nombresColumnas.has('nombre_impreso')) {
    db.exec('ALTER TABLE constancia ADD COLUMN nombre_impreso TEXT')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS constancia_correccion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      constancia_id INTEGER NOT NULL REFERENCES constancia(id) ON DELETE CASCADE,
      nombre_anterior TEXT NOT NULL,
      nombre_nuevo TEXT NOT NULL,
      texto_anterior TEXT NOT NULL,
      texto_nuevo TEXT NOT NULL,
      fecha_correccion TEXT NOT NULL
    )
  `)

  if (!nombresColumnas.has('estado')) {
    // Backfill deliberado a 'generada': estas filas ya existían antes de
    // que el sistema distinguiera pendiente/generada, lo que en la
    // práctica significa que ya habían completado su ciclo de vida
    // (no había otro estado posible en versiones anteriores del esquema).
    db.exec(`ALTER TABLE constancia ADD COLUMN estado TEXT NOT NULL DEFAULT 'generada'`)
  }

  if (!nombresColumnas.has('folio_interno')) {
    // SQLite no permite agregar una columna UNIQUE directamente con
    // ALTER TABLE ADD COLUMN, así que se agrega sin esa restricción, se
    // rellenan las filas existentes con un valor ya único (derivado del
    // id, que sí lo es) y la unicidad se aplica después con un índice
    // único independiente — ver más abajo.
    db.exec('ALTER TABLE constancia ADD COLUMN folio_interno TEXT')

    const filasSinFolio = db
      .prepare('SELECT id FROM constancia WHERE folio_interno IS NULL')
      .all() as Array<{ id: number }>
    const asignarFolioLegado = db.prepare('UPDATE constancia SET folio_interno = ? WHERE id = ?')
    for (const fila of filasSinFolio) {
      asignarFolioLegado.run(`LEGACY-${fila.id}`, fila.id)
    }
  }

  // Idempotente frente a instalaciones nuevas: la columna ya nace UNIQUE
  // en el CREATE TABLE de schema.ts, así que este índice adicional no
  // molesta (SQLite lo deja crear igual) y sigue siendo la única forma de
  // garantizar unicidad en una base de datos migrada desde el bloque de
  // arriba.
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_constancia_folio_interno ON constancia(folio_interno)',
  )

  // Este índice (no único) se crea aquí y no en schema.sql por la misma
  // razón que el de folio_interno: en una base de datos migrada, la
  // columna `estado` no existe todavía cuando schema.sql se ejecuta, así
  // que un CREATE INDEX sobre ella fallaría si estuviera en ese script.
  // Aquí ya se garantizó arriba que la columna existe.
  db.exec('CREATE INDEX IF NOT EXISTS idx_constancia_estado ON constancia(estado)')

  // El catálogo de QR desapareció: sus folios se conservan en el catálogo
  // de folios (INSERT OR IGNORE: idempotente en cada arranque).
  const tablaQr = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'qr_catalogo'")
    .get()
  if (tablaQr) {
    db.exec(
      `INSERT OR IGNORE INTO folio_catalogo (folio, nombre_referencia, fecha_registro)
       SELECT folio_evento, NULL, fecha_carga FROM qr_catalogo`,
    )
  }
}

/**
 * Devuelve la única instancia de la base de datos para toda la app
 * (patrón singleton: abrirla más de una vez podría corromper el archivo
 * si dos conexiones escriben al mismo tiempo sin coordinarse).
 *
 * La primera vez que se llama:
 * 1. Calcula la ruta del archivo .db dentro de la carpeta de datos del
 *    usuario (en Windows: %APPDATA%/sistema-constancias/constancias.db).
 *    Esa carpeta es donde Electron recomienda guardar datos persistentes
 *    de la app, y sobrevive a actualizaciones del programa.
 * 2. Abre (o crea, si no existe) el archivo.
 * 3. Activa el chequeo de llaves foráneas (SQLite lo trae apagado por
 *    defecto, algo poco intuitivo si vienes de otros motores).
 * 4. Ejecuta el esquema completo. Como cada CREATE TABLE usa
 *    "IF NOT EXISTS", es seguro llamarlo cada vez que arranca la app:
 *    si las tablas ya existen, no hace nada.
 * 5. Ejecuta las migraciones necesarias para bases de datos creadas con
 *    una versión anterior del esquema (ver `ejecutarMigraciones`).
 */
export function obtenerBaseDeDatos(): Database.Database {
  if (instancia) {
    return instancia
  }

  try {
    const carpetaDatos = app.getPath('userData')
    if (!fs.existsSync(carpetaDatos)) {
      fs.mkdirSync(carpetaDatos, { recursive: true })
    }

    const rutaArchivo = path.join(carpetaDatos, 'constancias.db')
    const db = new Database(rutaArchivo)

    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    db.exec(SCHEMA_SQL)
    ejecutarMigraciones(db)
    // Después de migrar: así el seed (INSERT OR IGNORE) ya encuentra las
    // columnas nuevas en una base de datos que venía de una versión vieja.
    db.exec(SCHEMA_SEED_SQL)

    instancia = db
    return instancia
  } catch (error) {
    // Si esto falla, la app no puede funcionar en absoluto (no hay dónde
    // guardar nada), así que relanzamos el error con contexto claro en
    // vez de dejar que main.ts truene con un mensaje críptico.
    throw new Error(
      `No se pudo inicializar la base de datos local: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

/** Cierra la conexión de forma ordenada al salir de la app. */
export function cerrarBaseDeDatos(): void {
  if (instancia) {
    instancia.close()
    instancia = null
  }
}
