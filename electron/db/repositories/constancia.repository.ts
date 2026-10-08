import type Database from 'better-sqlite3'
import { obtenerBaseDeDatos } from '../connection'
import type {
  Constancia,
  ConstanciaConParticipantes,
  EstadoConstancia,
} from '../../../shared/types/constancia'
import type { Participante } from '../../../shared/types/participante'

interface FilaConstancia {
  id: number
  evento_id: number
  rol_id: number
  ponencia: string | null
  texto_generado: string
  es_personalizado: number // SQLite no tiene booleano real; usa 0/1
  tipo_documento: string
  numero_para_persona_evento: number
  universidad_origen: string | null
  fecha_generacion: string
  folio_interno: string
  estado: string
}

interface FilaParticipanteDeConstancia {
  id: number
  nombre_original: string
  nombre_normalizado: string
  grado_academico: string | null
  categoria: string | null
  universidad_origen: string | null
}

function mapearFila(fila: FilaConstancia): Constancia {
  return {
    id: fila.id,
    eventoId: fila.evento_id,
    rolId: fila.rol_id,
    ponencia: fila.ponencia,
    textoGenerado: fila.texto_generado,
    esPersonalizado: fila.es_personalizado === 1,
    tipoDocumento: fila.tipo_documento as Constancia['tipoDocumento'],
    numeroParaPersonaEvento: fila.numero_para_persona_evento,
    universidadOrigen: fila.universidad_origen,
    fechaGeneracion: fila.fecha_generacion,
    folioInterno: fila.folio_interno,
    estado: fila.estado as EstadoConstancia,
  }
}

function mapearFilaParticipante(fila: FilaParticipanteDeConstancia): Participante {
  return {
    id: fila.id,
    nombreOriginal: fila.nombre_original,
    nombreNormalizado: fila.nombre_normalizado,
    gradoAcademico: fila.grado_academico,
    categoria: fila.categoria as Participante['categoria'],
    universidadOrigen: fila.universidad_origen,
  }
}

/**
 * Calcula el siguiente folio interno consecutivo para un evento, con el
 * formato "{folioEvento}-0001", "{folioEvento}-0002", ... — el identificador
 * único por documento que exige la sección 2.1 de requerimientos, distinto
 * del folio del evento. Se basa en cuántas constancias tiene ya el evento
 * en la base de datos, así que debe llamarse justo antes de insertar la
 * constancia correspondiente: la app es de un solo usuario local, sin
 * escrituras concurrentes, así que no hace falta un bloqueo adicional para
 * mantener la ventana entre el cálculo y el guardado libre de condiciones
 * de carrera.
 */
export function generarSiguienteFolioInterno(eventoId: number, folioEvento: string): string {
  if (!folioEvento.trim()) {
    throw new Error('No se puede generar un folio interno sin el folio del evento.')
  }

  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = ?')
    .get(eventoId) as { total: number }

  const siguienteNumero = fila.total + 1
  return `${folioEvento.trim()}-${String(siguienteNumero).padStart(4, '0')}`
}

/**
 * Crea una constancia Y la asocia con uno o varios participantes en una
 * sola operación atómica ("transacción"). Esto es importante para la
 * regla de filas con comas: si el Excel tiene "Juan Pérez, Ana López" para
 * la misma constancia grupal, necesitamos que se guarde el registro en
 * `constancia` Y sus dos filas en `constancia_participante` juntos — si
 * algo falla a la mitad, SQLite deshace todo (no queda una constancia
 * "huérfana" sin participantes, ni participantes apuntando a nada).
 */
export function crearConstanciaConParticipantes(datos: ConstanciaConParticipantes): Constancia {
  const db = obtenerBaseDeDatos()

  if (datos.participanteIds.length === 0) {
    throw new Error('No se puede crear una constancia sin al menos un participante asociado.')
  }
  if (!datos.constancia.folioInterno.trim()) {
    throw new Error('No se puede crear una constancia sin un folio interno asignado.')
  }

  const insertarConstancia = db.prepare(`
    INSERT INTO constancia (
      evento_id, rol_id, ponencia, texto_generado, es_personalizado,
      tipo_documento, numero_para_persona_evento, universidad_origen, fecha_generacion,
      folio_interno, estado
    ) VALUES (
      @eventoId, @rolId, @ponencia, @textoGenerado, @esPersonalizado,
      @tipoDocumento, @numeroParaPersonaEvento, @universidadOrigen, @fechaGeneracion,
      @folioInterno, @estado
    )
  `)

  const insertarRelacion = db.prepare(`
    INSERT INTO constancia_participante (constancia_id, participante_id)
    VALUES (?, ?)
  `)

  // db.transaction envuelve la función para que TODAS las instrucciones
  // dentro se apliquen juntas o ninguna se aplique. Se ejecuta llamando
  // a la función que retorna, no db.transaction(...) directamente.
  const ejecutarTransaccion = db.transaction((datosConstancia: ConstanciaConParticipantes) => {
    let resultado: Database.RunResult
    try {
      resultado = insertarConstancia.run({
        eventoId: datosConstancia.constancia.eventoId,
        rolId: datosConstancia.constancia.rolId,
        ponencia: datosConstancia.constancia.ponencia,
        textoGenerado: datosConstancia.constancia.textoGenerado,
        esPersonalizado: datosConstancia.constancia.esPersonalizado ? 1 : 0,
        tipoDocumento: datosConstancia.constancia.tipoDocumento,
        numeroParaPersonaEvento: datosConstancia.constancia.numeroParaPersonaEvento,
        universidadOrigen: datosConstancia.constancia.universidadOrigen,
        fechaGeneracion: datosConstancia.constancia.fechaGeneracion,
        folioInterno: datosConstancia.constancia.folioInterno,
        estado: datosConstancia.constancia.estado,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed: constancia.folio_interno')
      ) {
        throw new Error(
          `Ya existe una constancia registrada con el folio interno "${datosConstancia.constancia.folioInterno}".`,
        )
      }
      throw error
    }

    const constanciaId = Number(resultado.lastInsertRowid)

    for (const participanteId of datosConstancia.participanteIds) {
      insertarRelacion.run(constanciaId, participanteId)
    }

    return constanciaId
  })

  const constanciaId = ejecutarTransaccion(datos)

  const creada = obtenerConstanciaPorId(constanciaId)
  if (!creada) {
    throw new Error('La constancia se guardó pero no pudo recuperarse inmediatamente después.')
  }
  return creada
}

export function obtenerConstanciaPorId(id: number): Constancia | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM constancia WHERE id = ?').get(id) as
    | FilaConstancia
    | undefined
  return fila ? mapearFila(fila) : null
}

export function listarConstanciasPorEvento(eventoId: number): Constancia[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare('SELECT * FROM constancia WHERE evento_id = ? ORDER BY id')
    .all(eventoId) as FilaConstancia[]
  return filas.map(mapearFila)
}

/**
 * Igual que listarConstanciasPorEvento, pero filtrando por estado. La usa,
 * por ejemplo, el gestor de archivos (sección "Generación y organización de
 * salidas" del diseño) para saber qué constancias quedaron pendientes de
 * reintentar su PDF tras un fallo de escritura.
 */
export function listarConstanciasPorEventoYEstado(
  eventoId: number,
  estado: EstadoConstancia,
): Constancia[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare('SELECT * FROM constancia WHERE evento_id = ? AND estado = ? ORDER BY id')
    .all(eventoId, estado) as FilaConstancia[]
  return filas.map(mapearFila)
}

/**
 * Marca una constancia como 'generada' después de que su PDF se escribió
 * exitosamente. Solo hace falta llamarla cuando una constancia se hubiera
 * quedado en 'pendiente' por un fallo previo de escritura — el flujo
 * normal ya crea la constancia directamente como 'generada' (ver el
 * comentario sobre `estado` en shared/types/constancia.ts).
 */
export function marcarConstanciaComoGenerada(id: number): Constancia {
  const db = obtenerBaseDeDatos()
  const resultado = db.prepare("UPDATE constancia SET estado = 'generada' WHERE id = ?").run(id)
  if (resultado.changes === 0) {
    throw new Error(`No existe una constancia con id ${id} para marcar como generada.`)
  }
  const actualizada = obtenerConstanciaPorId(id)
  if (!actualizada) {
    throw new Error(`La constancia ${id} se actualizó pero no pudo recuperarse después.`)
  }
  return actualizada
}

/**
 * Devuelve los participantes asociados a una constancia (más de uno en el
 * caso de una constancia grupal — varias personas separadas por comas en
 * la misma celda del Excel, sección 4 de requerimientos).
 */
export function obtenerParticipantesDeConstancia(constanciaId: number): Participante[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare(
      `SELECT p.*
       FROM participante p
       JOIN constancia_participante cp ON cp.participante_id = p.id
       WHERE cp.constancia_id = ?
       ORDER BY p.id`,
    )
    .all(constanciaId) as FilaParticipanteDeConstancia[]
  return filas.map(mapearFilaParticipante)
}

/**
 * Cuenta cuántas constancias 'generada' tiene ya un participante dentro de
 * un evento, sumando todos los roles. El motor de reglas la usa para el
 * criterio de "a partir de la 7ª constancia de esa persona en ese evento,
 * el sistema sustituye automáticamente la palabra del encabezado" (sección
 * 5.3 de requerimientos). Filtrar por estado = 'generada' es lo que hace
 * que una fila omitida por error de validación —que nunca llega a crear un
 * registro aquí— no pueda de ninguna forma adelantar el conteo de otra
 * fila de la misma persona.
 */
export function contarConstanciasDeParticipanteEnEvento(
  participanteId: number,
  eventoId: number,
): number {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM constancia c
       JOIN constancia_participante cp ON cp.constancia_id = c.id
       WHERE cp.participante_id = ? AND c.evento_id = ? AND c.estado = 'generada'`,
    )
    .get(participanteId, eventoId) as { total: number }
  return fila.total
}
