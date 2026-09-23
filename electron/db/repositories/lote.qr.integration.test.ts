import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-qr-integration`

vi.mock('electron', () => ({
  app: {
    getPath: () => carpetaBaseDatos,
  },
}))

import type { FilaProcesada } from '../../../shared/types/ipc'
import { cerrarBaseDeDatos } from '../connection'
import { obtenerEventoPorFolio } from './evento.repository'
import { guardarLoteRegular } from './lote.repository'
import { registrarQr } from './qrCatalogo.repository'

const filaValida: FilaProcesada = {
  numeroFila: 2,
  nombreOriginal: 'JUAN PEREZ',
  nombreNormalizado: 'PEREZ JUAN',
  gradoDetectado: null,
  textoGenerado: 'Por asistir al evento Evento QR.',
  esPersonalizado: false,
  universidadExterna: null,
  confianza: 'alta',
  error: null,
  participaComo: 'Asistente',
  nombrePonencia: null,
  nombreEvento: 'Evento QR',
  fechaConstancia: '22 de Septiembre de 2026',
  universidadOrigen: 'BUAP',
  modalidad: 'Presencial CU',
  textoPersonalizado: null,
  categoria: 'Alumno BUAP',
}

describe('guardarLoteRegular y asociación de QR', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('asocia al evento el QR registrado previamente con el mismo folio', () => {
    registrarQr({ folioEvento: 'EVT-QR-001', rutaArchivo: 'C:/qrs/EVT-QR-001.png' })

    guardarLoteRegular('EVT-QR-001', [filaValida])

    expect(obtenerEventoPorFolio('EVT-QR-001')?.rutaQr).toBe('C:/qrs/EVT-QR-001.png')
  })
})
