import { describe, expect, it } from 'vitest'
import { construirFolio, obtenerAnioFolio, obtenerInicialesFolio } from './generarFolio'

describe('obtenerInicialesFolio', () => {
  it('ignora palabras de relleno y completa con la última palabra', () => {
    expect(obtenerInicialesFolio('Evento de la Facultad')).toBe('EFAC')
  })
  it('usa solo las primeras 4 palabras significativas', () => {
    expect(obtenerInicialesFolio('Congreso Internacional de Ciencias de la Computación 2026')).toBe('CICC')
  })
  it('con 4 o más palabras solo toma iniciales', () => {
    expect(obtenerInicialesFolio('Taller Redes Neuronales Avanzadas')).toBe('TRNA')
  })
  it('quita acentos', () => {
    expect(obtenerInicialesFolio('Ética Óptica')).toBe('EOPT')
  })
  it('respalda con EVNT si no hay palabras', () => {
    expect(obtenerInicialesFolio('de la')).toBe('EVNT')
  })
})

describe('construirFolio', () => {
  it('arma iniciales-año-número', () => {
    expect(construirFolio('Evento de la Facultad', '17 de Agosto de 2026', 1)).toBe('EFAC-2026-001')
    expect(construirFolio('Evento de la Facultad', '17/08/2026', 12)).toBe('EFAC-2026-012')
  })
  it('rechaza números inválidos y fechas sin año', () => {
    expect(() => construirFolio('X', '17 de Agosto de 2026', 0)).toThrow()
    expect(() => obtenerAnioFolio('sin año')).toThrow()
  })
})
