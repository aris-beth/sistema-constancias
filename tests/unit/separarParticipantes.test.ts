import { describe, expect, it } from 'vitest'
import { separarParticipantes } from '../../electron/business/separarParticipantes'

describe('separarParticipantes', () => {
  it('devuelve un solo nombre cuando no hay coma ni "y"', () => {
    expect(separarParticipantes('Juan Perez')).toEqual(['Juan Perez'])
  })

  it('separa por comas', () => {
    expect(separarParticipantes('Juan Perez, Ana Lopez, Luis Ruiz')).toEqual([
      'Juan Perez',
      'Ana Lopez',
      'Luis Ruiz',
    ])
  })

  it('conserva la conjunción "y" porque no es un separador de grupo', () => {
    expect(separarParticipantes('Juan Perez y Ana Lopez')).toEqual(['Juan Perez y Ana Lopez'])
  })

  it('separa únicamente los nombres delimitados por comas', () => {
    expect(separarParticipantes('Juan Perez, Ana Lopez y Luis Ruiz')).toEqual([
      'Juan Perez',
      'Ana Lopez y Luis Ruiz',
    ])
  })

  it('ignora espacios de sobra alrededor de las comas', () => {
    expect(separarParticipantes('Juan Perez ,  Ana Lopez')).toEqual(['Juan Perez', 'Ana Lopez'])
  })
})
