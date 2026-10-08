// Catálogo de grados académicos reconocidos

export interface EntradaAbreviatura {
  formaEncontrada: string
  abreviaturaAceptada: string
}

export const CATALOGO_ABREVIATURAS_BASE: EntradaAbreviatura[] = [
  { formaEncontrada: 'DOCTOR', abreviaturaAceptada: 'DR.' },
  { formaEncontrada: 'DR', abreviaturaAceptada: 'DR.' },
  { formaEncontrada: 'DOCTORA', abreviaturaAceptada: 'DRA.' },
  { formaEncontrada: 'DRA', abreviaturaAceptada: 'DRA.' },

  { formaEncontrada: 'MAESTRO', abreviaturaAceptada: 'MTRO.' },
  { formaEncontrada: 'MTRO', abreviaturaAceptada: 'MTRO.' },
  { formaEncontrada: 'MAESTRA', abreviaturaAceptada: 'MTRA.' },
  { formaEncontrada: 'MTRA', abreviaturaAceptada: 'MTRA.' },
  { formaEncontrada: 'MC', abreviaturaAceptada: 'M.C.' },
  { formaEncontrada: 'M. C.', abreviaturaAceptada: 'M.C.' },
  { formaEncontrada: 'MI', abreviaturaAceptada: 'M.I.' },

  { formaEncontrada: 'INGENIERO', abreviaturaAceptada: 'ING.' },
  { formaEncontrada: 'ING', abreviaturaAceptada: 'ING.' },
  { formaEncontrada: 'INGENIERA', abreviaturaAceptada: 'ING.' },

  { formaEncontrada: 'LICENCIADO', abreviaturaAceptada: 'LIC.' },
  { formaEncontrada: 'LIC', abreviaturaAceptada: 'LIC.' },  
  { formaEncontrada: 'LICENCIADA', abreviaturaAceptada: 'LIC.' },
]

/**
 * Construye el mapa de búsqueda que usa el normalizador (token → abreviatura
 * aceptada). Acepta entradas adicionales (las que un usuario agregue después
 * a la tabla `abreviatura_academica` vía la interfaz) para combinarlas con
 * el catálogo base, sin tener que tocar este archivo cada vez.
 */
export function construirMapaAbreviaturas(
  entradasAdicionales: EntradaAbreviatura[] = [],
): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const entrada of [...CATALOGO_ABREVIATURAS_BASE, ...entradasAdicionales]) {
    mapa.set(entrada.formaEncontrada.toUpperCase(), entrada.abreviaturaAceptada)
  }
  return mapa
}
