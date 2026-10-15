/**
 * Separa el texto completo de una celda en los nombres individuales que
 * contiene. Acepta comas y la conjunción independiente "y" como
 * separadores de participantes.
 */
export function separarParticipantes(textoCompleto: string): string[] {
  return textoCompleto
    .split(',')
    .flatMap((segmento) => segmento.split(/\s+\by\b\s+/i))
    .map((segmento) => segmento.trim())
    .filter((segmento) => segmento.length > 0)
}
