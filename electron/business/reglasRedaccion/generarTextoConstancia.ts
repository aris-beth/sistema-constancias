import type { Modalidad } from '../../../shared/types/evento'
import { esUniversidadBUAP } from '../instituciones'

export { esUniversidadBUAP } from '../instituciones'

export interface DatosTextoConstancia {
  participaComo: string
  nombreEvento: string
  modalidad: Modalidad
  nombrePonencia: string | null
  textoPersonalizado: string | null
  universidadOrigen: string | null
}

export interface ResultadoTextoConstancia {
  textoGenerado: string
  esPersonalizado: boolean
  universidadExterna: string | null
}

const PLANTILLAS_POR_ROL: Record<string, string> = {
  ORGANIZADOR: 'Por haber participado como {PARTICIPA_COMO}, en el evento {EVENTO}, {SEDE}.',
  ORGANIZADORA: 'Por ser {PARTICIPA_COMO}, en el evento {EVENTO}, {SEDE}.',
  COLABORADOR: 'Por participar como {PARTICIPA_COMO}, en el evento {EVENTO}, {SEDE}.',
  COLABORADORA: 'Por participar como {PARTICIPA_COMO}, en el evento {EVENTO}, {SEDE}.',
  ASISTENTE: 'Por asistir al evento {EVENTO}, {SEDE}.',
  'PONENTE CONFERENCIA':
    'Por presentar la conferencia magistral “{PONENCIA}”, en el evento {EVENTO}, {SEDE}.',
  'PONENTES CONFERENCIA':
    'Por presentar la conferencia magistral “{PONENCIA}”, en el evento {EVENTO}, {SEDE}.',
  PONENTE: 'Por haber impartido la ponencia “{PONENCIA}” en el evento {EVENTO}, {SEDE}.',
  PONENTES: 'Por haber impartido la ponencia “{PONENCIA}” en el evento {EVENTO}, {SEDE}.',
  // Vigente por decisión del cliente: el texto es fijo ("jurado"), NO usa el valor real de la columna PARTICIPA COMO, a diferencia de lo que indica el documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  JURADO: 'Por participar como jurado en el evento {EVENTO}, {SEDE}.',
  'MODERADOR DE PANEL':
    'Por participar como moderador de panel, en el evento “{EVENTO}” {SEDE}.',
  'MODERADORA DE PANEL':
    'Por participar como moderadora de panel, en el evento “{EVENTO}” {SEDE}.',
  // Vigente por decisión del cliente: {PONENCIA} es la descripción libre de lo obtenido, no un "lugar", a diferencia de la redacción del documento de requerimientos (tabla 3, sección 5.1). Confirmado — no modificar sin autorización.
  GANADOR: 'Por ser {PONENCIA} en el evento {EVENTO}, {SEDE}.',
  'REVISOR DE LIBRO': 'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado del evento {EVENTO}, {SEDE}.',
  'REVISORA DE LIBRO': 'Por participar como {PARTICIPA_COMO} {PONENCIA}, emanado del evento {EVENTO}, {SEDE}.',
  'COMITE REVISOR': 'Por participar como miembro del comité revisor, en el evento {EVENTO}, {SEDE}.',
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

function reemplazarCierrePorExterno(texto: string): string {
  const clausulasDeSede = [
    'en la Facultad de Ciencias de la Computación, campus CU2',
    'de la Facultad de Ciencias de la Computación, campus CU2',
    'en la Facultad de Ciencias de la Computación',
    'de la Facultad de Ciencias de la Computación',
  ]

  for (const clausula of clausulasDeSede) {
    const cierreConPunto = `${clausula}.`
    if (texto.endsWith(cierreConPunto)) {
      return `${texto.slice(0, -cierreConPunto.length).replace(/,\s*$/, '')}.`
    }
    if (texto.endsWith(clausula)) {
      return `${texto.slice(0, -clausula.length).replace(/,\s*$/, '')}.`
    }
  }

  return texto
}

function reemplazarVariables(plantilla: string, datos: DatosTextoConstancia): string {
  const ponencia = datos.nombrePonencia?.trim()
  if (plantilla.includes('{PONENCIA}') && !ponencia) {
    throw new Error(
      `El rol "${datos.participaComo}" requiere un valor en NOMBRE DE LA PONENCIA.`,
    )
  }

  return plantilla
    .replaceAll('{PARTICIPA_COMO}', datos.participaComo.trim())
    .replaceAll('{EVENTO}', datos.nombreEvento.trim())
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
  const textoBase = reemplazarVariables(plantilla, datos)
  const textoGenerado = universidadExterna
    ? reemplazarCierrePorExterno(textoBase)
    : textoBase

  return {
    textoGenerado,
    esPersonalizado: false,
    universidadExterna: universidadExterna ? datos.universidadOrigen?.trim() || null : null,
  }
}