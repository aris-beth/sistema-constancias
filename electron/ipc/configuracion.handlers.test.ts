import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, mostrarDialogo, mocks } = vi.hoisted(() => ({
  handlers: new Map<string, (...argumentos: any[]) => unknown>(),
  mostrarDialogo: vi.fn(),
  mocks: {
    obtenerConfiguracionSello: vi.fn(() => ({ nombreFirmante: 'Firma', cargoFirmante: 'Cargo', rutaImagenFirma: null, fechaActualizacion: '' })),
    obtenerConfiguracionFirmantesGraduacion: vi.fn(() => ({ rectorNombre: 'Rector', rectorCargo: 'Rectora', directorNombre: 'Director', directorCargo: 'Director', fechaActualizacion: '' })),
    actualizarConfiguracionSello: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    actualizarConfiguracionFirmantesGraduacion: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    listarQrsCargados: vi.fn(() => []),
    registrarQr: vi.fn((entrada) => ({ id: 1, folioEvento: entrada.folioEvento, rutaArchivo: 'C:/qr.png', fechaCarga: '' })),
  },
}))

vi.mock('electron', () => ({
  dialog: { showOpenDialog: mostrarDialogo },
  ipcMain: { handle: (canal: string, handler: (...argumentos: any[]) => unknown) => handlers.set(canal, handler) },
}))

vi.mock('../db/repositories/configuracionSello.repository', () => ({
  obtenerConfiguracionSello: mocks.obtenerConfiguracionSello,
  actualizarConfiguracionSello: mocks.actualizarConfiguracionSello,
}))
vi.mock('../db/repositories/configuracionFirmantesGraduacion.repository', () => ({
  obtenerConfiguracionFirmantesGraduacion: mocks.obtenerConfiguracionFirmantesGraduacion,
  actualizarConfiguracionFirmantesGraduacion: mocks.actualizarConfiguracionFirmantesGraduacion,
}))
vi.mock('../db/repositories/qrCatalogo.repository', () => ({
  listarQrsCargados: mocks.listarQrsCargados,
  registrarQr: mocks.registrarQr,
}))

import { registrarManejadoresConfiguracion } from './configuracion.handlers'

describe('handlers de configuración', () => {
  beforeEach(() => {
    handlers.clear()
    mostrarDialogo.mockReset()
    registrarManejadoresConfiguracion()
  })

  it('usa el diálogo de imágenes para seleccionar la firma', async () => {
    mostrarDialogo.mockResolvedValue({ canceled: false, filePaths: ['C:/firma.png'] })

    const ruta = await handlers.get('configuracion:seleccionarFirma')?.({}, {})

    expect(ruta).toBe('C:/firma.png')
    expect(mostrarDialogo).toHaveBeenCalledWith(expect.objectContaining({ filters: expect.any(Array) }))
  })

  it('registra un QR después de seleccionar su imagen', async () => {
    mostrarDialogo.mockResolvedValue({ canceled: false, filePaths: ['C:/EVT-001.png'] })

    const resultado = await handlers.get('configuracion:registrarQr')?.({}, { folioEvento: 'EVT-001' })

    expect(mocks.registrarQr).toHaveBeenCalledWith({ folioEvento: 'EVT-001', rutaArchivo: 'C:/EVT-001.png' })
    expect(resultado).toEqual(expect.objectContaining({ folioEvento: 'EVT-001' }))
  })

  it('expone lectura y actualización de sello y firmantes', () => {
    const inicial = handlers.get('configuracion:obtener')?.({}, {})
    handlers.get('configuracion:actualizarSello')?.({}, { nombreFirmante: 'Nueva firma', cargoFirmante: 'Directora', rutaImagenFirma: null })
    handlers.get('configuracion:actualizarFirmantesGraduacion')?.({}, { rectorNombre: 'R', rectorCargo: 'Rector', directorNombre: 'D', directorCargo: 'Director' })

    expect(inicial).toEqual(expect.objectContaining({ sello: expect.any(Object), firmantesGraduacion: expect.any(Object) }))
    expect(mocks.actualizarConfiguracionSello).toHaveBeenCalled()
    expect(mocks.actualizarConfiguracionFirmantesGraduacion).toHaveBeenCalled()
  })
})
