// Catálogo de grados académicos reconocidos

export interface EntradaAbreviatura {
  formaEncontrada: string
  abreviaturaAceptada: string
}

export const CATALOGO_ABREVIATURAS_BASE: EntradaAbreviatura[] = [
  { formaEncontrada: 'DOCTOR', abreviaturaAceptada: 'Dr.' },
  { formaEncontrada: 'DR', abreviaturaAceptada: 'Dr.' },
  { formaEncontrada: 'DOCTORA', abreviaturaAceptada: 'Dra.' },
  { formaEncontrada: 'DRA', abreviaturaAceptada: 'Dra.' },

  { formaEncontrada: 'MAESTRO', abreviaturaAceptada: 'Mtro.' },
  { formaEncontrada: 'MTRO', abreviaturaAceptada: 'Mtro.' },
  { formaEncontrada: 'MAESTRA', abreviaturaAceptada: 'Mtra.' },
  { formaEncontrada: 'MTRA', abreviaturaAceptada: 'Mtra.' },
  { formaEncontrada: 'MC', abreviaturaAceptada: 'M.C.' },
  { formaEncontrada: 'M. C.', abreviaturaAceptada: 'M.C.' },
  { formaEncontrada: 'MI', abreviaturaAceptada: 'M.I.' },

  { formaEncontrada: 'INGENIERO', abreviaturaAceptada: 'Ing.' },
  { formaEncontrada: 'ING', abreviaturaAceptada: 'Ing.' },
  { formaEncontrada: 'INGENIERA', abreviaturaAceptada: 'Ing.' },

  { formaEncontrada: 'LICENCIADO', abreviaturaAceptada: 'Lic.' },
  { formaEncontrada: 'LIC', abreviaturaAceptada: 'Lic.' },
  { formaEncontrada: 'LICENCIADA', abreviaturaAceptada: 'Lic.' },
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
