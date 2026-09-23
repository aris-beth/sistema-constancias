/**
 * Separa el texto completo de una celda en los nombres individuales que
 * contiene. La agrupación de una constancia grupal depende exclusivamente
 * de comas, como establece el formato de entrada del sistema.
 */
export function separarParticipantes(textoCompleto: string): string[] {
  const segmentosPorComa = textoCompleto
    .split(',')
    .map((segmento) => segmento.trim())
    .filter((segmento) => segmento.length > 0)

  return segmentosPorComa
}
