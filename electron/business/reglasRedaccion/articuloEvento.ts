import {
  ARTICULOS_EVENTO,
  FORMAS_EN_EVENTO,
  type ArticuloEvento,
  type FormaEnEvento,
} from '../../../shared/types/evento'

export interface ArticuloEventoPersistido {
  articuloEvento: Exclude<ArticuloEvento, FormaEnEvento> | null
  formaArticuloEvento: FormaEnEvento | null
}

/**
 * Propone el artículo ("del", "de la", "de los", "de las") con el que se
 * redacta el nombre de un evento, p. ej. "en la organización del 5.º Taller
 * de Experiencias…". Es solo una PROPUESTA: la persona que captura el evento
 * la confirma o la corrige en pantalla, y si aquí no se puede decidir con
 * seguridad devuelve null para obligar a elegir en vez de adivinar.
 *
 * Orden de decisión:
 * 1. Un ordinal con marca de género al inicio ("5.º", "3.ª", "1.er",
 *    "Primera", "Segundos"…) manda sobre todo lo demás.
 * 2. Si no, la primera palabra que no sea numeración (número, romano,
 *    ordinal sin género) se busca en un diccionario corto de tipos de evento.
 * 3. Nombres que empiezan con artículo ("La Noche de…") o con una palabra
 *    desconocida no se adivinan: null.
 */

type Genero = 'm' | 'f'
type Numero = 's' | 'p'

const MASCULINOS = [
  'taller', 'congreso', 'seminario', 'foro', 'coloquio', 'curso', 'concurso', 'simposio',
  'encuentro', 'hackathon', 'evento', 'ciclo', 'torneo', 'certamen', 'diplomado', 'panel',
  'webinar', 'workshop', 'bootcamp', 'festival', 'maraton', 'programa', 'premio', 'reto',
  'verano', 'dia', 'mes', 'acto', 'homenaje', 'informe', 'examen', 'laboratorio',
]
const FEMENINOS = [
  'jornada', 'semana', 'conferencia', 'feria', 'olimpiada', 'exposicion', 'expo', 'convencion',
  'reunion', 'muestra', 'charla', 'mesa', 'escuela', 'competencia', 'cumbre', 'ceremonia',
  'presentacion', 'clausura', 'inauguracion', 'sesion', 'velada', 'campana', 'hackatona',
  'maraton', 'gala', 'cena', 'visita', 'estancia', 'asamblea',
]

function plural(palabra: string): string {
  return /[aeiou]$/.test(palabra) ? `${palabra}s` : `${palabra}es`
}

const DICCIONARIO = new Map<string, [Genero, Numero]>()
for (const palabra of MASCULINOS) {
  DICCIONARIO.set(palabra, ['m', 's'])
  DICCIONARIO.set(plural(palabra), ['m', 'p'])
}
for (const palabra of FEMENINOS) {
  // Si una palabra está en ambas listas (p. ej. "maratón", que se usa en los
  // dos géneros) no se puede decidir: se descarta y la persona elige.
  if (DICCIONARIO.get(palabra)?.[0] === 'm') {
    DICCIONARIO.delete(palabra)
    DICCIONARIO.delete(plural(palabra))
    continue
  }
  DICCIONARIO.set(palabra, ['f', 's'])
  DICCIONARIO.set(plural(palabra), ['f', 'p'])
}

const ORDINALES_EN_PALABRAS = [
  'primer', 'primero', 'primera', 'segundo', 'segunda', 'tercer', 'tercero', 'tercera',
  'cuarto', 'cuarta', 'quinto', 'quinta', 'sexto', 'sexta', 'septimo', 'septima',
  'octavo', 'octava', 'noveno', 'novena', 'decimo', 'decima', 'vigesimo', 'vigesima',
]

const ARTICULOS_INICIALES: Record<string, ArticuloEvento> = {
  el: 'del',
  la: 'de la',
  los: 'de los',
  las: 'de las',
}

const ROMANO = /^(?=[IVXLCDM])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function articulo(genero: Genero, numero: Numero): ArticuloEvento {
  if (genero === 'm') return numero === 's' ? 'del' : 'de los'
  return numero === 's' ? 'de la' : 'de las'
}

/** Género/número de un ordinal escrito con número ("5.º", "3.ª", "1.er", "2.os"), o null. */
function ordinalNumerico(token: string): [Genero, Numero] | 'sin-genero' | null {
  const limpio = token.replace(/[.\s]/g, '')
  if (/^\d+$/.test(limpio)) return 'sin-genero'
  const marca = limpio.match(/^\d+(º|°|o|er|os|ª|a|as)$/i)
  if (!marca) return null
  const sufijo = marca[1].toLowerCase()
  if (sufijo === 'º' || sufijo === '°' || sufijo === 'o' || sufijo === 'er') return ['m', 's']
  if (sufijo === 'os') return ['m', 'p']
  if (sufijo === 'ª' || sufijo === 'a') return ['f', 's']
  return ['f', 'p']
}

/** Género/número de un ordinal en palabras ("primera", "segundos"), o null si no lo es. */
function ordinalEnPalabras(tokenSinAcentos: string): [Genero, Numero] | null {
  for (const base of ORDINALES_EN_PALABRAS) {
    const raiz = base.replace(/(er|o|a)$/, '')
    if (tokenSinAcentos === base) {
      return base.endsWith('a') ? ['f', 's'] : ['m', 's']
    }
    if (tokenSinAcentos === `${raiz}os`) return ['m', 'p']
    if (tokenSinAcentos === `${raiz}as`) return ['f', 'p']
  }
  return null
}

export function inferirArticuloEvento(nombreEvento: string | null | undefined): ArticuloEvento | null {
  const tokens = (nombreEvento ?? '')
    .replace(/[“”"«»()¡!¿?,;:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return null

  for (const token of tokens) {
    const ordinal = ordinalNumerico(token)
    if (ordinal === 'sin-genero') continue
    if (ordinal) return articulo(ordinal[0], ordinal[1])

    if (ROMANO.test(token)) continue // "XII" solo numera: el género lo da la palabra que sigue

    const clave = sinAcentos(token).toLowerCase().replace(/\.$/, '')
    const enPalabras = ordinalEnPalabras(clave)
    if (enPalabras) return articulo(enPalabras[0], enPalabras[1])

    if (ARTICULOS_INICIALES[clave]) return null // "La Noche de…": que lo decida una persona
    const entrada = DICCIONARIO.get(clave)
    return entrada ? articulo(entrada[0], entrada[1]) : null
  }
  return null
}

export function esArticuloEvento(valor: unknown): valor is ArticuloEvento {
  return typeof valor === 'string' && (ARTICULOS_EVENTO as readonly string[]).includes(valor)
}

export function esFormaEnEvento(valor: unknown): valor is FormaEnEvento {
  return typeof valor === 'string' && (FORMAS_EN_EVENTO as readonly string[]).includes(valor)
}

export function articuloEventoPersistido(valor: ArticuloEvento | null | undefined): ArticuloEventoPersistido {
  if (valor === 'en el') return { articuloEvento: 'del', formaArticuloEvento: 'en el' }
  if (valor === 'en la') return { articuloEvento: 'de la', formaArticuloEvento: 'en la' }
  return {
    articuloEvento: valor ?? null,
    formaArticuloEvento: null,
  }
}

export function formaPreposicionalEvento(
  valor: ArticuloEvento,
  nombreEvento: string,
): string {
  const forma = valor === 'en el' || valor === 'del'
    ? 'en el'
    : valor === 'en la' || valor === 'de la'
      ? 'en la'
      : valor === 'de los'
        ? 'en los'
        : 'en las'
  return `${forma} ${nombreEvento}`
}
