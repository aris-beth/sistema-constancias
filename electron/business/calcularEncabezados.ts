import { separarParticipantes } from './separarParticipantes'

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
 * llega a su 7ª constancia dentro del evento. Las filas con error no cuentan.
 * Se usa en la previsualización, que ocurre antes de guardar en la base.
 */
export function calcularEncabezadosPorFila(
  filas: FilaParaConteo[],
): Map<number, EncabezadoDocumento> {
  const conteos = new Map<string, number>()
  const resultado = new Map<number, EncabezadoDocumento>()

  for (const fila of filas) {
    if (fila.error || !fila.nombreNormalizado) continue
    const nombres = separarParticipantes(fila.nombreNormalizado)
    const numeros = nombres.map((nombre) => (conteos.get(nombre) ?? 0) + 1)
    resultado.set(fila.numeroFila, Math.max(0, ...numeros) >= 7 ? 'RECONOCIMIENTO' : 'CONSTANCIA')
    nombres.forEach((nombre, indice) => conteos.set(nombre, numeros[indice]))
  }
  return resultado
}
