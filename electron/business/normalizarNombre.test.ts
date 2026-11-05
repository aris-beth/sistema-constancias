import { describe, expect, it } from 'vitest'
import { construirMapaAbreviaturas } from './catalogos/abreviaturasAcademicas'
import { normalizarNombre } from './normalizarNombre'

const catalogo = construirMapaAbreviaturas()

describe('normalizarNombre', () => {
  it.each([
    ['DOCTOR/JUAN PEREZ', 'DR. JUAN PEREZ'],
    ['dr. Juan Perez', 'DR. JUAN PEREZ'],
  ])('normaliza %s', (entrada, esperado) => {
    const resultado = normalizarNombre(entrada, catalogo)

    expect(resultado.nombreNormalizado).toBe(esperado)
    expect(resultado.gradoDetectado).toBe('DR.')
    expect(resultado.confianza).toBe('alta')
  })

  it('quita ESTUDIANTE y conserva el orden original del nombre', () => {
    expect(normalizarNombre('ESTUDIANTE JUAN PEREZ', catalogo)).toEqual({
      nombreNormalizado: 'JUAN PEREZ',
      gradoDetectado: null,
      confianza: 'alta',
    })
  })

  it('normaliza el grado y conserva el orden original del nombre', () => {
    const resultado = normalizarNombre('Dra. Ivonne Balderas Gutierrez', catalogo)

    expect(resultado).toEqual({
      nombreNormalizado: 'DRA. IVONNE BALDERAS GUTIERREZ',
      gradoDetectado: 'DRA.',
      confianza: 'alta',
    })
  })

  it.each([
    ['JUAN PEREZ', 'JUAN PEREZ'],
    ['JUAN PEREZ LOPEZ', 'JUAN PEREZ LOPEZ'],
    ['JUAN CARLOS PEREZ LOPEZ', 'JUAN CARLOS PEREZ LOPEZ'],
    ['JUAN CARLOS MARIO PEREZ LOPEZ', 'JUAN CARLOS MARIO PEREZ LOPEZ'],
  ])('conserva el orden de las palabras de %s', (entrada, esperado) => {
    const resultado = normalizarNombre(entrada, catalogo)

    expect(resultado.nombreNormalizado).toBe(esperado)
    expect(resultado.confianza).toBe('alta')
  })

  it('mantiene alta confianza en nombres largos cuando no hay señales de ambigüedad', () => {
    const resultado = normalizarNombre('JUAN CARLOS MARIO PEREZ LOPEZ GARCIA', catalogo)

    expect(resultado.nombreNormalizado).toBe('JUAN CARLOS MARIO PEREZ LOPEZ GARCIA')
    expect(resultado.confianza).toBe('alta')
  })

  it('mantiene alta confianza en nombres con conectores de apellidos', () => {
    for (const nombre of ['JUAN DE PEREZ', 'JUAN DE LA TORRE', 'JUAN DEL TORO', 'JUAN DE LOS SANTOS', 'JUAN DE LAS NIEVES']) {
      expect(normalizarNombre(nombre, catalogo).confianza).toBe('alta')
    }
  })

  it('marca baja confianza para una sola palabra', () => {
    expect(normalizarNombre('Madonna', catalogo).confianza).toBe('baja')
  })

  it('normaliza cada persona de una constancia grupal', () => {
    const resultado = normalizarNombre('JUAN PEREZ, ANA LOPEZ', catalogo)

    expect(resultado.nombreNormalizado).toBe('JUAN PEREZ, ANA LOPEZ')
    expect(resultado.confianza).toBe('alta')
  })

  it('conserva "y" y normaliza cada nombre que conecta', () => {
    const resultado = normalizarNombre(
      'Juan Perez y Ana Lopez',
      catalogo,
    )

    expect(resultado.nombreNormalizado).toBe('JUAN PEREZ Y ANA LOPEZ')
    expect(resultado.confianza).toBe('baja')
  })

  it('conserva comas y "y" y normaliza todos los nombres de la lista', () => {
    const resultado = normalizarNombre(
      'Dra. Erika Beatriz Etcheverry Doger, Dra. Jennifer Antón Sarabia y Dra. Karla Marisol Teutli Mellado',
      catalogo,
    )

    expect(resultado.nombreNormalizado).toBe(
      'DRA. ERIKA BEATRIZ ETCHEVERRY DOGER, DRA. JENNIFER ANTON SARABIA Y DRA. KARLA MARISOL TEUTLI MELLADO',
    )
    expect(resultado.confianza).toBe('baja')
  })

  it.each([
    'JUAN PEREZ Y ANA LOPEZ',
  ])('marca baja confianza cuando el nombre contiene el conector ambiguo de %s', (entrada) => {
    expect(normalizarNombre(entrada, catalogo).confianza).toBe('baja')
  })

  it('marca baja confianza y conserva los puntos de una abreviatura desconocida', () => {
    const resultado = normalizarNombre('M.Ca Juan Perez', catalogo)

    expect(resultado.nombreNormalizado).toBe('M.CA JUAN PEREZ')
    expect(resultado.gradoDetectado).toBeNull()
    expect(resultado.confianza).toBe('baja')
  })

  it('acepta abreviaturas puntadas agregadas al catálogo', () => {
    const catalogoExtendido = construirMapaAbreviaturas([
      { formaEncontrada: 'M.Ca', abreviaturaAceptada: 'M.CA.' },
    ])
    const resultado = normalizarNombre('M.Ca Juan Perez', catalogoExtendido)

    expect(resultado.nombreNormalizado).toBe('M.CA. JUAN PEREZ')
    expect(resultado.gradoDetectado).toBe('M.CA.')
    expect(resultado.confianza).toBe('alta')
  })

  it('reconoce abreviaturas compuestas escritas con espacios', () => {
    const resultado = normalizarNombre('M. C. Juan Perez', catalogo)

    expect(resultado.nombreNormalizado).toBe('M.C. JUAN PEREZ')
    expect(resultado.gradoDetectado).toBe('M.C.')
    expect(resultado.confianza).toBe('alta')
  })

  it('no marca baja confianza por sílabas que solo contienen esos conectores', () => {
    expect(normalizarNombre('Juan Delgado Perez', catalogo).confianza).toBe('alta')
  })

  it('reemplaza guiones entre partes del nombre por espacios antes de normalizar', () => {
    const resultado = normalizarNombre('Juan Perez-Lopez', catalogo)

    expect(resultado.nombreNormalizado).toBe('JUAN PEREZ LOPEZ')
    expect(resultado.nombreNormalizado).not.toContain('-')
    expect(resultado.confianza).toBe('alta')
  })

  it('lanza error para un nombre vacío', () => {
    expect(() => normalizarNombre('   ', catalogo)).toThrow('nombre vacío')
  })

  it('marca confianza baja cuando hay dos grados coincidentes', () => {
    const resultado = normalizarNombre('DR DOCTOR JUAN PEREZ', catalogo)

    expect(resultado.gradoDetectado).toBe('DR.')
    expect(resultado.nombreNormalizado).toBe('DR. JUAN PEREZ')
    expect(resultado.confianza).toBe('baja')
  })
})