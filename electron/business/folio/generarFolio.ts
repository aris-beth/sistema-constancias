/**
 * Generación automática del folio de un evento. Módulo PURO (sin SQLite):
 *   {4 letras}-{año}-{número de evento del año, 3 dígitos}
 * Ejemplo: "Evento de la Facultad" (2026, primer evento) → EFAC-2026-001.
 */
const PALABRAS_IGNORADAS = new Set([
  'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'EN', 'A', 'AL',
  'CON', 'PARA', 'POR', 'SU', 'SUS', 'UN', 'UNA', 'UNOS', 'UNAS', 'DESDE', 'HASTA', 'O',
])

function normalizarClave(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

/**
 * Iniciales de las primeras 4 palabras significativas (sin rellenos ni números). Si hay menos de 4,
 * las letras faltantes se toman de la última palabra (después de su inicial).
 */
export function obtenerInicialesFolio(nombreEvento: string): string {
  const palabras = normalizarClave(nombreEvento)
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((palabra) => palabra && !/^\d+$/.test(palabra) && !PALABRAS_IGNORADAS.has(palabra))

  if (palabras.length === 0) return 'EVNT'

  const usadas = palabras.slice(0, 4)
  let resultado = usadas.map((palabra) => palabra[0]).join('')

  let indicePalabra = usadas.length - 1
  let indiceLetra = 1
  while (resultado.length < 4 && indicePalabra >= 0) {
    const palabra = usadas[indicePalabra]
    if (indiceLetra < palabra.length) {
      resultado += palabra[indiceLetra]
      indiceLetra += 1
    } else {
      indicePalabra -= 1
      indiceLetra = 1
    }
  }

  return resultado.padEnd(4, 'X').slice(0, 4)
}

export function obtenerAnioFolio(fecha: string): string {
  const coincidencia = fecha.match(/(?:^|\/|-)(\d{4})$/) ?? fecha.match(/\b(\d{4})\b/)
  if (!coincidencia) throw new Error(`No se pudo obtener el año de la fecha "${fecha}".`)
  return coincidencia[1]
}

export function construirFolio(nombreEvento: string, fecha: string, numeroEvento: number): string {
  if (!Number.isInteger(numeroEvento) || numeroEvento < 1) {
    throw new Error('El número de evento debe ser un entero mayor o igual a 1.')
  }
  return `${obtenerInicialesFolio(nombreEvento)}-${obtenerAnioFolio(fecha)}-${String(numeroEvento).padStart(3, '0')}`
}
