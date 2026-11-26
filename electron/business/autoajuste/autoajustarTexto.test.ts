import { describe, expect, it } from 'vitest'
import { autoajustarTexto } from './autoajustarTexto'

function textoDeLongitud(longitud: number): string {
  const cantidadDePalabras = Math.ceil(longitud / 2)
  const texto = Array.from({ length: cantidadDePalabras }, () => 'A').join(' ')
  return texto.length === longitud ? texto : `${texto}X`
}

describe('autoajustarTexto', () => {
  it.each([
    [39, 16, 1],
    [40, 16, 1],
    [42, 16, 1],
    [43, 14, 1],
    [60, 14, 1],
    [61, 12, 1],
    [78, 12, 1],
    [82, 11, 2],
    [83, 11, 2],
    [111, 11, 3],
  ])('usa el nivel exacto para un nombre de %s caracteres', (longitud, fuente, lineas) => {
    const resultado = autoajustarTexto(textoDeLongitud(longitud), 'nombre')

    expect(textoDeLongitud(longitud)).toHaveLength(longitud)
    expect(resultado.tamanoFuentePt).toBe(fuente)
    expect(resultado.lineas).toHaveLength(lineas)
    expect(resultado.excedeLimiteCalibrado).toBe(false)
  })

  it('mantiene dentro del nivel calibrado el nombre de equipo de 168 caracteres', () => {
    const resultado = autoajustarTexto(textoDeLongitud(168), 'nombre')

    expect(resultado.tamanoFuentePt).toBe(11)
    expect(resultado.lineas).toHaveLength(3)
    expect(resultado.excedeLimiteCalibrado).toBe(false)
  })

  it('mantiene en una sola línea un nombre de hasta 78 caracteres cuando cabe en la fuente reducida', () => {
    const nombres = [
      'Alejandra Montserrat Fernández',
      'Roberto Carlos Martínez',
      'Luis Pérez',
      'Eva Ruiz',
    ]
    const resultado = autoajustarTexto(nombres.join(', '), 'nombre')
    expect(resultado.lineas).toHaveLength(1)
    expect(resultado.tamanoFuentePt).toBe(12)
    expect(resultado.lineas.join(' ')).toBe(nombres.join(', '))
  })

  it('conserva comas y orden al repartir palabras de cinco nombres', () => {
    const nombres = [
      'Ana María Fernanda López Hernández',
      'Beto Cruz de la Fuente',
      'Carla Díaz del Río',
      'Diego Solís Martínez',
      'Elena Ruiz de los Santos',
    ]
    const resultado = autoajustarTexto(nombres.join(', '), 'nombre')
    const textoEsperado = nombres.join(', ')
    const anchos = resultado.lineas.map((linea) => linea.length)

    expect(resultado.lineas.length).toBeGreaterThan(1)
    expect(Math.max(...anchos) - Math.min(...anchos)).toBeLessThanOrEqual(4)
    expect(resultado.lineas.join(' ')).toBe(textoEsperado)
    expect(resultado.lineas.join(' ')).not.toContain('  ')
  })

  it('mantiene dentro del nivel calibrado una ponencia de 130 caracteres', () => {
    const resultado = autoajustarTexto(textoDeLongitud(130), 'ponencia')

    expect(resultado.tamanoFuentePt).toBe(11)
    expect(resultado.lineas).toHaveLength(3)
    expect(resultado.excedeLimiteCalibrado).toBe(false)
  })

  it.each([
    ['nombre', 169, 11],
    ['ponencia', 131, 11],
  ] as const)('marca excedido sin lanzar error para %s fuera del límite', (tipo, longitud, fuente) => {
    const resultado = autoajustarTexto(textoDeLongitud(longitud), tipo)

    expect(resultado.tamanoFuentePt).toBe(fuente)
    expect(resultado.excedeLimiteCalibrado).toBe(true)
  })
})