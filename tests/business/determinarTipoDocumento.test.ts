import { describe, expect, it } from 'vitest'
import { determinarTipoDocumento } from '../../electron/business/reglas/determinarTipoDocumento'

describe('determinarTipoDocumento', () => {
  it('la 1ª constancia de una persona en un evento es "constancia"', () => {
    const resultado = determinarTipoDocumento(0)
    expect(resultado).toEqual({ tipoDocumento: 'constancia', numeroParaPersonaEvento: 1 })
  })

  it('la 6ª constancia todavía es "constancia"', () => {
    const resultado = determinarTipoDocumento(5)
    expect(resultado).toEqual({ tipoDocumento: 'constancia', numeroParaPersonaEvento: 6 })
  })

  it('caso de aceptación #4: la 7ª constancia de una persona en el evento es "reconocimiento"', () => {
    const resultado = determinarTipoDocumento(6)
    expect(resultado).toEqual({ tipoDocumento: 'reconocimiento', numeroParaPersonaEvento: 7 })
  })

  it('la 8ª, 9ª, etc. siguen siendo "reconocimiento"', () => {
    expect(determinarTipoDocumento(7).tipoDocumento).toBe('reconocimiento')
    expect(determinarTipoDocumento(20).tipoDocumento).toBe('reconocimiento')
  })

  it('rechaza un conteo negativo', () => {
    expect(() => determinarTipoDocumento(-1)).toThrow(/no puede ser negativo/)
  })

  it('rechaza un conteo no entero', () => {
    expect(() => determinarTipoDocumento(2.5)).toThrow(/entero/)
  })
})
