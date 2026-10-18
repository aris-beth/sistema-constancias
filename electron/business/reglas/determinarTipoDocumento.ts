import type { TipoDocumento } from '../../../shared/types/constancia'

/**
 * Máximo de constancias que una misma persona puede recibir dentro del
 * mismo evento (sumando todos sus roles). La siguiente se emite como
 * "RECONOCIMIENTO" (sección 5.3 de requerimientos, criterio de aceptación
 * #4). El valor vigente es editable desde el Editor de plantillas
 * (`configuracion_reglas`); este es el valor de fábrica: 6 constancias y la
 * 7ª ya es reconocimiento.
 */
export const MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO = 6

/** Tope razonable para el campo editable: evita capturar un valor absurdo por error. */
export const MAX_CONSTANCIAS_POR_PERSONA_LIMITE = 99

/** Número de constancia (1ª, 2ª, ...) a partir del cual el documento es reconocimiento. */
export function numeroMinimoParaReconocimiento(maxConstanciasPorPersona: number): number {
  return maxConstanciasPorPersona + 1
}

export interface ResultadoTipoDocumento {
  tipoDocumento: TipoDocumento
  /** Qué lugar ocupa esta constancia entre todas las que le corresponden a
   * esa persona en ese evento (1ª, 2ª, ... 7ª). Se guarda tal cual en
   * `constancia.numero_para_persona_evento`. */
  numeroParaPersonaEvento: number
}

/**
 * Contador de reconocimientos (sección 5.3 de requerimientos). Es una
 * función pura: NO consulta la base de datos ella misma — recibe ya
 * calculado cuántas constancias 'generada' tiene la persona en ese evento
 * hasta este momento (ver
 * `contarConstanciasDeParticipanteEnEvento` en el repositorio de
 * constancias). Esta separación es la que permite que, dentro de un
 * mismo lote de Excel, la fila 8 de una persona ya "vea" que las filas 1
 * a 7 de esa misma persona ya se procesaron, sin tener que esperar a que
 * termine el renderizado de PDFs de todo el lote (ver el comentario sobre
 * `estado` en shared/types/constancia.ts).
 *
 * IMPORTANTE: esta función es solo para el flujo de constancias
 * REGULARES. Los Reconocimientos de graduación (sección 6.5) son un tipo
 * de documento aparte que siempre se llama "Reconocimiento",
 * independientemente de cualquier conteo — no se les debe llamar.
 *
 * @param conteoActualDeConstanciasGeneradas cuántas constancias 'generada'
 *   tiene ya esa persona en ese evento, ANTES de la que se está por crear.
 * @param maxConstanciasPorPersona máximo configurado de constancias por
 *   persona en un evento; la siguiente ya es reconocimiento.
 */
export function determinarTipoDocumento(
  conteoActualDeConstanciasGeneradas: number,
  maxConstanciasPorPersona: number = MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
): ResultadoTipoDocumento {
  if (!Number.isInteger(conteoActualDeConstanciasGeneradas)) {
    throw new Error('El conteo de constancias previas debe ser un número entero.')
  }
  if (conteoActualDeConstanciasGeneradas < 0) {
    throw new Error('El conteo de constancias previas no puede ser negativo.')
  }

  if (!Number.isInteger(maxConstanciasPorPersona) || maxConstanciasPorPersona < 1) {
    throw new Error('El máximo de constancias por persona debe ser un entero mayor o igual a 1.')
  }

  const numeroParaPersonaEvento = conteoActualDeConstanciasGeneradas + 1
  const tipoDocumento: TipoDocumento =
    numeroParaPersonaEvento >= numeroMinimoParaReconocimiento(maxConstanciasPorPersona)
      ? 'reconocimiento'
      : 'constancia'

  return { tipoDocumento, numeroParaPersonaEvento }
}
