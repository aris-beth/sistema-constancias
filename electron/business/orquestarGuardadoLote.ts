import type { Modalidad } from '../../shared/types/evento'
import type { TipoDocumento } from '../../shared/types/constancia'
import {
  MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
  numeroMinimoParaReconocimiento,
} from './reglas/determinarTipoDocumento'

export interface FilaLoteResuelta {
  numeroFila: number
  nombreEvento: string
  fechaConstancia: string
  modalidad: Modalidad
  participaComo: string
  rolId: number
  nombrePonencia: string | null
  textoGenerado: string
  esPersonalizado: boolean
  universidadOrigen: string | null
  participantes: Array<{
    id: number
    nombreNormalizado: string
    conteoPrevio: number
  }>
}

export interface DatosEventoOrquestado {
  folio: string
  nombreEvento: string
  fechaConstancia: string
  modalidad: Modalidad
}

export interface ConstanciaOrquestada {
  evento: DatosEventoOrquestado
  rolId: number
  ponencia: string | null
  textoGenerado: string
  esPersonalizado: boolean
  universidadOrigen: string | null
  tipoDocumento: TipoDocumento
  numeroParaPersonaEvento: number
  participanteIds: number[]
}

export interface ResultadoOrquestacionLote {
  evento: DatosEventoOrquestado
  constancias: ConstanciaOrquestada[]
  filasOmitidas: number[]
}

/**
 * Convierte filas ya revisadas en decisiones de persistencia. No consulta
 * SQLite ni Electron: los IDs y conteos previos llegan preparados por la
 * capa de persistencia para que esta regla pueda probarse aisladamente.
 */
export function orquestarGuardadoLote(
  filas: FilaLoteResuelta[],
  folioEvento: string,
  maxConstanciasPorPersona: number = MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
): ResultadoOrquestacionLote {
  const folio = folioEvento.trim()
  if (!folio) throw new Error('El folio del evento es obligatorio.')
  if (filas.length === 0) throw new Error('No hay filas válidas para guardar.')

  const primeraFila = filas[0]
  const evento: DatosEventoOrquestado = {
    folio,
    nombreEvento: primeraFila.nombreEvento.trim(),
    fechaConstancia: primeraFila.fechaConstancia.trim(),
    modalidad: primeraFila.modalidad,
  }

  if (!evento.nombreEvento || !evento.fechaConstancia) {
    throw new Error('La primera fila válida no contiene los datos completos del evento.')
  }

  const constancias: ConstanciaOrquestada[] = filas.map((fila) => {
    if (fila.participantes.length === 0) {
      throw new Error(`La fila ${fila.numeroFila} no tiene participantes válidos.`)
    }

    const resultados = fila.participantes.map((participante) => {
      const numero = participante.conteoPrevio + 1
      return {
        tipoDocumento:
          numero >= numeroMinimoParaReconocimiento(maxConstanciasPorPersona)
            ? ('reconocimiento' as const)
            : ('constancia' as const),
        numero,
      }
    })

    return {
      evento,
      rolId: fila.rolId,
      ponencia: fila.nombrePonencia,
      textoGenerado: fila.textoGenerado,
      esPersonalizado: fila.esPersonalizado,
      universidadOrigen: fila.universidadOrigen,
      tipoDocumento: resultados.some((resultado) => resultado.tipoDocumento === 'reconocimiento')
        ? 'reconocimiento'
        : 'constancia',
      numeroParaPersonaEvento: Math.max(...resultados.map((resultado) => resultado.numero)),
      participanteIds: fila.participantes.map((participante) => participante.id),
    }
  })

  return { evento, constancias, filasOmitidas: [] }
}