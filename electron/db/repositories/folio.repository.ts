import { obtenerBaseDeDatos } from '../connection'
import { construirFolio, obtenerAnioFolio } from '../../business/folio/generarFolio'
import type { FolioCatalogoEntry, FolioCatalogoEntryNuevo, OrigenFolio } from '../../../shared/types/configuracion'

interface FilaFolio {
  id: number
  folio: string
  nombre_referencia: string | null
  fecha_registro: string
}

type BaseDeDatos = ReturnType<typeof obtenerBaseDeDatos>

interface FilaFolioListado extends FilaFolio {
  origen: 'catalogo' | 'evento'
}

function mapearFila(fila: FilaFolio, origen: 'catalogo' | 'evento' = 'catalogo'): FolioCatalogoEntry {
  return {
    id: fila.id,
    folio: fila.folio,
    nombreReferencia: fila.nombre_referencia,
    fechaRegistro: fila.fecha_registro,
    origen,
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
  return fila ? mapearFila(fila, 'catalogo') : null
}

/** Registra un folio ya existente; si ya estaba en el catálogo, actualiza su referencia. */
export function registrarFolioCatalogo(datos: FolioCatalogoEntryNuevo): FolioCatalogoEntry {
  const db = obtenerBaseDeDatos()
  const folio = datos.folio.trim()
  if (!folio) throw new Error('El folio no puede estar vacío.')
  if (db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio)) {
    throw new Error(`El folio "${folio}" ya pertenece a un evento guardado en el sistema.`)
  }

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
  return mapearFila(fila, 'catalogo')
}

/** Edita el texto y la referencia de un folio del catálogo. */
export function actualizarFolioCatalogo(id: number, datos: FolioCatalogoEntryNuevo): FolioCatalogoEntry {
  const db = obtenerBaseDeDatos()
  const folio = datos.folio.trim()
  if (!folio) throw new Error('El folio no puede estar vacío.')
  if (db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio)) {
    throw new Error(`El folio "${folio}" ya pertenece a un evento guardado en el sistema.`)
  }

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

export function eliminarFolioCatalogo(id: number, origen: OrigenFolio): void {
  if (origen === 'evento') {
    eliminarEventoGuardado(id)
    return
  }
  if (origen !== 'catalogo') {
    throw new Error('El origen del folio no es válido.')
  }
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('El identificador del folio no es válido.')
  }

  const resultado = obtenerBaseDeDatos().prepare('DELETE FROM folio_catalogo WHERE id = ?').run(id)
  if (resultado.changes === 0) throw new Error(`No existe un folio en el catálogo con id ${id}.`)
}

function eliminarEventoGuardado(eventoId: number): void {
  if (!Number.isInteger(eventoId) || eventoId < 1) {
    throw new Error('El identificador del evento no es válido.')
  }

  const db = obtenerBaseDeDatos()
  const transaccion = db.transaction(() => {
    const evento = db.prepare('SELECT id FROM evento WHERE id = ?').get(eventoId)
    if (!evento) throw new Error(`No existe un evento con id ${eventoId}.`)

    db.prepare(
      `DELETE FROM constancia_participante
       WHERE constancia_id IN (SELECT id FROM constancia WHERE evento_id = ?)`,
    ).run(eventoId)
    db.prepare('DELETE FROM constancia WHERE evento_id = ?').run(eventoId)
    db.prepare('DELETE FROM evento WHERE id = ?').run(eventoId)
  })
  transaccion()
}

/**
 * Corrige el folio de un evento ya guardado. Cambia `evento.folio` y también
 * el prefijo de `constancia.folio_interno` de todas sus constancias
 * (formato "{folio}-{consecutivo}"), todo en una transacción: si algo falla
 * no queda un evento con folio nuevo y constancias con el folio viejo.
 * Los PDF ya generados no se modifican; hay que volver a generarlos.
 */
export function actualizarFolioDeEvento(eventoId: number, folioNuevo: string): FolioCatalogoEntry {
  const db = obtenerBaseDeDatos()
  const folio = folioNuevo.trim()
  if (!folio) throw new Error('El folio no puede estar vacío.')

  const transaccion = db.transaction(() => {
    const evento = db.prepare('SELECT id, folio FROM evento WHERE id = ?').get(eventoId) as
      | { id: number; folio: string }
      | undefined
    if (!evento) throw new Error(`No existe un evento con id ${eventoId}.`)

    if (folio !== evento.folio) {
      if (
        db.prepare('SELECT id FROM evento WHERE folio = ? AND id <> ?').get(folio, eventoId) ||
        db.prepare('SELECT id FROM folio_catalogo WHERE folio = ?').get(folio)
      ) {
        throw new Error(`Ya existe un folio registrado como "${folio}".`)
      }
      db.prepare('UPDATE evento SET folio = ? WHERE id = ?').run(folio, eventoId)
      db.prepare(
        `UPDATE constancia
         SET folio_interno = ? || substr(folio_interno, ?)
         WHERE evento_id = ? AND substr(folio_interno, 1, ?) = ?`,
      ).run(folio, evento.folio.length + 1, eventoId, evento.folio.length, evento.folio)
    }
  })
  transaccion()

  const entrada = listarFoliosCatalogo().find((item) => item.origen === 'evento' && item.id === eventoId)
  if (!entrada) throw new Error(`El folio del evento ${eventoId} se actualizó pero no pudo recuperarse.`)
  return entrada
}

/**
 * Lista TODOS los folios del sistema: los capturados a mano en el catálogo y
 * los de los eventos ya guardados (los mismos que aparecen en "Reimprimir
 * lote guardado"). Si un folio está en ambos lados (p. ej. folios de QR
 * migrados al catálogo que coinciden con un evento), se muestra una sola vez
 * como folio de evento.
 */
export function listarFoliosCatalogo(): FolioCatalogoEntry[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare(
      `SELECT e.id AS id, e.folio AS folio, e.nombre_evento AS nombre_referencia,
              COALESCE((SELECT MIN(c.fecha_generacion) FROM constancia c WHERE c.evento_id = e.id),
                       e.fecha_constancia) AS fecha_registro,
              'evento' AS origen
         FROM evento e
       UNION ALL
       SELECT f.id, f.folio, f.nombre_referencia, f.fecha_registro, 'catalogo' AS origen
         FROM folio_catalogo f
        WHERE f.folio NOT IN (SELECT folio FROM evento)
       ORDER BY fecha_registro DESC, id DESC`,
    )
    .all() as FilaFolioListado[]
  return filas.map((fila) => mapearFila(fila, fila.origen))
}
