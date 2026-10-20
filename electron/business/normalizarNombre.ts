import { PALABRAS_NO_GRADO } from './catalogos/palabrasNoGrado'
import { separarParticipantes } from './separarParticipantes'
import type { ResultadoNormalizacion } from '../../shared/types/normalizacion'

const MAXIMO_TOKENS_CONFIANZA_ALTA = 5
const CONECTOR_AMBIGUO = /\b(?:de(?:\s+(?:la|los|las))?|del|y)\b/i

function separarAbreviaturasPegadas(texto: string): string {
  return texto.replace(/([A-Za-zÀ-ÿ]{2,})\.(?=[A-Za-zÀ-ÿ])/g, '$1. ')
}

/**
 * Reemplaza separadores comunes ("/", ";", guiones) por espacios y colapsa
 * espacios múltiples. Ej: "DOCTOR/JUAN PEREZ" → "DOCTOR JUAN PEREZ".
 */
function limpiarSeparadores(texto: string): string {
  return texto
    .replace(/[-‐‑‒–—/;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quita acentos */
function quitarAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normaliza un token individual para poder compararlo contra el catálogo:
 * mayúsculas, sin acentos, sin puntos (para que "Dr." y "DR" generen el
 * mismo resultado de búsqueda).
 */
function normalizarToken(token: string): string {
  return quitarAcentos(token).toUpperCase().replace(/\./g, '')
}

function tokenizar(texto: string): string[] {
  return texto.split(' ').filter((token) => token.length > 0)
}


function reordenarApellidosPrimero(tokens: string[]): string[] {
  if (tokens.length === 2) {
    // [Nombre, Apellido] → [Apellido, Nombre]
    return [tokens[1], tokens[0]]
  }
  if (tokens.length === 3) {
    // [Nombre, ApellidoP, ApellidoM] → [ApellidoP, ApellidoM, Nombre]
    return [tokens[1], tokens[2], tokens[0]]
  }
  if (tokens.length === 4) {
    // [Nombre1, Nombre2, ApellidoP, ApellidoM] → [ApellidoP, ApellidoM, Nombre1, Nombre2]
    return [tokens[2], tokens[3], tokens[0], tokens[1]]
  }
  if (tokens.length === 5) {
    // [Nombre1, Nombre2, Nombre3, ApellidoP, ApellidoM] → [ApellidoP,
    // ApellidoM, Nombre1, Nombre2, Nombre3].
    return [tokens[3], tokens[4], tokens[0], tokens[1], tokens[2]]
  }
  // 1 token (mononombre) o 6+ tokens: no hay un patrón confiable, se deja
  // tal cual llegó y se marcará confianza "baja".
  return tokens
}

/**
 * Normaliza el nombre de UNA sola persona (ya separada de las demás si
 * venían varias en la misma celda). No se exporta: es un paso interno de
 * normalizarNombre.
 */
function normalizarPersona(
  nombreOriginal: string,
  catalogoAbreviaturas: Map<string, string>,
): ResultadoNormalizacion {
  const textoLimpio = limpiarSeparadores(nombreOriginal)
  let tokens = tokenizar(textoLimpio).map(normalizarToken)

  // 1) Buscar grado académico entre los tokens (antes de quitar nada más).
  let gradoDetectado: string | null = null
  let coincidenciasDeGrado = 0
  for (const token of tokens) {
    const abreviatura = catalogoAbreviaturas.get(token)
    if (abreviatura) {
      coincidenciasDeGrado += 1
      if (gradoDetectado === null) {
        gradoDetectado = abreviatura
      }
    }
  }
  const gradoAmbiguo = coincidenciasDeGrado > 1

  // 2) Quitar palabras que no son grados reales ("ESTUDIANTE", "ALUMNO"...).
  tokens = tokens.filter((token) => !PALABRAS_NO_GRADO.has(token))

  // 3) Si se detectó grado, quitar el/los token(s) que lo generaron.
  if (gradoDetectado !== null) {
    tokens = tokens.filter((token) => !catalogoAbreviaturas.has(token))
  }

  if (tokens.length === 0) {
    throw new Error(
      `No quedó ningún texto de nombre después de normalizar "${nombreOriginal}". ` +
        'Revisa esta fila manualmente.',
    )
  }

  const nombreOrdenado = reordenarApellidosPrimero(tokens)
  const nombreNormalizado = (gradoDetectado ? `${gradoDetectado} ` : '') + nombreOrdenado.join(' ')

  const confianza: ResultadoNormalizacion['confianza'] =
    gradoAmbiguo ||
    tokens.length < 2 ||
    tokens.length > MAXIMO_TOKENS_CONFIANZA_ALTA ||
    CONECTOR_AMBIGUO.test(nombreOriginal)
      ? 'baja'
      : 'alta'

  return { nombreNormalizado, gradoDetectado, confianza }
}

/**
 * Normaliza la columna "GRADO ACADÉMICO/NOMBRE COMPLETO" del Excel.
 * Soporta que la celda tenga UNA persona o VARIAS (constancia grupal),
 * separadas por comas o por la conjunción independiente "y"
 * ("Juan Pérez, Ana López y Luis Ruiz").
 * Cada persona se normaliza por separado; las comas y la conjunción "y"
 * se conservan en la salida. Si alguna persona del grupo queda con
 * confianza "baja", el resultado completo se marca como "baja" (para que
 * esa fila se revise en la vista previa, aunque el resto esté bien).
 *
 * @param nombreOriginal texto tal como viene en la celda del Excel.
 * @param catalogoAbreviaturas mapa (token en mayúsculas sin puntos →
 *   abreviatura aceptada), construido con `construirMapaAbreviaturas`.
 *   Se recibe como parámetro (en vez de leerlo aquí adentro) para que
 *   esta función sea pura y fácil de probar sin necesitar la base de
 *   datos ni Electron.
 */
export function normalizarNombre(
  nombreOriginal: string,
  catalogoAbreviaturas: Map<string, string>,
): ResultadoNormalizacion {
  if (!nombreOriginal || nombreOriginal.trim().length === 0) {
    throw new Error('No se puede normalizar un nombre vacío.')
  }

  const textoConEspacios = separarAbreviaturasPegadas(nombreOriginal)
  const partes = textoConEspacios
    .split(/(,|\s+\by\b\s+)/i)
    .filter((parte) => parte.trim().length > 0)
  const nombresIndividuales = separarParticipantes(textoConEspacios)

  if (nombresIndividuales.length === 0) {
    throw new Error('No se encontró ningún nombre válido para normalizar.')
  }

  const resultados = nombresIndividuales.map((nombre) =>
    normalizarPersona(nombre, catalogoAbreviaturas),
  )
  let indiceNombre = 0
  const nombreNormalizado = partes
    .map((parte) => {
      if (parte === ',') return ', '
      if (/^\s+y\s+$/i.test(parte)) return ' Y '
      return resultados[indiceNombre++]?.nombreNormalizado ?? ''
    })
    .join('')
    .trim()

  const gradosDetectados = resultados
    .map((resultado) => resultado.gradoDetectado)
    .filter((grado): grado is string => grado !== null)

  return {
    nombreNormalizado,
    gradoDetectado: gradosDetectados.length > 0 ? gradosDetectados[0] : null,
    confianza:
      resultados.every((resultado) => resultado.confianza === 'alta') &&
      !CONECTOR_AMBIGUO.test(nombreOriginal)
        ? 'alta'
        : 'baja',
  }
}
