import type { ArticuloEvento, Modalidad } from '../../../shared/types/evento'
import { formaPreposicionalEvento, inferirArticuloEvento } from './articuloEvento'
import { esUniversidadBUAP } from '../instituciones'

export { esUniversidadBUAP } from '../instituciones'

export interface DatosTextoConstancia {
  participaComo: string
  nombreEvento: string
  modalidad: Modalidad
  nombrePonencia: string | null
  fechaConstancia?: string | null
  duracion?: string | null
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

const PLANTILLAS_POR_ROL: Record<string, string> = {
  PARTICIPANTE: 'Por su participación {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  PARTICIPANTES: 'Por su participación {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  ORGANIZADOR: 'Por su valiosa labor como {PARTICIPA_COMO}, {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  ORGANIZADORA: 'Por su valiosa labor como {PARTICIPA_COMO}, {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  COLABORADOR: 'Por su participación como {PARTICIPA_COMO}, {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  COLABORADORA: 'Por su participación como {PARTICIPA_COMO}, {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  ASISTENTE: 'Por su asistencia {AL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  ASISTENTES: 'Por su asistencia {AL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'ASISTENTE TALLER':
    'Por su asistencia al taller “{PONENCIA}”, impartido en el marco {DEL_EVENTO}, realizado {FECHA_EVENTO}, con una duración de {DURACION}, {SEDE}.',
  'ASISTENTE AL TALLER':
    'Por su asistencia al taller “{PONENCIA}”, impartido en el marco {DEL_EVENTO}, realizado {FECHA_EVENTO}, con una duración de {DURACION}, {SEDE}.',
  'ASISTENTES TALLER':
    'Por su asistencia al taller “{PONENCIA}”, impartido en el marco {DEL_EVENTO}, realizado {FECHA_EVENTO}, con una duración de {DURACION}, {SEDE}.',
  'ASISTENTES AL TALLER':
    'Por su asistencia al taller “{PONENCIA}”, impartido en el marco {DEL_EVENTO}, realizado {FECHA_EVENTO}, con una duración de {DURACION}, {SEDE}.',
  'PONENTE CONFERENCIA':
    'Por presentar la conferencia titulada “{PONENCIA}”, en el marco {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'PONENTES CONFERENCIA':
    'Por presentar la conferencia titulada “{PONENCIA}”, en el marco {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  PONENTE: 'Por haber impartido la ponencia “{PONENCIA}” {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  PONENTES: 'Por haber impartido la ponencia “{PONENCIA}” {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  // Vigente por decisión del cliente: el texto es fijo ("jurado"), NO usa el valor real de la columna PARTICIPA COMO, a diferencia de lo que indica el documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  JURADO: 'Por participar como jurado {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  JURADOS: 'Por participar como jurados {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  MODERADOR: 'Por participar como moderador {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  MODERADORA: 'Por participar como moderadora {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  MODERADORES: 'Por participar como moderadores {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  MODERADORAS: 'Por participar como moderadoras {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'MODERADOR DE PANEL':
    'Por participar como moderador de panel, {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'MODERADORA DE PANEL':
    'Por participar como moderadora de panel, {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  // Vigente por decisión del cliente: {PONENCIA} es la descripción libre de lo obtenido, no un "lugar", a diferencia de la redacción del documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  GANADOR: 'Por ser {PONENCIA} {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  GANADORA: 'Por ser {PONENCIA} {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  GANADORES: 'Por ser {PONENCIA} {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  GANADORAS: 'Por ser {PONENCIA} {EN_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'REVISOR DE LIBRO':
    'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'REVISORA DE LIBRO':
    'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
  'COMITE REVISOR':
    'Por participar como integrante del comité revisor, {DEL_EVENTO}, llevado a cabo {FECHA_EVENTO}, {SEDE}.',
}

export const ROLES_RECONOCIDOS = Object.keys(PLANTILLAS_POR_ROL)

const SEDES_POR_MODALIDAD: Record<string, string> = {
  PRESENCIAL: 'en la Facultad de Ciencias de la Computación de la BUAP',
  'PRESENCIAL CU': 'en la Facultad de Ciencias de la Computación de la BUAP',
  'PRESENCIAL CU2': 'en la Facultad de Ciencias de la Computación de la BUAP',
  'EN LINEA': 'en la Facultad de Ciencias de la Computación de la BUAP',
  OTRO: 'en la Facultad de Ciencias de la Computación de la BUAP',
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

function fraseFechaEvento(fechaConstancia: string | null | undefined): string {
  const fecha = fechaConstancia?.trim() ?? ''
  if (!fecha) {
    throw new Error('La constancia requiere una fecha del evento.')
  }
  const sinPrefijo = /^del\s+/i.test(fecha) ? fecha.replace(/^del\s+/i, '') : fecha
  const esRango = /^\d{1,2}\s+(?:al|a)\s+\d{1,2}\s+de\s+/i.test(sinPrefijo)
  return esRango ? `del ${sinPrefijo}` : `el ${sinPrefijo}`
}

function formaAlEvento(
  articulo: ArticuloEvento,
  nombreEvento: string,
): string {
  if (articulo === 'de la' || articulo === 'en la') return `a la ${nombreEvento}`
  if (articulo === 'de las') return `a las ${nombreEvento}`
  if (articulo === 'de los') return `a los ${nombreEvento}`
  return `al ${nombreEvento}`
}

function reemplazarVariables(plantilla: string, datos: DatosTextoConstancia): string {
  const ponencia = datos.nombrePonencia?.trim()
  if (plantilla.includes('{PONENCIA}') && !ponencia) {
    throw new Error(
      `El rol "${datos.participaComo}" requiere un valor en NOMBRE DE LA PONENCIA.`,
    )
  }

  if (plantilla.includes('{DURACION}') && !datos.duracion?.trim()) {
    throw new Error(
      `El rol "${datos.participaComo}" requiere un valor en la columna DURACION.`,
    )
  }

  const nombreEvento = datos.nombreEvento.trim()
  let eventoConArticulo = ''
  let eventoConPreposicion = ''
  let eventoAl = ''
  if (plantilla.includes('{DEL_EVENTO}') || plantilla.includes('{EN_EVENTO}') || plantilla.includes('{AL_EVENTO}')) {
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
    if (plantilla.includes('{AL_EVENTO}')) {
      eventoAl = formaAlEvento(articulo, nombreEvento)
    }
  }

  return plantilla
    .replaceAll('{PARTICIPA_COMO}', datos.participaComo.trim())
    .replaceAll('{FECHA_EVENTO}', fraseFechaEvento(datos.fechaConstancia))
    .replaceAll('{DURACION}', datos.duracion?.trim() ?? '')
    .replaceAll('{DEL_EVENTO}', eventoConArticulo)
    .replaceAll('{EN_EVENTO}', eventoConPreposicion)
    .replaceAll('{AL_EVENTO}', eventoAl)
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