import {
  formatearFechaConstancia,
  validarFilaExcel,
} from './validacion/validarFilaExcel'
import { normalizarNombre } from './normalizarNombre'
import { separarParticipantes } from './separarParticipantes'
import { generarTextoConstancia } from './reglasRedaccion/generarTextoConstancia'
import type { Modalidad } from '../../shared/types/evento'
import type { NivelConfianza } from '../../shared/types/normalizacion'
import type { FilaExcelCruda } from '../../shared/types/excel'

export interface ParticipanteDeFilaProcesada {
  nombreOriginal: string
  nombreNormalizado: string
  gradoDetectado: string | null
  confianza: NivelConfianza
}

/**
 * El resultado de procesar UNA fila del Excel regular. Representa UNA
 * constancia (nunca más de una, ni menos), con uno o varios participantes
 * asociados a ella.
 */
export interface FilaExcelProcesada {
  numeroFila: number
  /**
   * Motor de agrupación de filas (sección 4 de requerimientos, criterio de
   * aceptación #3): normalmente trae un solo participante, pero trae más
   * de uno cuando la celda de nombre venía con varias personas separadas
   * por comas ("constancia grupal" — un premio o ponencia en equipo). El
   * resto de los campos de esta fila (rol, evento, ponencia, texto
   * generado...) son compartidos por todo el grupo: en el Excel de
   * entrada representan una sola constancia, no una por persona.
   */
  participantes: ParticipanteDeFilaProcesada[]
  participaComo: string
  nombrePonencia: string | null
  nombreEvento: string
  fechaConstancia: string
  universidadOrigen: string | null
  modalidad: string
  textoPersonalizado: string | null
  categoria: string | null
  textoGenerado: string | null
  esPersonalizado: boolean
  universidadExterna: string | null
  /** Si algo en esta fila falló (validación, normalización o redacción),
   * el mensaje queda aquí y `participantes` queda vacío — la fila se
   * reporta como pendiente y el resto del lote sigue su curso (criterio
   * de aceptación #8), sin que esta fila llegue nunca a crear un registro
   * en la base de datos. */
  error: string | null
}

/**
 * Procesa una fila cruda del Excel REGULAR: valida sus datos, separa la
 * celda de nombre en uno o más participantes (motor de agrupación),
 * normaliza el nombre de cada uno por separado, y genera el texto de la
 * constancia (compartido por todo el grupo, ya que aplica una sola vez
 * por fila). Es una función pura — no toca la base de datos ni Electron —
 * para que sea fácil de probar con Vitest.
 *
 * Un error en cualquier paso (validación, normalización de algún
 * participante, o redacción) se captura y se reporta en el campo `error`
 * de la fila en vez de propagarse: así una fila problemática no detiene
 * el resto del lote (criterio de aceptación #8).
 */
export function procesarFilaExcel(
  filaCruda: FilaExcelCruda,
  catalogoAbreviaturas: Map<string, string>,
  rolesReconocidos: Iterable<string>,
): FilaExcelProcesada {
  const base = {
    numeroFila: filaCruda.numeroFila,
    participaComo: filaCruda.participaComo,
    nombrePonencia: filaCruda.nombrePonencia,
    nombreEvento: filaCruda.nombreEvento,
    fechaConstancia: formatearFechaConstancia(filaCruda.fechaConstancia),
    universidadOrigen: filaCruda.universidadOrigen,
    modalidad: filaCruda.modalidad,
    textoPersonalizado: filaCruda.textoPersonalizado,
    categoria: filaCruda.categoria,
  }

  try {
    const resultadoValidacion = validarFilaExcel(filaCruda, rolesReconocidos)
    if (!resultadoValidacion.valida) {
      throw new Error(resultadoValidacion.errores.join(' '))
    }

    const nombresIndividuales = separarParticipantes(filaCruda.nombreCompleto)
    if (nombresIndividuales.length === 0) {
      throw new Error(`Fila ${filaCruda.numeroFila}: la columna de nombre no contiene ningún valor.`)
    }

    // Cada persona del grupo se normaliza por separado (no como un solo
    // texto largo con comas), porque más adelante cada una necesita ser
    // su propia fila en la tabla `participante` — el conteo de la 7ª
    // constancia (sección 5.3) es por persona, así que dos integrantes
    // del mismo equipo pueden estar en puntos distintos de su propio
    // conteo aunque compartan esta constancia grupal.
    const participantes: ParticipanteDeFilaProcesada[] = nombresIndividuales.map(
      (nombreOriginal) => {
        const normalizado = normalizarNombre(nombreOriginal, catalogoAbreviaturas)
        return {
          nombreOriginal,
          nombreNormalizado: normalizado.nombreNormalizado,
          gradoDetectado: normalizado.gradoDetectado,
          confianza: normalizado.confianza,
        }
      },
    )

    const texto = generarTextoConstancia({
      participaComo: filaCruda.participaComo,
      nombreEvento: filaCruda.nombreEvento,
      modalidad: filaCruda.modalidad as Modalidad,
      nombrePonencia: filaCruda.nombrePonencia,
      textoPersonalizado: filaCruda.textoPersonalizado,
      universidadOrigen: filaCruda.universidadOrigen,
    })

    return {
      ...base,
      participantes,
      textoGenerado: texto.textoGenerado,
      esPersonalizado: texto.esPersonalizado,
      universidadExterna: texto.universidadExterna,
      error: null,
    }
  } catch (error) {
    return {
      ...base,
      participantes: [],
      textoGenerado: null,
      esPersonalizado: false,
      universidadExterna: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
