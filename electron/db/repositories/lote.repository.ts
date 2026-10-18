import { obtenerBaseDeDatos } from '../connection'
import { orquestarGuardadoLote, type FilaLoteResuelta } from '../../business/orquestarGuardadoLote'
import { separarParticipantes } from '../../business/separarParticipantes'
import { normalizarCategoria, normalizarModalidad } from '../../business/validacion/validarFilaExcel'
import { generarFolioAutomatico } from './folio.repository'
import { obtenerConfiguracionReglas } from './configuracionReglas.repository'
import { articuloEventoPersistido } from '../../business/reglasRedaccion/articuloEvento'
import type { GuardarLoteResultado, FilaProcesada } from '../../../shared/types/ipc'

function normalizarClave(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
}

function validarFilaGuardable(fila: FilaProcesada): asserts fila is FilaProcesada & {
  nombreNormalizado: string
  textoGenerado: string
} {
  if (fila.error) throw new Error(`La fila ${fila.numeroFila} no está lista: ${fila.error}`)
  if (!fila.nombreNormalizado?.trim()) {
    throw new Error(`La fila ${fila.numeroFila} requiere un nombre normalizado.`)
  }
  if (!fila.textoGenerado?.trim()) {
    throw new Error(`La fila ${fila.numeroFila} no tiene texto generado.`)
  }
}

export function guardarLoteRegular(
  folioEvento: string | null,
  filas: FilaProcesada[],
): GuardarLoteResultado {
  // Si no se indica folio, se genera automáticamente al guardar.
  const folioSolicitado = folioEvento?.trim() || null

  const filasValidas = filas.filter((fila) => fila.error === null)
  if (filasValidas.length === 0) throw new Error('No hay filas válidas para guardar.')
  const filasGuardables = filasValidas.map((fila) => {
    validarFilaGuardable(fila)
    return fila
  })

  const db = obtenerBaseDeDatos()

  const transaccion = db.transaction(() => {
    const primera = filasGuardables[0]
    const folio =
      folioSolicitado ??
      generarFolioAutomatico(primera.nombreEvento.trim(), primera.fechaConstancia.trim())
    const { articuloEvento, formaArticuloEvento } = articuloEventoPersistido(primera.articuloEvento)
    const eventoExistente = db
      .prepare('SELECT id, tipo_plantilla FROM evento WHERE folio = ?')
      .get(folio) as { id: number; tipo_plantilla: string } | undefined
    let eventoId: number

    if (eventoExistente) {
      if (eventoExistente.tipo_plantilla !== 'regular') {
        throw new Error(`El folio "${folio}" pertenece a un evento de graduación.`)
      }
      eventoId = eventoExistente.id
      db.prepare(
        `UPDATE evento
         SET nombre_evento = ?, fecha_constancia = ?, modalidad = ?,
             articulo_evento = ?, forma_articulo_evento = ?
         WHERE id = ?`,
      ).run(
        primera.nombreEvento.trim(),
        primera.fechaConstancia.trim(),
        normalizarModalidad(primera.modalidad),
        articuloEvento,
        formaArticuloEvento,
        eventoId,
      )
      db.prepare(
        `DELETE FROM constancia_participante
         WHERE constancia_id IN (SELECT id FROM constancia WHERE evento_id = ?)`,
      ).run(eventoId)
      db.prepare('DELETE FROM constancia WHERE evento_id = ?').run(eventoId)
    } else {
      const eventoResultado = db
        .prepare(
          `INSERT INTO evento (
             folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla,
             generacion, carrera, articulo_evento, forma_articulo_evento
           )
           VALUES (?, ?, ?, ?, 'regular', NULL, NULL, ?, ?)`,
        )
        .run(
          folio,
          primera.nombreEvento.trim(),
          primera.fechaConstancia.trim(),
          normalizarModalidad(primera.modalidad),
          articuloEvento,
          formaArticuloEvento,
        )
      eventoId = Number(eventoResultado.lastInsertRowid)
    }

    const roles = new Map<string, number>()
    const buscarRol = db.prepare('SELECT id, nombre_rol FROM rol')
    for (const rol of buscarRol.all() as Array<{ id: number; nombre_rol: string }>) {
      roles.set(normalizarClave(rol.nombre_rol), rol.id)
    }

    const insertarRol = db.prepare(
      'INSERT INTO rol (nombre_rol, plantilla_texto) VALUES (?, ?)',
    )
    const participantes = db.prepare('SELECT * FROM participante WHERE nombre_normalizado = ?')
    const insertarParticipante = db.prepare(
      `INSERT INTO participante (nombre_original, nombre_normalizado, grado_academico, categoria, universidad_origen)
       VALUES (?, ?, ?, ?, ?)`,
    )
    const contar = db.prepare(
      `SELECT COUNT(*) AS total FROM constancia c
       JOIN constancia_participante cp ON cp.constancia_id = c.id
       WHERE cp.participante_id = ? AND c.evento_id = ? AND c.estado = 'generada'`,
    )

    const conteosEnLote = new Map<number, number>()
    const filasResueltas: FilaLoteResuelta[] = []

    for (const fila of filasGuardables) {
      let rolId = roles.get(normalizarClave(fila.participaComo))
      if (!rolId) {
        const plantillaTexto = fila.esPersonalizado ? '' : fila.textoGenerado
        const rol = insertarRol.run(fila.participaComo.trim(), plantillaTexto)
        rolId = Number(rol.lastInsertRowid)
        roles.set(normalizarClave(fila.participaComo), rolId)
      }

      const nombresOriginales = separarParticipantes(fila.nombreOriginal)
      const nombresNormalizados = separarParticipantes(fila.nombreNormalizado)
      const categoria = normalizarCategoria(fila.categoria)
      if (nombresOriginales.length !== nombresNormalizados.length) {
        throw new Error(`La fila ${fila.numeroFila} tiene grupos de nombres inconsistentes.`)
      }

      const participantesFila = nombresNormalizados.map((nombreNormalizado, indice) => {
        const encontrado = participantes.get(nombreNormalizado) as { id: number } | undefined
        const id = encontrado
          ? encontrado.id
          : Number(
              insertarParticipante.run(
                nombresOriginales[indice],
                nombreNormalizado,
                fila.gradoDetectado,
                categoria,
                fila.universidadOrigen,
              ).lastInsertRowid,
            )
        const totalEnBase = (contar.get(id, eventoId) as { total: number }).total
        const conteoPrevio = Math.max(totalEnBase, conteosEnLote.get(id) ?? 0)
        return { id, nombreNormalizado, conteoPrevio }
      })

      filasResueltas.push({
        numeroFila: fila.numeroFila,
        nombreEvento: fila.nombreEvento,
        fechaConstancia: fila.fechaConstancia,
        modalidad: normalizarModalidad(fila.modalidad),
        participaComo: fila.participaComo,
        rolId,
        nombrePonencia: fila.nombrePonencia,
        textoGenerado: fila.textoGenerado,
        esPersonalizado: fila.esPersonalizado,
        universidadOrigen: fila.universidadOrigen?.trim() || null,
        participantes: participantesFila,
      })
      for (const participante of participantesFila) {
        conteosEnLote.set(participante.id, participante.conteoPrevio + 1)
      }
    }

    const decisiones = orquestarGuardadoLote(
      filasResueltas,
      folio,
      obtenerConfiguracionReglas().maxConstanciasPorPersona,
    )
    const insertarConstancia = db.prepare(
      `INSERT INTO constancia (evento_id, rol_id, ponencia, texto_generado, es_personalizado,
       tipo_documento, numero_para_persona_evento, universidad_origen, fecha_generacion, folio_interno, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generada')`,
    )
    const insertarRelacion = db.prepare(
      'INSERT INTO constancia_participante (constancia_id, participante_id) VALUES (?, ?)',
    )
    const foliosInternos: string[] = []
    let reconocimientosCreados = 0
    for (const [indice, constancia] of decisiones.constancias.entries()) {
      const folioInterno = `${folio}-${String(indice + 1).padStart(4, '0')}`
      const resultado = insertarConstancia.run(
        eventoId,
        constancia.rolId,
        constancia.ponencia,
        constancia.textoGenerado,
        constancia.esPersonalizado ? 1 : 0,
        constancia.tipoDocumento,
        constancia.numeroParaPersonaEvento,
        constancia.universidadOrigen,
        new Date().toISOString(),
        folioInterno,
      )
      for (const participanteId of constancia.participanteIds) {
        insertarRelacion.run(Number(resultado.lastInsertRowid), participanteId)
      }
      foliosInternos.push(folioInterno)
      if (constancia.tipoDocumento === 'reconocimiento') reconocimientosCreados += 1
    }

    return {
      folioEvento: folio,
      nombreEvento: primera.nombreEvento,
      constanciasCreadas: decisiones.constancias.length,
      reconocimientosCreados,
      constanciasPendientes: filas.length - filasValidas.length,
      foliosInternos,
    }
  })

  return transaccion()
}