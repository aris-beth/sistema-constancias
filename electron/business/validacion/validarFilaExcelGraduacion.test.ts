import { describe, expect, it } from 'vitest'
import { validarFilaExcelGraduacion } from './validarFilaExcelGraduacion'
import type { FilaExcelCrudaGraduacion } from '../../../shared/types/excel'

const filaValida: FilaExcelCrudaGraduacion = {
  numeroFila: 8,
  nombreCompleto: 'Ana Lopez',
  subtipo: 'Licenciatura',
  generacion: '2022-2026',
  carrera: 'Ingeniería en Computación',
  fecha: '2026-06-30',
}

describe('validarFilaExcelGraduacion', () => {
  it('acepta una fila de graduación válida', () => {
    expect(validarFilaExcelGraduacion(filaValida, ['Licenciatura'])).toEqual({
      valida: true,
      errores: [],
    })
  })

  it.each([
    ['nombre', { nombreCompleto: '' }, 'falta el nombre completo.'],
    ['subtipo', { subtipo: 'Diplomado' }, "el subtipo 'Diplomado' no está en el catálogo de graduación."],
    ['generación', { generacion: '' }, 'falta la generación.'],
    ['carrera', { carrera: '' }, 'falta la carrera.'],
    ['fecha', { fecha: '31/02/2026' }, 'la fecha de graduación no es válida.'],
  ])('reporta el error de %s', (_caso, cambios, mensaje) => {
    const resultado = validarFilaExcelGraduacion({ ...filaValida, ...cambios }, ['Licenciatura'])

    expect(resultado.valida).toBe(false)
    expect(resultado.errores).toContain(`Fila 8: ${mensaje}`)
  })

  it('reporta los cinco errores de graduación a la vez', () => {
    const resultado = validarFilaExcelGraduacion(
      { ...filaValida, nombreCompleto: '', subtipo: '', generacion: '', carrera: '', fecha: 'fecha' },
      ['Licenciatura'],
    )

    expect(resultado.valida).toBe(false)
    expect(resultado.errores).toHaveLength(5)
  })
})