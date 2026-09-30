function normalizarNombreInstitucion(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-MX')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Reconoce las formas habituales en que se captura la Benemérita
 * Universidad Autónoma de Puebla en los archivos de entrada.
 */
export function esUniversidadBUAP(universidad: string | null | undefined): boolean {
  if (!universidad?.trim()) return true

  const clave = normalizarNombreInstitucion(universidad)
  const compacta = clave.replace(/\s/g, '')

  return (
    compacta.includes('BUAP') ||
    compacta.includes('BENEMERITAUNIVERSIDADAUTONOMADEPUEBLA') ||
    compacta.includes('BENEMERITAUNIVERSIDADDEPUEBLA') ||
    compacta.includes('UNIVERSIDADAUTONOMADEPUEBLA') ||
    compacta.includes('UNIVERSIDADDEPUEBLA')
  )
}
