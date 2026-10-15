import { describe, expect, it } from 'vitest'
import { procesarFilaExcel } from './procesarFilaExcel'
import { ROLES_RECONOCIDOS } from './reglasRedaccion/generarTextoConstancia'
import type { FilaExcelCruda } from '../../shared/types/excel'

const filaBase: FilaExcelCruda = {
  numeroFila: 2,
  nombreCompleto: 'Juan Pérez',
  participaComo: 'Rol Que No Existe',
  nombrePonencia: null,
  nombreEvento: 'Coloquio de Investigación',
  fechaConstancia: '2026-09-19',
  universidadOrigen: 'BUAP',
  modalidad: 'Presencial CU',
  textoPersonalizado: 'Texto escrito para esta constancia.',
  categoria: 'Alumno BUAP',
}

describe('procesarFilaExcel', () => {
  it('procesa y conserva como rol separado uno desconocido con texto personalizado', () => {
    const resultado = procesarFilaExcel(filaBase, new Map(), ROLES_RECONOCIDOS)

    expect(resultado.error).toBeNull()
    expect(resultado.participaComo).toBe('Rol Que No Existe')
    expect(resultado.esPersonalizado).toBe(true)
    expect(resultado.textoGenerado).toBe('Texto escrito para esta constancia.')
    expect(resultado.participantes).toHaveLength(1)
  })

  it('sigue rechazando un rol desconocido cuando no hay texto personalizado', () => {
    const resultado = procesarFilaExcel(
      { ...filaBase, textoPersonalizado: null },
      new Map(),
      ROLES_RECONOCIDOS,
    )

    expect(resultado.error).toContain('no está en el catálogo')
    expect(resultado.participantes).toHaveLength(0)
  })

  it('normaliza cada nombre de la fila cuando los participantes están unidos por "y"', () => {
    const resultado = procesarFilaExcel(
      {
        ...filaBase,
        nombreCompleto: 'Juan Perez y Ana Lopez',
        participaComo: 'Asistente',
        textoPersonalizado: null,
      },
      new Map(),
      ROLES_RECONOCIDOS,
    )

    expect(resultado.error).toBeNull()
    expect(resultado.participantes.map((participante) => participante.nombreNormalizado)).toEqual([
      'PEREZ JUAN',
      'LOPEZ ANA',
    ])
  })
})
