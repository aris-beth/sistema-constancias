import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface TandaCreada {
  id: number
  numero: number
  siguienteFolioInterno: number
}

export function crearTanda(
  db: Database.Database,
  eventoId: number,
  folioEvento: string,
  contenido: unknown,
): TandaCreada {
  const huella = createHash('sha256').update(JSON.stringify(contenido)).digest('hex')
  const tandaDuplicada = db
    .prepare('SELECT numero_tanda FROM tanda_importacion WHERE evento_id = ? AND huella_contenido = ?')
    .get(eventoId, huella) as { numero_tanda: number } | undefined
  if (tandaDuplicada) {
    throw new Error(`El contenido coincide con el lote de constancias ${tandaDuplicada.numero_tanda} ya registrado en este evento.`)
  }

  const siguienteTanda = (db
    .prepare('SELECT COALESCE(MAX(numero_tanda), 0) + 1 AS siguiente FROM tanda_importacion WHERE evento_id = ?')
    .get(eventoId) as { siguiente: number }).siguiente
  const documentosPrevios = (db
    .prepare('SELECT EXISTS(SELECT 1 FROM constancia WHERE evento_id = ?) AS existe')
    .get(eventoId) as { existe: number }).existe === 1
  const numero = documentosPrevios && siguienteTanda === 1 ? 2 : siguienteTanda
  const resultado = db
    .prepare(
      `INSERT INTO tanda_importacion (evento_id, numero_tanda, huella_contenido, fecha_generacion)
       VALUES (?, ?, ?, ?)`,
    )
    .run(eventoId, numero, huella, new Date().toISOString())

  const existentes = db
    .prepare('SELECT folio_interno FROM constancia WHERE evento_id = ?')
    .all(eventoId) as Array<{ folio_interno: string }>
  let mayorConsecutivo = 0
  const prefijo = `${folioEvento}-`
  for (const existente of existentes) {
    if (!existente.folio_interno.startsWith(prefijo)) continue
    const consecutivo = Number(existente.folio_interno.slice(prefijo.length))
    if (Number.isSafeInteger(consecutivo)) mayorConsecutivo = Math.max(mayorConsecutivo, consecutivo)
  }

  return {
    id: Number(resultado.lastInsertRowid),
    numero,
    siguienteFolioInterno: mayorConsecutivo + 1,
  }
}
