import { describe, expect, it } from 'vitest'
import { formatearFechaConstancia, validarFilaExcel } from './validarFilaExcel'
import type { FilaExcelCruda } from '../../../shared/types/excel'

const filaValida: FilaExcelCruda = {
  numeroFila: 15,
  nombreCompleto: 'Juan Perez',
  participaComo: 'Organizador',
  nombrePonencia: null,
  nombreEvento: 'Congreso de Computación',
  fechaConstancia: '2026-09-18',
  universidadOrigen: 'BUAP',
  modalidad: 'Presencial CU',
  textoPersonalizado: null,
  categoria: 'Maestro BUAP',
}

const roles = ['Organizador']

describe('validarFilaExcel', () => {
  it('acepta una fila 100% válida', () => {
    expect(validarFilaExcel(filaValida, roles)).toEqual({ valida: true, errores: [] })
  })

  it.each([
    ['nombre vacío', { nombreCompleto: '' }, 'falta el nombre completo.'],
    ['rol no reconocido', { participaComo: 'Invitado' }, "el rol 'Invitado' no está en el catálogo de roles reconocidos."],
    ['evento vacío', { nombreEvento: '' }, 'revisa el nombre del evento; no puede estar vacío ni entre comillas.'],
    ['evento entre comillas', { nombreEvento: '"Evento"' }, 'revisa el nombre del evento; no puede estar vacío ni entre comillas.'],
    ['fecha inválida', { fechaConstancia: '31/02/2026' }, 'la fecha de la constancia no es válida.'],
    ['modalidad no reconocida', { modalidad: 'Remota' }, "modalidad 'Remota' no reconocida."],
    ['categoría no reconocida', { categoria: 'Invitado' }, "categoría 'Invitado' no reconocida."],
  ])('reporta el error bloqueante de %s', (_caso, cambios, mensaje) => {
    const resultado = validarFilaExcel({ ...filaValida, ...cambios }, roles)

    expect(resultado.valida).toBe(false)
    expect(resultado.errores).toContain(`Fila 15: ${mensaje}`)
  })

  it('reporta los seis tipos de error bloqueante en una sola fila', () => {
    const resultado = validarFilaExcel(
      {
        ...filaValida,
        nombreCompleto: '',
        participaComo: 'Invitado',
        nombreEvento: '"Evento"',
        fechaConstancia: 'fecha inválida',
        modalidad: 'Remota',
        categoria: 'Otra categoría',
      },
      roles,
    )

    expect(resultado.valida).toBe(false)
    expect(resultado.errores).toHaveLength(6)
  })

  it.each([
    ['2026-09-18', '18 de Septiembre de 2026'],
    ['18/09/2026', '18 de Septiembre de 2026'],
  ])('formatea la fecha %s', (entrada, esperado) => {
    expect(formatearFechaConstancia(entrada)).toBe(esperado)
  })
})