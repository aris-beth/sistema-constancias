import { obtenerBaseDeDatos } from '../connection'
import { construirFolio, obtenerAnioFolio } from '../../business/folio/generarFolio'
import type { FolioCatalogoEntry, FolioCatalogoEntryNuevo } from '../../../shared/types/configuracion'

interface FilaFolio {
  id: number
  folio: string
  nombre_referencia: string | null
  fecha_registro: string
}

type BaseDeDatos = ReturnType<typeof obtenerBaseDeDatos>

function mapearFila(fila: FilaFolio): FolioCatalogoEntry {
  return {
    id: fila.id,
    folio: fila.folio,
    nombreReferencia: fila.nombre_referencia,
    fechaRegistro: fila.fecha_registro,
  }
}

function folioYaUsado(db: BaseDeDatos, folio: string): boolean {
  return Boolean(
    db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio) ||
      db.prepare('SELECT id FROM folio_catalogo WHERE folio = ?').get(folio),
  )
}

/** Cuántos eventos ya existen con fecha de ese año, más uno (el consecutivo reinicia cada año). */
function siguienteNumeroDeEvento(db: BaseDeDatos, anio: string): number {
  const eventos = db.prepare('SELECT fecha_constancia FROM evento').all() as Array<{ fecha_constancia: string }>
  let cuenta = 0
  for (const evento of eventos) {
    try {
      if (obtenerAnioFolio(evento.fecha_constancia) === anio) cuenta += 1
    } catch {
      // Fecha con formato inesperado: no cuenta para el consecutivo.
    }
  }
  return cuenta + 1
}

/**
 * Folio automático de un evento nuevo: 4 letras + año + número de evento del
 * año. Si el folio candidato ya lo usa otro evento o el catálogo, avanza al
 * siguiente número.
 */
export function generarFolioAutomatico(nombreEvento: string, fecha: string): string {
  const db = obtenerBaseDeDatos()
  let numero = siguienteNumeroDeEvento(db, obtenerAnioFolio(fecha))
  let folio = construirFolio(nombreEvento, fecha, numero)
  while (folioYaUsado(db, folio)) {
    numero += 1
    folio = construirFolio(nombreEvento, fecha, numero)
  }
  return folio
}

function obtenerPorId(id: number): FolioCatalogoEntry | null {
  const fila = obtenerBaseDeDatos().prepare('SELECT * FROM folio_catalogo WHERE id = ?').get(id) as
    | FilaFolio
    | undefined
  return fila ? mapearFila(fila) : null
}

/** Registra un folio ya existente; si ya estaba en el catálogo, actualiza su referencia. */
export function registrarFolioCatalogo(datos: FolioCatalogoEntryNuevo): FolioCatalogoEntry {
  const db = obtenerBaseDeDatos()
  const folio = datos.folio.trim()
  if (!folio) throw new Error('El folio no puede estar vacío.')

  db.prepare(
    `INSERT INTO folio_catalogo (folio, nombre_referencia, fecha_registro)
     VALUES (@folio, @nombreReferencia, @fechaRegistro)
     ON CONFLICT(folio) DO UPDATE SET nombre_referencia = excluded.nombre_referencia`,
  ).run({
    folio,
    nombreReferencia: datos.nombreReferencia?.trim() || null,
    fechaRegistro: new Date().toISOString(),
  })

  const fila = db.prepare('SELECT * FROM folio_catalogo WHERE folio = ?').get(folio) as FilaFolio | undefined
  if (!fila) throw new Error('El folio se guardó pero no pudo recuperarse inmediatamente después.')
  return mapearFila(fila)
}

/** Edita el texto y la referencia de un folio del catálogo. */
export function actualizarFolioCatalogo(id: number, datos: FolioCatalogoEntryNuevo): FolioCatalogoEntry {
  const db = obtenerBaseDeDatos()
  const folio = datos.folio.trim()
  if (!folio) throw new Error('El folio no puede estar vacío.')

  try {
    const resultado = db
      .prepare('UPDATE folio_catalogo SET folio = ?, nombre_referencia = ? WHERE id = ?')
      .run(folio, datos.nombreReferencia?.trim() || null, id)
    if (resultado.changes === 0) throw new Error(`No existe un folio en el catálogo con id ${id}.`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Ya existe un folio registrado como "${folio}".`)
    }
    throw error
  }

  const actualizado = obtenerPorId(id)
  if (!actualizado) throw new Error(`El folio ${id} se actualizó pero no pudo recuperarse después.`)
  return actualizado
}

export function eliminarFolioCatalogo(id: number): void {
  const resultado = obtenerBaseDeDatos().prepare('DELETE FROM folio_catalogo WHERE id = ?').run(id)
  if (resultado.changes === 0) throw new Error(`No existe un folio en el catálogo con id ${id}.`)
}

export function listarFoliosCatalogo(): FolioCatalogoEntry[] {
  const filas = obtenerBaseDeDatos()
    .prepare('SELECT * FROM folio_catalogo ORDER BY fecha_registro DESC, id DESC')
    .all() as FilaFolio[]
  return filas.map(mapearFila)
}
