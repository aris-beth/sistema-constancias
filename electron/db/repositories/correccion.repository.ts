import { obtenerBaseDeDatos } from '../connection'
import { formatearNombreGraduacion } from '../../business/formatearNombreGraduacion'
import type { TipoPlantilla } from '../../../shared/types/evento'
import type {
  ConstanciaCorreccion,
  GuardarCorreccionConstanciaEntrada,
} from '../../../shared/types/ipc'

interface FilaCorreccion {
  id: number
  folio_interno: string
  nombre_rol: string
  tipo_documento: 'constancia' | 'reconocimiento'
  nombre_impreso: string | null
  nombre_participante: string | null
  tipo_plantilla: TipoPlantilla
  texto_generado: string
  ponencia: string | null
  universidad_origen: string | null
  fecha_constancia: string
}

function agruparFilas(filas: FilaCorreccion[]): ConstanciaCorreccion[] {
  const documentos = new Map<number, ConstanciaCorreccion>()
  for (const fila of filas) {
    if (!fila.nombre_participante) {
      throw new Error(`La constancia ${fila.folio_interno} no tiene una persona asociada.`)
    }
    const nombreParticipante = fila.tipo_plantilla === 'graduacion'
      ? formatearNombreGraduacion(fila.nombre_participante)
      : fila.nombre_participante
    const documento = documentos.get(fila.id)
    if (documento) {
      if (!fila.nombre_impreso) documento.nombre += `, ${nombreParticipante}`
      continue
    }
    documentos.set(fila.id, {
      id: fila.id,
      folioInterno: fila.folio_interno,
      rol: fila.nombre_rol,
      tipoDocumento: fila.tipo_documento,
      tipoPlantilla: fila.tipo_plantilla,
      nombre: fila.nombre_impreso ?? nombreParticipante,
      textoGenerado: fila.texto_generado,
      ponencia: fila.ponencia,
      universidadOrigen: fila.universidad_origen,
      fechaConstancia: fila.fecha_constancia,
    })
  }
  return [...documentos.values()]
}

function consultarCorrecciones(eventoId: number): ConstanciaCorreccion[] {
  const filas = obtenerBaseDeDatos()
    .prepare(
      `SELECT c.id, c.folio_interno, r.nombre_rol, c.tipo_documento, c.nombre_impreso,
         c.texto_generado, c.ponencia, c.universidad_origen, e.fecha_constancia,
         e.tipo_plantilla,
         CASE WHEN e.tipo_plantilla = 'graduacion'
           THEN p.nombre_original ELSE p.nombre_normalizado
         END AS nombre_participante
       FROM constancia c
       JOIN evento e ON e.id = c.evento_id
       JOIN rol r ON r.id = c.rol_id
       LEFT JOIN constancia_participante cp ON cp.constancia_id = c.id
       LEFT JOIN participante p ON p.id = cp.participante_id
       WHERE c.evento_id = ? AND c.estado = 'generada'
       ORDER BY c.id, p.id`,
    )
    .all(eventoId) as FilaCorreccion[]
  return agruparFilas(filas)
}

export function listarConstanciasParaCorreccion(folioEvento: string): ConstanciaCorreccion[] {
  if (typeof folioEvento !== 'string') throw new Error('El folio del evento debe ser texto.')
  const folio = folioEvento.trim()
  if (!folio) throw new Error('El folio del evento es obligatorio.')
  const evento = obtenerBaseDeDatos()
    .prepare('SELECT id FROM evento WHERE folio = ?')
    .get(folio) as { id: number } | undefined
  if (!evento) throw new Error(`No se encontró un evento con el folio "${folio}".`)
  return consultarCorrecciones(evento.id)
}

export function guardarCorreccionConstancia(
  entrada: GuardarCorreccionConstanciaEntrada,
): ConstanciaCorreccion {
  if (
    !entrada ||
    typeof entrada.folioEvento !== 'string' ||
    typeof entrada.nombre !== 'string' ||
    typeof entrada.textoGenerado !== 'string'
  ) {
    throw new Error('Los datos de la corrección no son válidos.')
  }
  const folio = entrada.folioEvento.trim()
  const nombre = entrada.nombre.trim()
  const texto = entrada.textoGenerado.trim()
  if (!folio) throw new Error('El folio del evento es obligatorio.')
  if (!Number.isInteger(entrada.constanciaId) || entrada.constanciaId < 1) {
    throw new Error('El identificador de constancia no es válido.')
  }
  if (!nombre) throw new Error('El nombre impreso no puede estar vacío.')
  if (!texto) throw new Error('El texto de la constancia no puede estar vacío.')

  const db = obtenerBaseDeDatos()
  const transaccion = db.transaction(() => {
    const actual = db
      .prepare(
        `SELECT c.texto_generado, c.nombre_impreso
        FROM constancia c
         JOIN evento e ON e.id = c.evento_id
         WHERE c.id = ? AND e.folio = ? AND c.estado = 'generada'`,
      )
      .get(entrada.constanciaId, folio) as
      | {
          texto_generado: string
          nombre_impreso: string | null
        }
      | undefined
    if (!actual) {
      throw new Error(`No existe una constancia generada con id ${entrada.constanciaId} en el evento "${folio}".`)
    }

    const nombres = db
      .prepare(
        `SELECT CASE WHEN e.tipo_plantilla = 'graduacion'
           THEN p.nombre_original ELSE p.nombre_normalizado
         END AS nombre_participante, e.tipo_plantilla
         FROM constancia_participante cp
         JOIN participante p ON p.id = cp.participante_id
         JOIN constancia c ON c.id = cp.constancia_id
         JOIN evento e ON e.id = c.evento_id
         WHERE cp.constancia_id = ?
         ORDER BY p.id`,
      )
      .all(entrada.constanciaId) as Array<{
        nombre_participante: string | null
        tipo_plantilla: string
      }>
    const nombreAnterior = actual.nombre_impreso ?? nombres
      .map((fila) => {
        if (!fila.nombre_participante) return ''
        return fila.tipo_plantilla === 'graduacion'
          ? formatearNombreGraduacion(fila.nombre_participante)
          : fila.nombre_participante
      })
      .join(', ')
    if (!nombreAnterior) throw new Error('La constancia no tiene un nombre de participante asociado.')

    if (nombreAnterior !== nombre || actual.texto_generado !== texto) {
      db.prepare(
        `INSERT INTO constancia_correccion (
           constancia_id, nombre_anterior, nombre_nuevo, texto_anterior, texto_nuevo, fecha_correccion
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        entrada.constanciaId,
        nombreAnterior,
        nombre,
        actual.texto_generado,
        texto,
        new Date().toISOString(),
      )
      db.prepare(
        `UPDATE constancia
         SET nombre_impreso = ?, texto_generado = ?, es_personalizado = 1
         WHERE id = ?`,
      ).run(nombre, texto, entrada.constanciaId)
    }
  })
  transaccion()

  const evento = db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio) as
    | { id: number }
    | undefined
  if (!evento) throw new Error(`No se encontró un evento con el folio "${folio}" después de guardar.`)
  const actualizada = consultarCorrecciones(evento.id).find((documento) => documento.id === entrada.constanciaId)
  if (!actualizada) throw new Error('La corrección se guardó pero no pudo recuperarse.')
  return actualizada
}

export function obtenerConstanciasParaPdfCorreccion(
  folioEvento: string,
  constanciaIds: number[],
): { eventoId: number; documentos: ConstanciaCorreccion[] } {
  if (typeof folioEvento !== 'string') throw new Error('El folio del evento debe ser texto.')
  const folio = folioEvento.trim()
  if (!folio) throw new Error('El folio del evento es obligatorio.')
  const ids = [...new Set(constanciaIds)]
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new Error('Selecciona al menos una constancia válida para generar.')
  }
  const db = obtenerBaseDeDatos()
  const evento = db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio) as
    | { id: number }
    | undefined
  if (!evento) throw new Error(`No se encontró un evento con el folio "${folio}".`)

  const disponibles = consultarCorrecciones(evento.id)
  const porId = new Map(disponibles.map((documento) => [documento.id, documento]))
  const documentos = ids.map((id) => {
    const documento = porId.get(id)
    if (!documento) {
      throw new Error(`La constancia ${id} no pertenece al evento "${folio}" o no está generada.`)
    }
    return documento
  })
  return { eventoId: evento.id, documentos }
}
