import type { ArticuloEvento, Modalidad } from '../../../shared/types/evento'
import { formaPreposicionalEvento, inferirArticuloEvento } from './articuloEvento'
import { esUniversidadBUAP } from '../instituciones'

export { esUniversidadBUAP } from '../instituciones'

export interface DatosTextoConstancia {
  participaComo: string
  nombreEvento: string
  modalidad: Modalidad
  nombrePonencia: string | null
  textoPersonalizado: string | null
  universidadOrigen: string | null
  /**
   * Artículo con el que se escribe el nombre del evento en {DEL_EVENTO}
   * ("del", "de la"…). Si no viene, se propone a partir del nombre; si
   * tampoco se puede decidir y la plantilla lo necesita, es un error.
   */
  articuloEvento?: ArticuloEvento | null
}

export interface ResultadoTextoConstancia {
  textoGenerado: string
  esPersonalizado: boolean
  universidadExterna: string | null
}

/**
 * Organizadores y colaboradores conservan la forma tradicional {DEL_EVENTO}
 * ("del Congreso", "de la Jornada"). El resto de las plantillas usa
 * {EN_EVENTO} ("en el Congreso", "en la Jornada"), sin insertar "el evento".
 *
 * Marcadores de las plantillas:
 * - {EVENTO}: el nombre del evento tal cual.
 * - {DEL_EVENTO}: artículo + nombre ("del 5.º Taller…", "de la 3.ª Jornada…").
 */
const PLANTILLAS_POR_ROL: Record<string, string> = {
  ORGANIZADOR: 'Por ser {PARTICIPA_COMO}, {DEL_EVENTO}, {SEDE}.',
  ORGANIZADORA: 'Por ser {PARTICIPA_COMO}, {DEL_EVENTO}, {SEDE}.',
  COLABORADOR: 'Por su participación como {PARTICIPA_COMO}, {DEL_EVENTO}, {SEDE}.',
  COLABORADORA: 'Por su participación como {PARTICIPA_COMO}, {DEL_EVENTO}, {SEDE}.',
  ASISTENTE: 'Por asistir {EN_EVENTO}, {SEDE}.',
  'PONENTE CONFERENCIA':
    'Por presentar la conferencia magistral “{PONENCIA}”, {EN_EVENTO}, {SEDE}.',
  'PONENTES CONFERENCIA':
    'Por presentar la conferencia magistral “{PONENCIA}”, {EN_EVENTO}, {SEDE}.',
  PONENTE: 'Por haber impartido la ponencia “{PONENCIA}” {EN_EVENTO}, {SEDE}.',
  PONENTES: 'Por haber impartido la ponencia “{PONENCIA}” {EN_EVENTO}, {SEDE}.',
  // Vigente por decisión del cliente: el texto es fijo ("jurado"), NO usa el valor real de la columna PARTICIPA COMO, a diferencia de lo que indica el documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  JURADO: 'Por participar como jurado {EN_EVENTO}, {SEDE}.',
  'MODERADOR DE PANEL':
    'Por participar como moderador de panel, {EN_EVENTO}, {SEDE}.',
  'MODERADORA DE PANEL':
    'Por participar como moderadora de panel, {EN_EVENTO}, {SEDE}.',
  // Vigente por decisión del cliente: {PONENCIA} es la descripción libre de lo obtenido, no un "lugar", a diferencia de la redacción del documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  GANADOR: 'Por ser {PONENCIA} {EN_EVENTO}, {SEDE}.',
  'REVISOR DE LIBRO': 'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado {DEL_EVENTO}, {SEDE}.',
  'REVISORA DE LIBRO': 'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado {DEL_EVENTO}, {SEDE}.',
  'COMITE REVISOR': 'Por participar como integrante del comité revisor, {EN_EVENTO}, {SEDE}.',
}

export const ROLES_RECONOCIDOS = [
  'Participante',
  'Organizador',
  'Organizadora',
  'Colaborador',
  'Colaboradora',
  'Asistente',
  'Ponente conferencia',
  'Ponentes conferencia',
  'Ponente',
  'Ponentes',
  'Jurado',
  'Moderador de panel',
  'Moderadora de panel',
  'Ganador',
  'Revisor de libro',
  'Revisora de libro',
  'Comité revisor',
]

const SEDES_POR_MODALIDAD: Record<string, string> = {
  'PRESENCIAL CU': 'en la Facultad de Ciencias de la Computación',
  'PRESENCIAL CU2': 'en la Facultad de Ciencias de la Computación, campus CU2',
  'EN LINEA': 'de la Facultad de Ciencias de la Computación',
  OTRO: 'de la Facultad de Ciencias de la Computación',
}

function normalizarClave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-MX')
}

function resolverSede(modalidad: Modalidad): string {
  const sede = SEDES_POR_MODALIDAD[normalizarClave(modalidad)]
  if (!sede) {
    throw new Error(`La modalidad "${modalidad}" no es reconocida.`)
  }
  return sede
}

function esUniversidadExterna(universidadOrigen: string | null): boolean {
  return !esUniversidadBUAP(universidadOrigen)
}

function reemplazarVariables(plantilla: string, datos: DatosTextoConstancia): string {
  const ponencia = datos.nombrePonencia?.trim()
  if (plantilla.includes('{PONENCIA}') && !ponencia) {
    throw new Error(
      `El rol "${datos.participaComo}" requiere un valor en NOMBRE DE LA PONENCIA.`,
    )
  }

  const nombreEvento = datos.nombreEvento.trim()
  let eventoConArticulo = ''
  let eventoConPreposicion = ''
  if (plantilla.includes('{DEL_EVENTO}') || plantilla.includes('{EN_EVENTO}')) {
    const articulo = datos.articuloEvento ?? inferirArticuloEvento(nombreEvento)
    if (!articulo) {
      throw new Error(
        `No se pudo determinar cómo se escribe el evento "${nombreEvento}" en la constancia. ` +
          'Elige una forma para el nombre del evento en la pantalla de validación y actualiza los cambios.',
      )
    }
    if (plantilla.includes('{DEL_EVENTO}')) {
      eventoConArticulo = articulo === 'en el'
        ? `del ${nombreEvento}`
        : articulo === 'en la'
          ? `de la ${nombreEvento}`
          : `${articulo} ${nombreEvento}`
    }
    if (plantilla.includes('{EN_EVENTO}')) {
      eventoConPreposicion = formaPreposicionalEvento(articulo, nombreEvento)
    }
  }

  return plantilla
    .replaceAll('{PARTICIPA_COMO}', datos.participaComo.trim())
    .replaceAll('{DEL_EVENTO}', eventoConArticulo)
    .replaceAll('{EN_EVENTO}', eventoConPreposicion)
    .replaceAll('{EVENTO}', nombreEvento)
    .replaceAll('{PONENCIA}', ponencia ?? '')
    .replaceAll('{SEDE}', resolverSede(datos.modalidad))
}

export function generarTextoConstancia(
  datos: DatosTextoConstancia,
): ResultadoTextoConstancia {
  const textoPersonalizado = datos.textoPersonalizado?.trim()
  if (textoPersonalizado) {
    return {
      textoGenerado: textoPersonalizado,
      esPersonalizado: true,
      universidadExterna: esUniversidadExterna(datos.universidadOrigen)
        ? datos.universidadOrigen?.trim() || null
        : null,
    }
  }

  const claveRol = normalizarClave(datos.participaComo)
  const plantilla = PLANTILLAS_POR_ROL[claveRol]
  if (!plantilla) {
    throw new Error(
      `No existe una plantilla para el rol "${datos.participaComo}". ` +
        'Usa texto personalizado para este caso.',
    )
  }

  const universidadExterna = esUniversidadExterna(datos.universidadOrigen)
  const textoGenerado = reemplazarVariables(plantilla, datos)

  return {
    textoGenerado,
    esPersonalizado: false,
    universidadExterna: universidadExterna ? datos.universidadOrigen?.trim() || null : null,
  }
}