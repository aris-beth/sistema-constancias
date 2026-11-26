import { obtenerBaseDeDatos } from '../connection'
import type { GuardarGraduacionResultado, FilaProcesadaGraduacion, ModoGuardado } from '../../../shared/types/ipc'
import { generarFolioAutomatico } from './folio.repository'
import { crearTanda } from './tanda.repository'
import { formatearNombreGraduacion } from '../../business/formatearNombreGraduacion'

export function guardarLoteGraduacion(
  folioSolicitado: string | null,
  filas: FilaProcesadaGraduacion[],
  modo: ModoGuardado = 'reemplazar',
): GuardarGraduacionResultado {
  const validas = filas.filter((fila) => fila.error === null)
  if (validas.length === 0) throw new Error('No hay filas válidas de graduación para guardar.')
  for (const fila of validas) {
    if (!fila.nombreNormalizado?.trim()) throw new Error(`La fila ${fila.numeroFila} requiere un nombre normalizado.`)
    if (!fila.textoGenerado?.trim()) throw new Error(`La fila ${fila.numeroFila} no tiene texto generado.`)
  }

  const primera = validas[0]
  const carreraEvento = validas.find((fila) => fila.carrera.trim())?.carrera ?? ''
  const nombreEvento = `Reconocimientos de graduación ${primera.generacion}`
  const db = obtenerBaseDeDatos()
  const folio = folioSolicitado?.trim() || generarFolioAutomatico(nombreEvento, primera.fecha)

  const transaccion = db.transaction(() => {
    const eventoExistente = db
      .prepare('SELECT id, tipo_plantilla, nombre_evento, fecha_constancia, generacion, carrera FROM evento WHERE folio = ?')
      .get(folio) as {
        id: number
        tipo_plantilla: string
        nombre_evento: string
        fecha_constancia: string
        generacion: string | null
        carrera: string | null
      } | undefined
    let eventoId: number

    if (eventoExistente) {
      if (eventoExistente.tipo_plantilla !== 'graduacion') {
        throw new Error(`El folio "${folio}" pertenece a un evento regular.`)
      }
      if (modo === 'nuevo') {
        throw new Error(`Ya existe un evento con el folio "${folio}". Selecciónalo para agregar un lote de constancias o reemplazarlo.`)
      }
      eventoId = eventoExistente.id
      if (modo === 'agregar') {
        if (
          eventoExistente.fecha_constancia !== primera.fecha ||
          eventoExistente.generacion !== primera.generacion
        ) {
          throw new Error('Los datos generales de este lote de constancias no coinciden con el evento seleccionado. Verifica la fecha y generación.')
        }
        if (!eventoExistente.carrera && carreraEvento) {
          db.prepare('UPDATE evento SET carrera = ? WHERE id = ?').run(carreraEvento, eventoId)
        }
      } else {
        db.prepare(
          `UPDATE evento
           SET nombre_evento = ?, fecha_constancia = ?, modalidad = 'Otro',
               generacion = ?, carrera = ?
           WHERE id = ?`,
        ).run(nombreEvento, primera.fecha, primera.generacion, carreraEvento, eventoId)
        db.prepare(
          `DELETE FROM constancia_participante
           WHERE constancia_id IN (SELECT id FROM constancia WHERE evento_id = ?)`,
        ).run(eventoId)
        db.prepare('DELETE FROM constancia WHERE evento_id = ?').run(eventoId)
        db.prepare('DELETE FROM tanda_importacion WHERE evento_id = ?').run(eventoId)
      }
    } else {
      if (modo === 'agregar') {
        throw new Error(`No se encontró el evento "${folio}" para agregar el lote de constancias.`)
      }
      const evento = db.prepare(
        `INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla, generacion, carrera)
         VALUES (?, ?, ?, 'Otro', 'graduacion', ?, ?)`,
      ).run(folio, nombreEvento, primera.fecha, primera.generacion, carreraEvento)
      eventoId = Number(evento.lastInsertRowid)
    }

    const tanda = crearTanda(db, eventoId, folio, validas)
    const roles = new Map<string, number>()
    const obtenerRol = db.prepare('SELECT id FROM rol WHERE nombre_rol = ?')
    const insertarRol = db.prepare('INSERT INTO rol (nombre_rol, plantilla_texto) VALUES (?, ?)')
    const obtenerParticipante = db.prepare('SELECT id FROM participante WHERE nombre_normalizado = ?')
    const insertarParticipante = db.prepare(
      `INSERT INTO participante (nombre_original, nombre_normalizado, grado_academico, categoria, universidad_origen)
       VALUES (?, ?, NULL, NULL, NULL)`,
    )
    const insertarConstancia = db.prepare(
      `INSERT INTO constancia (evento_id, rol_id, ponencia, texto_generado, es_personalizado,
       tipo_documento, numero_para_persona_evento, fecha_generacion, folio_interno, estado, nombre_impreso, tanda_id)
       VALUES (?, ?, NULL, ?, 0, 'reconocimiento', 1, ?, ?, 'generada', ?, ?)`,
    )
    const insertarRelacion = db.prepare(
      'INSERT INTO constancia_participante (constancia_id, participante_id) VALUES (?, ?)',
    )
    const foliosInternos: string[] = []

    validas.forEach((fila) => {
      const rolNombre = `Graduación - ${fila.subtipo.trim()}`
      let rolId = roles.get(rolNombre)
      if (!rolId) {
        const existente = obtenerRol.get(rolNombre) as { id: number } | undefined
        rolId = existente?.id ?? Number(insertarRol.run(rolNombre, fila.textoGenerado).lastInsertRowid)
        roles.set(rolNombre, rolId)
      }
      const nombreOriginal = fila.nombreOriginal.trim()
      const participanteExistente = obtenerParticipante.get(fila.nombreNormalizado) as { id: number } | undefined
      const participanteId = participanteExistente?.id ?? Number(
        insertarParticipante.run(nombreOriginal, fila.nombreNormalizado).lastInsertRowid,
      )
      const folioInterno = `${folio}-${String(tanda.siguienteFolioInterno + foliosInternos.length).padStart(4, '0')}`
      const constancia = insertarConstancia.run(
        eventoId,
        rolId,
        fila.textoGenerado,
        new Date().toISOString(),
        folioInterno,
        formatearNombreGraduacion(nombreOriginal),
        tanda.id,
      )
      insertarRelacion.run(Number(constancia.lastInsertRowid), participanteId)
      foliosInternos.push(folioInterno)
    })

    return {
      folioEvento: folio,
      nombreEvento,
      reconocimientosCreados: validas.length,
      foliosInternos,
      tandaId: tanda.id,
      numeroTanda: tanda.numero,
    }
  })
  return transaccion()
}
