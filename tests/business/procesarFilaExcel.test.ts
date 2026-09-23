import { describe, expect, it } from 'vitest'
import { procesarFilaExcel } from '../../electron/business/procesarFilaExcel'
import { ROLES_RECONOCIDOS } from '../../electron/business/reglasRedaccion/generarTextoConstancia'
import type { FilaExcelCruda } from '../../shared/types/excel'

function filaBase(overrides: Partial<FilaExcelCruda> = {}): FilaExcelCruda {
  return {
    numeroFila: 2,
    nombreCompleto: 'Juan Pérez',
    participaComo: 'Asistente',
    nombrePonencia: null,
    nombreEvento: 'Coloquio de Investigación',
    fechaConstancia: '2026-09-19',
    universidadOrigen: 'BUAP',
    modalidad: 'Presencial CU',
    textoPersonalizado: null,
    categoria: 'Alumno BUAP',
    ...overrides,
  }
}

const catalogoVacio = new Map<string, string>()

describe('procesarFilaExcel', () => {
  it('procesa correctamente una fila con un solo participante', () => {
    const resultado = procesarFilaExcel(filaBase(), catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultado.error).toBeNull()
    expect(resultado.participantes).toHaveLength(1)
    expect(resultado.participantes[0].nombreOriginal).toBe('Juan Pérez')
    expect(resultado.textoGenerado).toContain('Por asistir')
  })

  it('caso de aceptación #3: una fila con varios nombres separados por comas genera UNA constancia con varios participantes', () => {
    const fila = filaBase({
      nombreCompleto: 'Juan Pérez López, Ana García Ruiz, Luis Ramírez Torres',
      participaComo: 'Ganador sin ponencia',
      nombrePonencia: '1er',
    })

    const resultado = procesarFilaExcel(fila, catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultado.error).toBeNull()
    // Tres participantes, cada uno normalizado individualmente...
    expect(resultado.participantes).toHaveLength(3)
    expect(resultado.participantes.map((p) => p.nombreOriginal)).toEqual([
      'Juan Pérez López',
      'Ana García Ruiz',
      'Luis Ramírez Torres',
    ])
    // ...pero el texto de la constancia se genera UNA sola vez para el grupo.
    expect(resultado.textoGenerado).toContain('Por obtener el 1er')
  })

  it('cada participante del grupo se normaliza de forma independiente (apellido primero, mayúsculas)', () => {
    const fila = filaBase({ nombreCompleto: 'Juan Pérez, María López' })
    const resultado = procesarFilaExcel(fila, catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultado.participantes[0].nombreNormalizado).toBe('PEREZ JUAN')
    expect(resultado.participantes[1].nombreNormalizado).toBe('LOPEZ MARIA')
  })

  it('una fila con un rol no reconocido se reporta como error y no genera participantes', () => {
    const fila = filaBase({ participaComo: 'Rol Que No Existe' })
    const resultado = procesarFilaExcel(fila, catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultado.error).toMatch(/no está en el catálogo/)
    expect(resultado.participantes).toHaveLength(0)
    expect(resultado.textoGenerado).toBeNull()
  })

  it('caso de aceptación #8: un error en un solo participante de un grupo marca la fila entera como error, no bloquea el resto del lote', () => {
    // Fila con nombre válido para uno de los "participantes" pero con
    // categoría no reconocida a nivel de fila: falla la validación antes
    // de intentar normalizar a nadie.
    const filaConError = filaBase({ categoria: 'Categoría inventada' })
    const filaValida = filaBase({ numeroFila: 3 })

    const resultadoConError = procesarFilaExcel(filaConError, catalogoVacio, ROLES_RECONOCIDOS)
    const resultadoValido = procesarFilaExcel(filaValida, catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultadoConError.error).toMatch(/categoría/)
    expect(resultadoValido.error).toBeNull()
  })

  it('texto personalizado sustituye la generación automática incluso para una fila con varios participantes', () => {
    const fila = filaBase({
      nombreCompleto: 'Juan Pérez, Ana López',
      textoPersonalizado: 'Texto especial acordado con la coordinación.',
    })
    const resultado = procesarFilaExcel(fila, catalogoVacio, ROLES_RECONOCIDOS)

    expect(resultado.esPersonalizado).toBe(true)
    expect(resultado.textoGenerado).toBe('Texto especial acordado con la coordinación.')
    expect(resultado.participantes).toHaveLength(2)
  })
})
