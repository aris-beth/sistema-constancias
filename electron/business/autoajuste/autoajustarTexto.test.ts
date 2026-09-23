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
    [41, 14, 2],
    [80, 14, 2],
    [81, 11, 3],
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