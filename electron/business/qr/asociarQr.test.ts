import { describe, expect, it } from 'vitest'
import { asociarQr } from './asociarQr'
import type { QrCatalogoEntry } from '../../../shared/types/configuracion'

const qr: QrCatalogoEntry = {
  id: 1,
  folioEvento: 'EVT-001',
  rutaArchivo: 'C:/qrs/EVT-001.png',
  fechaCarga: '2026-09-22T00:00:00.000Z',
}

describe('asociarQr', () => {
  it('devuelve la ruta cuando el folio coincide exactamente', () => {
    expect(asociarQr('EVT-001', [qr])).toEqual({
      rutaQr: 'C:/qrs/EVT-001.png',
      pendienteDeQr: false,
    })
  })

  it('no hace coincidencias parciales ni por mayúsculas', () => {
    expect(asociarQr('EVT-001-extra', [qr])).toEqual({ rutaQr: null, pendienteDeQr: true })
    expect(asociarQr('evt-001', [qr])).toEqual({ rutaQr: null, pendienteDeQr: true })
  })

  it('marca pendiente cuando el catálogo está vacío', () => {
    expect(asociarQr('EVT-001', [])).toEqual({ rutaQr: null, pendienteDeQr: true })
  })
})