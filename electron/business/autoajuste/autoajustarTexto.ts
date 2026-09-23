/**
 * Motor de autoajuste de diseño (sección 5/7.3 del diseño técnico, sección
 * 6.3 de requerimientos). Calcula, a partir de la longitud de un texto, el
 * tamaño de fuente y la distribución en líneas que le corresponden, para
 * que nombres largos (constancias grupales) y títulos de ponencia largos
 * no desborden el cuadro de texto institucional.
 *
 * Los umbrales de la tabla de abajo vienen calibrados con los dos casos
 * extremos conocidos de los criterios de aceptación (168 caracteres para
 * nombres de equipos de 6 personas, 130+ para ponencias). El propio TDD
 * advierte que estos números "son un punto de partida y deben calibrarse
 * antes de la versión final": lo que SÍ es definitivo aquí es el
 * comportamiento (elegir el nivel correcto, distribuir en líneas sin
 * perder texto); el tamaño de fuente exacto en puntos podrá ajustarse más
 * adelante comparando contra la plantilla HTML/CSS real sin tocar esta
 * lógica.
 */

export type TipoCampoAutoajuste = 'nombre' | 'ponencia'

interface NivelAutoajuste {
  /** Límite superior (inclusive) de caracteres para este nivel. */
  limiteCaracteres: number
  tamanoFuentePt: number
  maxLineas: number
}

export interface ResultadoAutoajuste {
  tamanoFuentePt: number
  /** El texto ya distribuido, línea por línea, listo para imprimirse tal
   * cual (una línea de HTML/CSS por elemento del arreglo). */
  lineas: string[]
  /** true cuando el texto es más largo que el mayor caso calibrado (168
   * caracteres para nombre, 130 para ponencia). El sistema igual genera un
   * resultado usable (con el nivel más pequeño disponible), pero esta
   * bandera le permite a la capa de generación de PDF avisarle a la
   * persona operadora que ese caso puntual conviene revisarlo a simple
   * vista antes de entregarlo. */
  excedeLimiteCalibrado: boolean
}

// Sección "Manejo de casos extremos" del TDD.
const NIVELES_NOMBRE: NivelAutoajuste[] = [
  { limiteCaracteres: 40, tamanoFuentePt: 16, maxLineas: 1 },
  { limiteCaracteres: 80, tamanoFuentePt: 14, maxLineas: 2 },
  { limiteCaracteres: 168, tamanoFuentePt: 11, maxLineas: 3 },
]

const NIVELES_PONENCIA: NivelAutoajuste[] = [
  { limiteCaracteres: 60, tamanoFuentePt: 12, maxLineas: 1 },
  { limiteCaracteres: 130, tamanoFuentePt: 11, maxLineas: 3 },
]

function obtenerReglasPorTipoCampo(tipoCampo: TipoCampoAutoajuste): NivelAutoajuste[] {
  return tipoCampo === 'nombre' ? NIVELES_NOMBRE : NIVELES_PONENCIA
}

/**
 * Reparte una lista de "unidades" (palabras, o nombres ya separados por
 * comas) en como máximo `maxGrupos` líneas, tratando de que cada línea
 * tenga una longitud de texto parecida — en vez de, por ejemplo, meter 5
 * palabras en la primera línea y 1 sola en la segunda.
 *
 * Es un algoritmo goloso (greedy) de una sola pasada: por cada unidad,
 * decide si cierra el grupo/línea actual y abre uno nuevo comparando la
 * longitud acumulada contra el promedio objetivo, siempre y cuando
 * todavía queden líneas disponibles para lo que falta por colocar.
 */
function particionarBalanceado(unidades: string[], maxGrupos: number): string[][] {
  if (unidades.length === 0) {
    return [[]]
  }

  const grupos = Math.max(1, Math.min(maxGrupos, unidades.length))
  const longitudTotal = unidades.reduce((acumulado, unidad) => acumulado + unidad.length, 0)
  const longitudObjetivoPorGrupo = longitudTotal / grupos

  const resultado: string[][] = []
  let grupoActual: string[] = []
  let longitudGrupoActual = 0
  let unidadesColocadas = 0

  for (const unidad of unidades) {
    const unidadesRestantesDespuesDeEsta = unidades.length - unidadesColocadas - 1
    const gruposUsados = resultado.length + (grupoActual.length > 0 ? 1 : 0)
    const hayGruposDisponiblesParaElResto = gruposUsados < grupos

    if (
      grupoActual.length > 0 &&
      longitudGrupoActual + unidad.length > longitudObjetivoPorGrupo &&
      hayGruposDisponiblesParaElResto &&
      unidadesRestantesDespuesDeEsta >= 0
    ) {
      resultado.push(grupoActual)
      grupoActual = []
      longitudGrupoActual = 0
    }

    grupoActual.push(unidad)
    longitudGrupoActual += unidad.length
    unidadesColocadas += 1
  }

  if (grupoActual.length > 0) {
    resultado.push(grupoActual)
  }

  return resultado
}

/**
 * Distribuye un texto en como máximo `maxLineas` líneas. Si el texto trae
 * comas (caso típico de una constancia grupal: "PÉREZ JUAN, LÓPEZ ANA,
 * RAMÍREZ LUIS"), reparte por esos nombres completos y deja la coma al
 * final de cada línea intermedia para que quede claro que el listado
 * continúa. Si no trae comas (un título de ponencia, o un solo nombre muy
 * largo), reparte por palabras.
 */
function distribuirEnLineas(texto: string, maxLineas: number): string[] {
  const textoLimpio = texto.trim()
  if (!textoLimpio) {
    return ['']
  }
  if (maxLineas <= 1) {
    return [textoLimpio]
  }

  const esListaConComas = textoLimpio.includes(',')
  const unidades = esListaConComas
    ? textoLimpio
        .split(',')
        .map((segmento) => segmento.trim())
        .filter((segmento) => segmento.length > 0)
    : textoLimpio.split(/\s+/).filter((palabra) => palabra.length > 0)

  if (unidades.length <= 1) {
    return [textoLimpio]
  }

  const grupos = particionarBalanceado(unidades, maxLineas)

  return grupos.map((grupo, indice) => {
    const esUltimoGrupo = indice === grupos.length - 1
    const lineaUnida = esListaConComas ? grupo.join(', ') : grupo.join(' ')
    return esListaConComas && !esUltimoGrupo ? `${lineaUnida},` : lineaUnida
  })
}

/**
 * Calcula el tamaño de fuente y la distribución en líneas para un texto
 * de nombre o de ponencia, siguiendo el pseudocódigo `autoajustarTexto()`
 * de la sección 5 del diseño técnico.
 */
export function autoajustarTexto(
  texto: string,
  tipoCampo: TipoCampoAutoajuste,
): ResultadoAutoajuste {
  const textoLimpio = texto.trim()
  if (!textoLimpio) {
    throw new Error(`No se puede autoajustar un texto de "${tipoCampo}" vacío.`)
  }

  const longitud = textoLimpio.length
  const niveles = obtenerReglasPorTipoCampo(tipoCampo)

  const nivelCalibrado = niveles.find((nivel) => longitud <= nivel.limiteCaracteres)
  // Si el texto rebasa incluso el nivel más grande calibrado, se sigue
  // generando un resultado (con el nivel más pequeño disponible) en vez
  // de lanzar un error: es preferible un documento que se vea apretado
  // pero completo a que la generación del lote entero se detenga por un
  // solo texto fuera de lo calibrado.
  const nivel = nivelCalibrado ?? niveles[niveles.length - 1]

  const lineas = distribuirEnLineas(textoLimpio, nivel.maxLineas)

  return {
    tamanoFuentePt: nivel.tamanoFuentePt,
    lineas,
    excedeLimiteCalibrado: !nivelCalibrado,
  }
}
