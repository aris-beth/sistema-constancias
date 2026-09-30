import type { FilaExcelCrudaGraduacion } from '../../../shared/types/excel'
import { tieneFechaConstanciaValida } from './validarFilaExcel'

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
  if (!tieneFechaConstanciaValida(fila.fecha)) {
    errores.push(`${prefijo}: la fecha de graduación no es válida.`)
  }
  return { valida: errores.length === 0, errores }
}
