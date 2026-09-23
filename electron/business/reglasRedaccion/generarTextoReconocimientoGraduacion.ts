/**
 * Motor de reglas de redacción para Reconocimientos de graduación (sección
 * 5.2 y 6.5 de requerimientos). Es un flujo independiente del de
 * constancias regulares: usa su propio catálogo de "subtipos" en vez de
 * roles, no tiene columna de texto personalizado en su Excel de entrada
 * (sección 4.1), y el encabezado del documento siempre es "Reconocimiento"
 * — nunca depende del contador de la sección 5.3, que no aplica aquí.
 */

export interface DatosTextoReconocimientoGraduacion {
  subtipo: string
  generacion: string
  carrera: string
  /**
   * Plantilla explícita a usar en vez de buscarla en el catálogo fijo de
   * abajo. La pasa quien llama (la capa de IPC, en un módulo posterior)
   * cuando el subtipo viene del catálogo extensible en base de datos
   * (tabla `subtipo_graduacion`) en vez de ser uno de los tres subtipos
   * base definidos en requerimientos. Debe incluir los marcadores
   * {GENERACION} y/o {CARRERA} que correspondan. Si se omite, se usa el
   * catálogo fijo de `PLANTILLAS_POR_SUBTIPO`.
   */
  plantillaPersonalizada?: string | null
}

export interface ResultadoTextoReconocimiento {
  textoGenerado: string
}

const PLANTILLAS_POR_SUBTIPO: Record<string, string> = {
  'INTEGRANTE DE GENERACION': 'Por ser integrante de la Generación {GENERACION} de la {CARRERA}.',
  'DISTINCION AL MERITO ACADEMICO':
    'Por obtener la Distinción al Mérito Académico en la {CARRERA}, {GENERACION}.',
  'LABOR DOCENTE': 'Por su destacada labor docente, en favor de la Generación {GENERACION}.',
}

/** Catálogo base de subtipos (sección 4.1/5.2 de requerimientos). Se
 * combina con `subtipo_graduacion` (base de datos) en la capa de IPC para
 * la validación del Excel, igual que ROLES_RECONOCIDOS se combina con la
 * tabla `rol` para el flujo regular. */
export const SUBTIPOS_GRADUACION_RECONOCIDOS = [
  'Integrante de generación',
  'Distinción al Mérito Académico',
  'Labor docente',
]

function normalizarClave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-MX')
}

function reemplazarVariables(plantilla: string, datos: DatosTextoReconocimientoGraduacion): string {
  return plantilla
    .replaceAll('{GENERACION}', datos.generacion.trim())
    .replaceAll('{CARRERA}', datos.carrera.trim())
}

export function generarTextoReconocimientoGraduacion(
  datos: DatosTextoReconocimientoGraduacion,
): ResultadoTextoReconocimiento {
  if (!datos.subtipo.trim()) {
    throw new Error('Falta el subtipo para redactar el reconocimiento de graduación.')
  }
  if (!datos.generacion.trim()) {
    throw new Error('Falta la generación para redactar el reconocimiento de graduación.')
  }
  if (!datos.carrera.trim()) {
    throw new Error('Falta la carrera para redactar el reconocimiento de graduación.')
  }

  if (datos.plantillaPersonalizada?.trim()) {
    return { textoGenerado: reemplazarVariables(datos.plantillaPersonalizada.trim(), datos) }
  }

  const claveSubtipo = normalizarClave(datos.subtipo)
  const plantilla = PLANTILLAS_POR_SUBTIPO[claveSubtipo]
  if (!plantilla) {
    throw new Error(
      `El subtipo "${datos.subtipo}" no está en el catálogo de reconocimientos de graduación.`,
    )
  }

  return { textoGenerado: reemplazarVariables(plantilla, datos) }
}
