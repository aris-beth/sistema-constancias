import { describe, expect, it } from 'vitest'
import { separarParticipantes } from './separarParticipantes'

describe('separarParticipantes', () => {
  it('devuelve una persona sin coma', () => {
    expect(separarParticipantes('Juan Perez')).toEqual(['Juan Perez'])
  })

  it('separa varias personas por coma', () => {
    expect(separarParticipantes('Juan Perez,Ana Lopez,Luis Ruiz')).toEqual([
      'Juan Perez',
      'Ana Lopez',
      'Luis Ruiz',
    ])
  })

  it('recorta espacios extra y descarta segmentos vacíos', () => {
    expect(separarParticipantes('  Juan Perez  ,  , Ana Lopez , ')).toEqual([
      'Juan Perez',
      'Ana Lopez',
    ])
  })

  it('devuelve una lista vacía para una celda vacía', () => {
    expect(separarParticipantes('')).toEqual([])
  })
})