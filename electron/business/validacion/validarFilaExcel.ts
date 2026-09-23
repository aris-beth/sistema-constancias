import type { FilaExcelCruda } from '../../../shared/types/excel'

const MODALIDADES_VALIDAS = new Set(['Presencial CU', 'Presencial CU2', 'En línea', 'Otro'])
const CATEGORIAS_VALIDAS = new Set(['Maestro BUAP', 'Alumno BUAP', 'Externo'])

export interface ResultadoValidacionFila {
  valida: boolean
  errores: string[]
}

const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function normalizarValorCatalogo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-MX')
}

function extraerPartesFecha(valor: string): { dia: number; mes: number; anio: number } | null {
  const texto = valor.trim()
  const fechaISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(texto)
  const fechaLatinoamericana = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto)

  if (fechaISO) {
    return { anio: Number(fechaISO[1]), mes: Number(fechaISO[2]), dia: Number(fechaISO[3]) }
  }
  if (fechaLatinoamericana) {
    return {
      anio: Number(fechaLatinoamericana[3]),
      mes: Number(fechaLatinoamericana[2]),
      dia: Number(fechaLatinoamericana[1]),
    }
  }
  return null
}

export function formatearFechaConstancia(valor: string): string {
  const partes = extraerPartesFecha(valor)
  if (!partes) return valor.trim()

  const fecha = new Date(Date.UTC(partes.anio, partes.mes - 1, partes.dia))
  const esFechaValida =
    fecha.getUTCFullYear() === partes.anio &&
    fecha.getUTCMonth() === partes.mes - 1 &&
    fecha.getUTCDate() === partes.dia

  if (!esFechaValida || partes.mes < 1 || partes.mes > 12) return valor.trim()
  return `${partes.dia} de ${NOMBRES_MESES[partes.mes - 1]} de ${partes.anio}`
}

function tieneFechaValida(valor: string): boolean {
  const texto = valor.trim()
  if (!texto) return false

  const partes = extraerPartesFecha(texto)
  const anio = partes?.anio ?? NaN
  const mes = partes?.mes ?? NaN
  const dia = partes?.dia ?? NaN

  if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return false
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  )
}

export function validarFilaExcel(
  fila: FilaExcelCruda,
  rolesReconocidos: Iterable<string>,
): ResultadoValidacionFila {
  const errores: string[] = []
  const prefijo = `Fila ${fila.numeroFila}`
  const rolesNormalizados = new Set(
    Array.from(rolesReconocidos, (rol) => normalizarValorCatalogo(rol)),
  )

  if (!fila.nombreCompleto.trim()) {
    errores.push(`${prefijo}: falta el nombre completo.`)
  }

  if (!fila.participaComo.trim()) {
    errores.push(`${prefijo}: falta el rol de participación.`)
  } else if (!rolesNormalizados.has(normalizarValorCatalogo(fila.participaComo))) {
    errores.push(
      `${prefijo}: el rol '${fila.participaComo}' no está en el catálogo de roles reconocidos.`,
    )
  }

  if (!fila.nombreEvento.trim() || /["“”]/.test(fila.nombreEvento)) {
    errores.push(`${prefijo}: revisa el nombre del evento; no puede estar vacío ni entre comillas.`)
  }

  if (!tieneFechaValida(fila.fechaConstancia)) {
    errores.push(`${prefijo}: la fecha de la constancia no es válida.`)
  }

  const modalidadesNormalizadas = new Set(
    Array.from(MODALIDADES_VALIDAS, (modalidad) => normalizarValorCatalogo(modalidad)),
  )
  if (!modalidadesNormalizadas.has(normalizarValorCatalogo(fila.modalidad))) {
    errores.push(`${prefijo}: modalidad '${fila.modalidad}' no reconocida.`)
  }

  const categoriasNormalizadas = new Set(
    Array.from(CATEGORIAS_VALIDAS, (categoria) => normalizarValorCatalogo(categoria)),
  )
  if (!fila.categoria || !categoriasNormalizadas.has(normalizarValorCatalogo(fila.categoria))) {
    errores.push(`${prefijo}: categoría '${fila.categoria ?? ''}' no reconocida.`)
  }

  return { valida: errores.length === 0, errores }
}

export function normalizarCategoria(valor: string | null): 'Maestro BUAP' | 'Alumno BUAP' | 'Externo' {
  const clave = normalizarValorCatalogo(valor ?? '')
  if (clave === 'MAESTRO BUAP') return 'Maestro BUAP'
  if (clave === 'ALUMNO BUAP') return 'Alumno BUAP'
  if (clave === 'EXTERNO') return 'Externo'
  throw new Error(`La categoría "${valor ?? ''}" no está reconocida.`)
}