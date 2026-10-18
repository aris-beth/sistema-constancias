import { separarParticipantes } from './separarParticipantes'
import {
  MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
  numeroMinimoParaReconocimiento,
} from './reglas/determinarTipoDocumento'

export type EncabezadoDocumento = 'CONSTANCIA' | 'RECONOCIMIENTO'

interface FilaParaConteo {
  numeroFila: number
  nombreNormalizado: string | null
  error: string | null
}

/**
 * Decide el encabezado de cada fila del lote con la misma regla que usa
 * `orquestarGuardadoLote` al guardar (sección 5.3 de requerimientos): el
 * documento pasa a "RECONOCIMIENTO" cuando alguna de las personas de la fila
 * supera el máximo de constancias por persona configurado (por defecto, la
 * 7ª constancia). Las filas con error no cuentan.
 * Se usa en la previsualización, que ocurre antes de guardar en la base.
 */
export function calcularEncabezadosPorFila(
  filas: FilaParaConteo[],
  maxConstanciasPorPersona: number = MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
): Map<number, EncabezadoDocumento> {
  const minimoParaReconocimiento = numeroMinimoParaReconocimiento(maxConstanciasPorPersona)
  const conteos = new Map<string, number>()
  const resultado = new Map<number, EncabezadoDocumento>()

  for (const fila of filas) {
    if (fila.error || !fila.nombreNormalizado) continue
    const nombres = separarParticipantes(fila.nombreNormalizado)
    const numeros = nombres.map((nombre) => (conteos.get(nombre) ?? 0) + 1)
    resultado.set(fila.numeroFila, Math.max(0, ...numeros) >= minimoParaReconocimiento ? 'RECONOCIMIENTO' : 'CONSTANCIA')
    nombres.forEach((nombre, indice) => conteos.set(nombre, numeros[indice]))
  }
  return resultado
}
