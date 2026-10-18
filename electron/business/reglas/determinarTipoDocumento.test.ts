import { describe, expect, it } from 'vitest'
import { determinarTipoDocumento } from './determinarTipoDocumento'

describe('determinarTipoDocumento', () => {
  it('convierte conteo cero en la primera constancia', () => {
    expect(determinarTipoDocumento(0)).toEqual({
      tipoDocumento: 'constancia',
      numeroParaPersonaEvento: 1,
    })
  })

  it('convierte conteo cinco en la sexta constancia', () => {
    expect(determinarTipoDocumento(5)).toEqual({
      tipoDocumento: 'constancia',
      numeroParaPersonaEvento: 6,
    })
  })

  it('convierte conteo seis en el séptimo documento: reconocimiento', () => {
    expect(determinarTipoDocumento(6)).toEqual({
      tipoDocumento: 'reconocimiento',
      numeroParaPersonaEvento: 7,
    })
  })

  it('respeta un máximo configurado distinto: con máximo 3, la 4ª ya es reconocimiento', () => {
    expect(determinarTipoDocumento(2, 3).tipoDocumento).toBe('constancia')
    expect(determinarTipoDocumento(3, 3)).toEqual({
      tipoDocumento: 'reconocimiento',
      numeroParaPersonaEvento: 4,
    })
  })

  it.each([0, -1, 2.5, Number.NaN])('rechaza el máximo configurado inválido %s', (maximo) => {
    expect(() => determinarTipoDocumento(0, maximo)).toThrow()
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza el conteo inválido %s',
    (conteo) => {
      expect(() => determinarTipoDocumento(conteo)).toThrow()
    },
  )
})