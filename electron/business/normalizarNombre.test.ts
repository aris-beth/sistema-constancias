import { describe, expect, it } from 'vitest'
import { construirMapaAbreviaturas } from './catalogos/abreviaturasAcademicas'
import { normalizarNombre } from './normalizarNombre'

const catalogo = construirMapaAbreviaturas()

describe('normalizarNombre', () => {
  it.each([
    ['DOCTOR/JUAN PEREZ', 'DR. PEREZ JUAN'],
    ['dr. Juan Perez', 'DR. PEREZ JUAN'],
  ])('normaliza %s', (entrada, esperado) => {
    const resultado = normalizarNombre(entrada, catalogo)

    expect(resultado.nombreNormalizado).toBe(esperado)
    expect(resultado.gradoDetectado).toBe('DR.')
    expect(resultado.confianza).toBe('alta')
  })

  it('quita ESTUDIANTE y reordena un nombre de dos tokens', () => {
    expect(normalizarNombre('ESTUDIANTE JUAN PEREZ', catalogo)).toEqual({
      nombreNormalizado: 'PEREZ JUAN',
      gradoDetectado: null,
      confianza: 'alta',
    })
  })

  it('normaliza el grado y dos apellidos sin volver a rotar el orden', () => {
    const resultado = normalizarNombre('Dra. Ivonne Balderas Gutierrez', catalogo)

    expect(resultado).toEqual({
      nombreNormalizado: 'DRA. BALDERAS GUTIERREZ IVONNE',
      gradoDetectado: 'DRA.',
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

  it('conserva "y" y normaliza cada nombre que conecta', () => {
    const resultado = normalizarNombre(
      'Juan Perez y Ana Lopez',
      catalogo,
    )

    expect(resultado.nombreNormalizado).toBe('PEREZ JUAN Y LOPEZ ANA')
    expect(resultado.confianza).toBe('alta')
  })

  it('conserva comas y "y" y normaliza todos los nombres de la lista', () => {
    const resultado = normalizarNombre(
      'Dra. Erika Beatriz Etcheverry Doger, Dra. Jennifer Antón Sarabia y Dra. Karla Marisol Teutli Mellado',
      catalogo,
    )

    expect(resultado.nombreNormalizado).toBe(
      'DRA. ETCHEVERRY DOGER ERIKA BEATRIZ, DRA. ANTON SARABIA JENNIFER Y DRA. TEUTLI MELLADO KARLA MARISOL',
    )
    expect(resultado.confianza).toBe('alta')
  })

  it('reemplaza guiones entre partes del nombre por espacios antes de normalizar', () => {
    const resultado = normalizarNombre('Juan Perez-Lopez', catalogo)

    expect(resultado.nombreNormalizado).toBe('PEREZ LOPEZ JUAN')
    expect(resultado.nombreNormalizado).not.toContain('-')
    expect(resultado.confianza).toBe('alta')
  })

  it('lanza error para un nombre vacío', () => {
    expect(() => normalizarNombre('   ', catalogo)).toThrow('nombre vacío')
  })

  it('marca confianza baja cuando hay dos grados coincidentes', () => {
    const resultado = normalizarNombre('DR DOCTOR JUAN PEREZ', catalogo)

    expect(resultado.gradoDetectado).toBe('DR.')
    expect(resultado.nombreNormalizado).toBe('DR. PEREZ JUAN')
    expect(resultado.confianza).toBe('baja')
  })
})