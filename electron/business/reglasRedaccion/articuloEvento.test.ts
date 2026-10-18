import { describe, expect, it } from 'vitest'
import {
  articuloEventoPersistido,
  esArticuloEvento,
  esFormaEnEvento,
  formaPreposicionalEvento,
  inferirArticuloEvento,
} from './articuloEvento'

describe('inferirArticuloEvento', () => {
  it.each([
    ['5.º Taller de Experiencias en Ciencias de la Computación', 'del'],
    ['3.ª Jornada de Ciencias de la Computación', 'de la'],
    ['1.er Congreso Internacional', 'del'],
    ['Primera Semana de la Computación', 'de la'],
    ['Segundos Encuentros de Investigación', 'de los'],
    ['XII Congreso de Computación', 'del'],
    ['5 Taller de Robótica', 'del'],
    ['Hackathon BUAP 2026', 'del'],
    ['Feria de Posgrados', 'de la'],
    ['Talleres de verano', 'de los'],
    ['Jornadas académicas', 'de las'],
    ['“Taller de IA”', 'del'],
  ])('%s → %s', (nombre, esperado) => {
    expect(inferirArticuloEvento(nombre)).toBe(esperado)
  })

  it('el ordinal con género manda sobre la palabra siguiente', () => {
    expect(inferirArticuloEvento('3.ª Taller raro')).toBe('de la')
  })

  it.each(['', '   ', 'La Noche de los Investigadores', 'Zzz Foro', 'Maratón de programación', 'Ciberseguridad hoy'])(
    'no adivina: %j → null',
    (nombre) => {
      expect(inferirArticuloEvento(nombre)).toBeNull()
    },
  )

  it('null y undefined devuelven null', () => {
    expect(inferirArticuloEvento(null)).toBeNull()
    expect(inferirArticuloEvento(undefined)).toBeNull()
  })

  it('esArticuloEvento valida los cuatro valores', () => {
    expect(['del', 'de la', 'de los', 'de las', 'en el', 'en la'].every(esArticuloEvento)).toBe(true)
    expect(esArticuloEvento('el')).toBe(false)
    expect(esArticuloEvento(null)).toBe(false)
  })

  it('guarda en el/en la en su columna sin reemplazar el artículo tradicional', () => {
    expect(articuloEventoPersistido('en el')).toEqual({
      articuloEvento: 'del',
      formaArticuloEvento: 'en el',
    })
    expect(articuloEventoPersistido('en la')).toEqual({
      articuloEvento: 'de la',
      formaArticuloEvento: 'en la',
    })
    expect(articuloEventoPersistido('de los')).toEqual({
      articuloEvento: 'de los',
      formaArticuloEvento: null,
    })
    expect(esFormaEnEvento('en el')).toBe(true)
    expect(esFormaEnEvento('del')).toBe(false)
  })

  it.each([
    ['del', 'Congreso', 'en el Congreso'],
    ['en el', 'Congreso', 'en el Congreso'],
    ['de la', 'Jornada', 'en la Jornada'],
    ['en la', 'Jornada', 'en la Jornada'],
    ['de los', 'Talleres', 'en los Talleres'],
    ['de las', 'Jornadas', 'en las Jornadas'],
  ] as const)('convierte %s a la forma preposicional correcta', (articulo, evento, esperado) => {
    expect(formaPreposicionalEvento(articulo, evento)).toBe(esperado)
  })
})
