import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { SCHEMA_SQL } from './schema'

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

  if (!nombresColumnasSello.has('nombre_directora')) {
    db.exec("ALTER TABLE configuracion_sello ADD COLUMN nombre_directora TEXT NOT NULL DEFAULT ''")
  }
  if (!nombresColumnasSello.has('nombre_rectora')) {
    db.exec("ALTER TABLE configuracion_sello ADD COLUMN nombre_rectora TEXT NOT NULL DEFAULT ''")
  }
  if (!nombresColumnasSello.has('ruta_firma')) {
    db.exec('ALTER TABLE configuracion_sello ADD COLUMN ruta_firma TEXT')
  }
  if (!nombresColumnasSello.has('ruta_imagen_sello')) {
    db.exec('ALTER TABLE configuracion_sello ADD COLUMN ruta_imagen_sello TEXT')
  }

  if (nombresColumnasSello.has('nombre_firmante')) {
    db.exec("UPDATE configuracion_sello SET nombre_directora = nombre_firmante WHERE nombre_directora = '' AND nombre_firmante <> ''")
  }
  if (nombresColumnasSello.has('ruta_imagen_firma')) {
    db.exec('UPDATE configuracion_sello SET ruta_firma = ruta_imagen_firma WHERE ruta_firma IS NULL')
  }

  const columnasConstancia = db.prepare('PRAGMA table_info(constancia)').all() as Array<{
    name: string
  }>
  const nombresColumnas = new Set(columnasConstancia.map((columna) => columna.name))

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
