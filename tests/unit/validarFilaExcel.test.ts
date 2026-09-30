import { describe, expect, it } from 'vitest'
import {
  formatearFechaConstancia,
  normalizarCategoria,
  validarFilaExcel,
} from '../../electron/business/validacion/validarFilaExcel'
import type { FilaExcelCruda } from '../../shared/types/excel'

const filaBase: FilaExcelCruda = {
  numeroFila: 2,
  nombreCompleto: 'JUAN PEREZ',
  participaComo: 'Organizador',
  nombrePonencia: null,
  nombreEvento: 'Congreso de Computación',
  fechaConstancia: '2026-09-18',
  universidadOrigen: 'BUAP',
  modalidad: 'Presencial CU',
  textoPersonalizado: null,
  categoria: 'Maestro BUAP',
}

describe('validarFilaExcel', () => {
  it('convierte categorías válidas a su forma canónica para SQLite', () => {
    expect(normalizarCategoria('maestro buap')).toBe('Maestro BUAP')
    expect(normalizarCategoria('ALUMNO BUAP')).toBe('Alumno BUAP')
    expect(normalizarCategoria('Externo')).toBe('Externo')
  })

  it('formatea la fecha para mostrarla en español', () => {
    expect(formatearFechaConstancia('2025-12-10')).toBe('10 de Diciembre de 2025')
    expect(formatearFechaConstancia('10/12/2025')).toBe('10 de Diciembre de 2025')
  })

  it('acepta una fila completa con un rol reconocido', () => {
    expect(validarFilaExcel(filaBase, ['Organizador'])).toEqual({ valida: true, errores: [] })
  })

  it('reporta todos los errores de una fila sin detener la validación', () => {
    const resultado = validarFilaExcel(
      {
        ...filaBase,
        nombreCompleto: '',
        participaComo: 'Desconocido',
        nombreEvento: '"Evento inválido"',
        fechaConstancia: 'fecha inválida',
        modalidad: 'Remota',
        categoria: 'Invitado',
      },
      ['Organizador'],
    )

    expect(resultado.valida).toBe(false)
    expect(resultado.errores).toHaveLength(6)
  })

  it('compara roles ignorando mayúsculas y acentos', () => {
    expect(validarFilaExcel({ ...filaBase, participaComo: 'organizador' }, ['Organizador'])).toEqual({
      valida: true,
      errores: [],
    })
  })

  it('compara también modalidad y categoría sin distinguir mayúsculas', () => {
    expect(
      validarFilaExcel(
        { ...filaBase, participaComo: 'ORGANIZADORA', modalidad: 'presencial cu', categoria: 'maestro buap' },
        ['Organizadora'],
      ),
    ).toEqual({ valida: true, errores: [] })
  })

  it.each(['2026-09-18', '18/09/2026', '18-09-2026', '8/9/2026'])(
    'acepta la fecha en formato %s',
    (fechaConstancia) => {
      expect(validarFilaExcel({ ...filaBase, fechaConstancia }, ['Organizador'])).toEqual({
        valida: true,
        errores: [],
      })
    },
  )

  it('acepta la fecha en el formato español que se muestra en la tabla', () => {
    expect(
      validarFilaExcel(
        { ...filaBase, fechaConstancia: '18 de Septiembre de 2026' },
        ['Organizador'],
      ),
    ).toEqual({ valida: true, errores: [] })
  })

  it('acepta meses en minúsculas y con acentos al validar la fecha mostrada', () => {
    expect(
      validarFilaExcel(
        { ...filaBase, fechaConstancia: '10 de diciembre de 2025' },
        ['Organizador'],
      ),
    ).toEqual({ valida: true, errores: [] })
  })

  it('rechaza fechas imposibles aunque tengan apariencia válida', () => {
    const resultado = validarFilaExcel(
      { ...filaBase, fechaConstancia: '31/02/2026' },
      ['Organizador'],
    )
    expect(
      resultado.errores).toContain('Fila 2: la fecha de la constancia no es válida.')
  })  
})

