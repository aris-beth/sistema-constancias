import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-configuracion-integration`

vi.mock('electron', () => ({
  app: { getPath: () => carpetaBaseDatos },
}))

import { cerrarBaseDeDatos, obtenerBaseDeDatos } from '../connection'
import {
  actualizarConfiguracionFirmantesGraduacion,
  obtenerConfiguracionFirmantesGraduacion,
} from './configuracionFirmantesGraduacion.repository'
import {
  actualizarConfiguracionSello,
  agregarSello,
  obtenerConfiguracionSello,
} from './configuracionSello.repository'
import { actualizarConfiguracionReglas, obtenerConfiguracionReglas } from './configuracionReglas.repository'

describe('repositorios de configuración singleton', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('actualiza el sello sin crear otra fila', () => {
    const actualizado = actualizarConfiguracionSello({
      personaFirmante: 'Nueva directora',
      cargoFirmante: 'Directora',
      rutaSelloConFirma: 'C:/sello-con-firma.png',
      rutaSelloSinFirma: 'C:/sello-sin-firma.png',
    })

    expect(actualizado.personaFirmante).toBe('Nueva directora')
    expect(actualizado.cargoFirmante).toBe('Directora')
    expect(actualizado.rutaSelloConFirma).toBe('C:/sello-con-firma.png')
    expect(actualizado.rutaSelloSinFirma).toBe('C:/sello-sin-firma.png')
    expect(obtenerBaseDeDatos().prepare('SELECT COUNT(*) AS total FROM configuracion_sello').get()).toEqual({ total: 1 })
  })

  it('exige persona firmante solo si no hay sello con firma', () => {
    expect(() =>
      actualizarConfiguracionSello({
        personaFirmante: '',
        cargoFirmante: 'Directora',
        rutaSelloConFirma: null,
        rutaSelloSinFirma: 'C:/sello-sin-firma.png',
      }),
    ).toThrow(/persona firmante/i)

    expect(
      actualizarConfiguracionSello({
        personaFirmante: '',
        cargoFirmante: '',
        rutaSelloConFirma: 'C:/sello-con-firma.png',
        rutaSelloSinFirma: null,
      }).rutaSelloConFirma,
    ).toBe('C:/sello-con-firma.png')
  })

  it('conserva varios sellos y guarda cuál se usará en nuevas constancias', () => {
    const selloConFirma = agregarSello('Sello oficial 2026', 'C:/sello-oficial.png', true)
    const selloEnBlanco = agregarSello('Sello para firma manual', 'C:/sello-blanco.png', false)

    const actualizado = actualizarConfiguracionSello({
      personaFirmante: 'Nueva directora',
      cargoFirmante: 'Directora',
      rutaSelloConFirma: null,
      rutaSelloSinFirma: null,
      selloActivoId: selloEnBlanco.id,
    })

    expect(actualizado.sellos).toEqual([selloConFirma, selloEnBlanco])
    expect(actualizado.selloActivoId).toBe(selloEnBlanco.id)
    expect(actualizado.rutaSelloConFirma).toBeNull()
    expect(actualizado.rutaSelloSinFirma).toBe(selloEnBlanco.rutaImagen)
  })

  it('el máximo de constancias por persona arranca en 6 y es editable', () => {
    expect(obtenerConfiguracionReglas().maxConstanciasPorPersona).toBe(6)
    expect(actualizarConfiguracionReglas({ maxConstanciasPorPersona: 10 }).maxConstanciasPorPersona).toBe(10)
    expect(obtenerConfiguracionReglas().maxConstanciasPorPersona).toBe(10)
    expect(obtenerBaseDeDatos().prepare('SELECT COUNT(*) AS total FROM configuracion_reglas').get()).toEqual({ total: 1 })
  })

  it.each([0, -3, 2.5, 1000])('rechaza el máximo de constancias inválido %s', (valor) => {
    expect(() => actualizarConfiguracionReglas({ maxConstanciasPorPersona: valor })).toThrow()
  })

  it('actualiza los firmantes sin crear otra fila', () => {
    const actualizado = actualizarConfiguracionFirmantesGraduacion({
      rectorNombre: 'Rector nuevo',
      rectorCargo: 'Rectora',
      directorNombre: 'Director nuevo',
      directorCargo: 'Director',
    })

    expect(actualizado.directorNombre).toBe('Director nuevo')
    expect(obtenerConfiguracionFirmantesGraduacion().rectorNombre).toBe('Rector nuevo')
    expect(obtenerBaseDeDatos().prepare('SELECT COUNT(*) AS total FROM configuracion_firmantes_graduacion').get()).toEqual({ total: 1 })
  })

  it('expone las configuraciones iniciales creadas por el esquema', () => {
    expect(obtenerConfiguracionSello()).toBeDefined()
    expect(obtenerConfiguracionFirmantesGraduacion()).toBeDefined()
  })
})
