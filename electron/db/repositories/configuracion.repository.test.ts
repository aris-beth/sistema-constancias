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
import { actualizarConfiguracionSello, obtenerConfiguracionSello } from './configuracionSello.repository'

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
      nombreDirectora: 'Nueva directora',
      nombreRectora: '',
      rutaSelloConFirma: 'C:/sello-con-firma.png',
      rutaSelloSinFirma: 'C:/sello-sin-firma.png',
    })

    expect(actualizado.nombreDirectora).toBe('Nueva directora')
    expect(actualizado.rutaSelloConFirma).toBe('C:/sello-con-firma.png')
    expect(actualizado.rutaSelloSinFirma).toBe('C:/sello-sin-firma.png')
    expect(obtenerBaseDeDatos().prepare('SELECT COUNT(*) AS total FROM configuracion_sello').get()).toEqual({ total: 1 })
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
