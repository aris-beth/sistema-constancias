import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, mostrarDialogo, mocks } = vi.hoisted(() => ({
  handlers: new Map<string, (...argumentos: any[]) => unknown>(),
  mostrarDialogo: vi.fn(),
  mocks: {
    obtenerConfiguracionSello: vi.fn(() => ({ nombreFirmante: 'Firma', cargoFirmante: 'Cargo', rutaImagenFirma: null, fechaActualizacion: '' })),
    obtenerConfiguracionFirmantesGraduacion: vi.fn(() => ({ rectorNombre: 'Rector', rectorCargo: 'Rectora', directorNombre: 'Director', directorCargo: 'Director', fechaActualizacion: '' })),
    actualizarConfiguracionSello: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    actualizarConfiguracionFirmantesGraduacion: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    listarFoliosCatalogo: vi.fn(() => []),
    registrarFolioCatalogo: vi.fn((entrada) => ({ id: 1, folio: entrada.folio, nombreReferencia: entrada.nombreReferencia, fechaRegistro: '' })),
    actualizarFolioCatalogo: vi.fn((id, entrada) => ({ id, folio: entrada.folio, nombreReferencia: entrada.nombreReferencia, fechaRegistro: '' })),
    eliminarFolioCatalogo: vi.fn(),
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
vi.mock('../db/repositories/folio.repository', () => ({
  listarFoliosCatalogo: mocks.listarFoliosCatalogo,
  registrarFolioCatalogo: mocks.registrarFolioCatalogo,
  actualizarFolioCatalogo: mocks.actualizarFolioCatalogo,
  eliminarFolioCatalogo: mocks.eliminarFolioCatalogo,
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

  it('registra y edita folios del catálogo', async () => {
    const registrado = await handlers.get('configuracion:registrarFolio')?.({}, { folio: 'EFAC-2026-001', nombreReferencia: 'Evento' })
    const editado = await handlers.get('configuracion:actualizarFolio')?.({}, { id: 1, folio: 'EFAC-2026-002', nombreReferencia: null })

    expect(mocks.registrarFolioCatalogo).toHaveBeenCalledWith({ folio: 'EFAC-2026-001', nombreReferencia: 'Evento' })
    expect(mocks.actualizarFolioCatalogo).toHaveBeenCalledWith(1, { folio: 'EFAC-2026-002', nombreReferencia: null })
    expect(registrado).toEqual(expect.objectContaining({ folio: 'EFAC-2026-001' }))
    expect(editado).toEqual(expect.objectContaining({ folio: 'EFAC-2026-002' }))
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
