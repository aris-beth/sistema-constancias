import { describe, expect, it } from 'vitest'
import { construirMapaAbreviaturas } from './catalogos/abreviaturasAcademicas'
import { normalizarNombre } from './normalizarNombre'

const catalogo = construirMapaAbreviaturas()

describe('normalizarNombre', () => {
  it.each([
    ['DOCTOR/JUAN PEREZ', 'Dr. PEREZ JUAN'],
    ['dr. Juan Perez', 'Dr. PEREZ JUAN'],
  ])('normaliza %s', (entrada, esperado) => {
    const resultado = normalizarNombre(entrada, catalogo)

    expect(resultado.nombreNormalizado).toBe(esperado)
    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.confianza).toBe('alta')
  })

  it('quita ESTUDIANTE y reordena un nombre de dos tokens', () => {
    expect(normalizarNombre('ESTUDIANTE JUAN PEREZ', catalogo)).toEqual({
      nombreNormalizado: 'PEREZ JUAN',
      gradoDetectado: null,
      confianza: 'alta',
    })
  })

  it.each([
    ['JUAN PEREZ', 'PEREZ JUAN'],
    ['JUAN PEREZ LOPEZ', 'PEREZ LOPEZ JUAN'],
    ['JUAN CARLOS PEREZ LOPEZ', 'PEREZ LOPEZ JUAN CARLOS'],
    ['JUAN CARLOS MARIO PEREZ LOPEZ', 'PEREZ LOPEZ JUAN CARLOS MARIO'],
  ])('reordena exactamente un nombre de %s', (entrada, esperado) => {
    const resultado = normalizarNombre(entrada, catalogo)

    expect(resultado.nombreNormalizado).toBe(esperado)
    expect(resultado.confianza).toBe('alta')
  })

  it('marca confianza baja para seis o más tokens', () => {
    const resultado = normalizarNombre('JUAN CARLOS MARIO PEREZ LOPEZ GARCIA', catalogo)

    expect(resultado.nombreNormalizado).toBe('JUAN CARLOS MARIO PEREZ LOPEZ GARCIA')
    expect(resultado.confianza).toBe('baja')
  })

  it('normaliza cada persona de una constancia grupal', () => {
    const resultado = normalizarNombre('JUAN PEREZ, ANA LOPEZ', catalogo)

    expect(resultado.nombreNormalizado).toBe('PEREZ JUAN, LOPEZ ANA')
    expect(resultado.confianza).toBe('alta')
  })

  it('lanza error para un nombre vacío', () => {
    expect(() => normalizarNombre('   ', catalogo)).toThrow('nombre vacío')
  })

  it('marca confianza baja cuando hay dos grados coincidentes', () => {
    const resultado = normalizarNombre('DR DOCTOR JUAN PEREZ', catalogo)

    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.nombreNormalizado).toBe('Dr. PEREZ JUAN')
    expect(resultado.confianza).toBe('baja')
  })
})