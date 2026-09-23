import type { FilaExcelCrudaGraduacion } from '../../../shared/types/excel'

export interface ResultadoValidacionFilaGraduacion {
  valida: boolean
  errores: string[]
}

function normalizarClave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function fechaValida(valor: string): boolean {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valor.trim())
  const latino = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(valor.trim())
  const anio = iso ? Number(iso[1]) : latino ? Number(latino[3]) : NaN
  const mes = iso ? Number(iso[2]) : latino ? Number(latino[2]) : NaN
  const dia = iso ? Number(iso[3]) : latino ? Number(latino[1]) : NaN
  if (![anio, mes, dia].every(Number.isInteger)) return false
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

export function validarFilaExcelGraduacion(
  fila: FilaExcelCrudaGraduacion,
  subtiposReconocidos: Iterable<string>,
): ResultadoValidacionFilaGraduacion {
  const errores: string[] = []
  const prefijo = `Fila ${fila.numeroFila}`
  if (!fila.nombreCompleto.trim()) errores.push(`${prefijo}: falta el nombre completo.`)
  if (!fila.subtipo.trim()) {
    errores.push(`${prefijo}: falta el subtipo de graduación.`)
  } else if (!new Set(Array.from(subtiposReconocidos, normalizarClave)).has(normalizarClave(fila.subtipo))) {
    errores.push(`${prefijo}: el subtipo '${fila.subtipo}' no está en el catálogo de graduación.`)
  }
  if (!fila.generacion.trim()) errores.push(`${prefijo}: falta la generación.`)
  if (!fila.carrera.trim()) errores.push(`${prefijo}: falta la carrera.`)
  if (!fechaValida(fila.fecha)) errores.push(`${prefijo}: la fecha de graduación no es válida.`)
  return { valida: errores.length === 0, errores }
}
