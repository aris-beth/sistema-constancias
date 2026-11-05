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
  { limiteCaracteres: 42, tamanoFuentePt: 16, maxLineas: 1 },
  { limiteCaracteres: 82, tamanoFuentePt: 14, maxLineas: 2 },
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
 * Reparte palabras completas en grupos contiguos, eligiendo los cortes que
 * minimizan la suma de cuadrados de los anchos de línea.
 *
 * Se resuelve con programación dinámica (partición lineal): para el
 * tamaño de los textos de este sistema (decenas de unidades, máximo 3
 * líneas) el costo es despreciable, y a diferencia de un algoritmo goloso
 * garantiza el óptimo, de modo que nunca deja una línea con 3 nombres y
 * la siguiente con uno solo si existe un reparto mejor.
 *
 * @param separador caracteres entre unidades de una misma línea
 */
function particionarBalanceado(
  unidades: string[],
  maxGrupos: number,
  separador: number,
): string[][] {
  const total = unidades.length
  if (total === 0) {
    return [[]]
  }

  const grupos = Math.max(1, Math.min(maxGrupos, total))

  // acumulado[i] = suma de longitudes de las primeras i unidades.
  const acumulado: number[] = [0]
  for (const unidad of unidades) {
    acumulado.push(acumulado[acumulado.length - 1] + unidad.length)
  }

  // Ancho impreso de la línea formada por unidades[desde..hasta).
  const anchoLinea = (desde: number, hasta: number): number => {
    const cantidad = hasta - desde
    return acumulado[hasta] - acumulado[desde] + separador * (cantidad - 1)
  }

  const INFINITO = Number.POSITIVE_INFINITY
  // costo[g][j]: mejor costo de repartir las primeras j unidades en g líneas.
  const costo: number[][] = Array.from({ length: grupos + 1 }, () =>
    new Array<number>(total + 1).fill(INFINITO),
  )
  // corte[g][j]: índice donde empieza la línea g en el mejor reparto.
  const corte: number[][] = Array.from({ length: grupos + 1 }, () =>
    new Array<number>(total + 1).fill(0),
  )
  costo[0][0] = 0

  for (let g = 1; g <= grupos; g += 1) {
    for (let j = g; j <= total; j += 1) {
      for (let i = g - 1; i < j; i += 1) {
        if (costo[g - 1][i] === INFINITO) continue
        const ancho = anchoLinea(i, j)
        const candidato = costo[g - 1][i] + ancho * ancho
        if (candidato < costo[g][j]) {
          costo[g][j] = candidato
          corte[g][j] = i
        }
      }
    }
  }

  const resultado: string[][] = []
  let fin = total
  for (let g = grupos; g >= 1; g -= 1) {
    const inicio = corte[g][fin]
    resultado.unshift(unidades.slice(inicio, fin))
    fin = inicio
  }
  return resultado
}

/**
 * Distribuye un texto en como máximo `maxLineas` líneas. Las palabras nunca
 * se dividen; en listas de participantes la coma se conserva junto a la
 * última palabra de cada nombre, aunque el nombre continúe en otro renglón.
 */
function distribuirEnLineas(texto: string, maxLineas: number): string[] {
  // Cualquier salto de línea, tabulador o espacio repetido (frecuentes en
  // celdas de Excel) se normaliza a un solo espacio para que el reparto
  // dependa solo del contenido y no del formato original de la celda.
  const textoLimpio = texto.replace(/\s+/g, ' ').trim()
  if (!textoLimpio) {
    return ['']
  }
  if (maxLineas <= 1) {
    return [textoLimpio]
  }

  const nombres = textoLimpio.includes(',')
    ? textoLimpio.split(',').map((nombre) => nombre.trim()).filter(Boolean)
    : null
  const unidades = nombres
    ? nombres.flatMap((nombre, indice) => {
        const palabras = nombre.split(' ').filter(Boolean)
        if (indice < nombres.length - 1 && palabras.length > 0) {
          palabras[palabras.length - 1] += ','
        }
        return palabras
      })
    : textoLimpio.split(' ').filter(Boolean)

  if (unidades.length <= 1) {
    return [textoLimpio]
  }

  return particionarBalanceado(unidades, maxLineas, 1).map((grupo) => grupo.join(' '))
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
  const textoLimpio = texto.replace(/\s+/g, ' ').trim()
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