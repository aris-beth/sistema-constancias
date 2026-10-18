import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaUserData = `${process.cwd()}/.tmp-configuracion-handlers-userdata`

const { handlers, mostrarDialogo, mocks } = vi.hoisted(() => ({
  handlers: new Map<string, (...argumentos: any[]) => unknown>(),
  mostrarDialogo: vi.fn(),
  mocks: {
    obtenerConfiguracionSello: vi.fn(() => ({ personaFirmante: 'Directora', cargoFirmante: 'Directora', rutaSelloConFirma: null, rutaSelloSinFirma: null, sellos: [], selloActivoId: null, fechaActualizacion: '' })),
    obtenerConfiguracionFirmantesGraduacion: vi.fn(() => ({ rectorNombre: 'Rector', rectorCargo: 'Rectora', directorNombre: 'Director', directorCargo: 'Director', fechaActualizacion: '' })),
    actualizarConfiguracionSello: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    agregarSello: vi.fn((nombre, rutaImagen, incluyeFirma) => ({ id: 3, nombre, rutaImagen, incluyeFirma, fechaActualizacion: '' })),
    obtenerSello: vi.fn((id) => ({ id, nombre: 'sello-original', rutaImagen: 'old.png', incluyeFirma: true, fechaActualizacion: '' })),
    reemplazarImagenSello: vi.fn((id, rutaImagen) => ({ id, nombre: 'sello-original', rutaImagen, incluyeFirma: true, fechaActualizacion: '' })),
    actualizarConfiguracionFirmantesGraduacion: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    obtenerConfiguracionReglas: vi.fn(() => ({ maxConstanciasPorPersona: 6, fechaActualizacion: '' })),
    actualizarConfiguracionReglas: vi.fn((entrada) => ({ ...entrada, fechaActualizacion: '' })),
    actualizarFolioDeEvento: vi.fn((id, folio) => ({ id, folio, nombreReferencia: 'Evento', fechaRegistro: '', origen: 'evento' })),
    listarFoliosCatalogo: vi.fn(() => []),
    registrarFolioCatalogo: vi.fn((entrada) => ({ id: 1, folio: entrada.folio, nombreReferencia: entrada.nombreReferencia, fechaRegistro: '' })),
    actualizarFolioCatalogo: vi.fn((id, entrada) => ({ id, folio: entrada.folio, nombreReferencia: entrada.nombreReferencia, fechaRegistro: '' })),
    eliminarFolioCatalogo: vi.fn((id, origen) => ({ id, origen })),
  },
}))

vi.mock('electron', () => ({
  app: { getPath: () => carpetaUserData },
  dialog: { showOpenDialog: mostrarDialogo },
  ipcMain: { handle: (canal: string, handler: (...argumentos: any[]) => unknown) => handlers.set(canal, handler) },
}))

vi.mock('../db/repositories/configuracionSello.repository', () => ({
  obtenerConfiguracionSello: mocks.obtenerConfiguracionSello,
  actualizarConfiguracionSello: mocks.actualizarConfiguracionSello,
  agregarSello: mocks.agregarSello,
  obtenerSello: mocks.obtenerSello,
  reemplazarImagenSello: mocks.reemplazarImagenSello,
}))
vi.mock('../db/repositories/configuracionFirmantesGraduacion.repository', () => ({
  obtenerConfiguracionFirmantesGraduacion: mocks.obtenerConfiguracionFirmantesGraduacion,
  actualizarConfiguracionFirmantesGraduacion: mocks.actualizarConfiguracionFirmantesGraduacion,
}))
vi.mock('../db/repositories/configuracionReglas.repository', () => ({
  obtenerConfiguracionReglas: mocks.obtenerConfiguracionReglas,
  actualizarConfiguracionReglas: mocks.actualizarConfiguracionReglas,
}))
vi.mock('../db/repositories/folio.repository', () => ({
  actualizarFolioDeEvento: mocks.actualizarFolioDeEvento,
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
    mocks.eliminarFolioCatalogo.mockClear()
    fs.rmSync(carpetaUserData, { recursive: true, force: true })
    registrarManejadoresConfiguracion()
  })

  afterEach(() => {
    fs.rmSync(carpetaUserData, { recursive: true, force: true })
  })

  it('agrega el sello al catálogo después de copiarlo al almacenamiento privado', async () => {
    const origen = path.join(os.tmpdir(), `sello-origen-${Date.now()}.png`)
    fs.writeFileSync(origen, 'contenido-de-prueba')
    mostrarDialogo.mockResolvedValue({ canceled: false, filePaths: [origen] })

    const selloNuevo = await handlers.get('configuracion:agregarSello')?.({}, { incluyeFirma: true }) as { rutaImagen: string }

    expect(mostrarDialogo).toHaveBeenCalledWith(expect.objectContaining({ filters: expect.any(Array) }))
    expect(path.dirname(selloNuevo.rutaImagen)).toBe(path.join(carpetaUserData, 'sellos'))
    expect(path.basename(selloNuevo.rutaImagen)).toMatch(/^sello-.+\.png$/)
    expect(fs.readFileSync(selloNuevo.rutaImagen, 'utf-8')).toBe('contenido-de-prueba')
    expect(mocks.agregarSello).toHaveBeenCalledWith(
      expect.stringContaining('sello-origen-'),
      selloNuevo.rutaImagen,
      true,
    )

    fs.unlinkSync(origen)
  })

  it('no copia nada si se cancela el diálogo', async () => {
    mostrarDialogo.mockResolvedValue({ canceled: true, filePaths: [] })
    const ruta = await handlers.get('configuracion:agregarSello')?.({}, { incluyeFirma: false })
    expect(ruta).toBeNull()
  })

  it('reemplaza la imagen de la opción elegida sin cambiar su tipo de firma', async () => {
    const origen = path.join(os.tmpdir(), `sello-reemplazo-${Date.now()}.png`)
    fs.writeFileSync(origen, 'imagen-nueva')
    mostrarDialogo.mockResolvedValue({ canceled: false, filePaths: [origen] })

    const actualizado = await handlers.get('configuracion:reemplazarSello')?.({}, 7) as { rutaImagen: string }

    expect(mocks.obtenerSello).toHaveBeenCalledWith(7)
    expect(mocks.reemplazarImagenSello).toHaveBeenCalledWith(7, actualizado.rutaImagen)
    expect(fs.readFileSync(actualizado.rutaImagen, 'utf-8')).toBe('imagen-nueva')
    fs.unlinkSync(origen)
  })

  it('registra y edita folios del catálogo', async () => {
    const registrado = await handlers.get('configuracion:registrarFolio')?.({}, { folio: 'EFAC-2026-001', nombreReferencia: 'Evento' })
    const editado = await handlers.get('configuracion:actualizarFolio')?.({}, { id: 1, folio: 'EFAC-2026-002', nombreReferencia: null })

    expect(mocks.registrarFolioCatalogo).toHaveBeenCalledWith({ folio: 'EFAC-2026-001', nombreReferencia: 'Evento' })
    expect(mocks.actualizarFolioCatalogo).toHaveBeenCalledWith(1, { folio: 'EFAC-2026-002', nombreReferencia: null })
    expect(registrado).toEqual(expect.objectContaining({ folio: 'EFAC-2026-001' }))
    expect(editado).toEqual(expect.objectContaining({ folio: 'EFAC-2026-002' }))
  })

  it('edita el folio de un evento (origen evento) sin tocar el catálogo', async () => {
    const editado = await handlers.get('configuracion:actualizarFolio')?.({}, { id: 7, origen: 'evento', folio: 'EFAC-2026-009', nombreReferencia: null })

    expect(mocks.actualizarFolioDeEvento).toHaveBeenCalledWith(7, 'EFAC-2026-009')
    expect(editado).toEqual(expect.objectContaining({ origen: 'evento', folio: 'EFAC-2026-009' }))
  })

  it('envía al repositorio el tipo de borrado según el origen del folio', () => {
    const eliminar = handlers.get('configuracion:eliminarFolio')

    eliminar?.({}, { id: 7, origen: 'evento' })
    expect(mocks.eliminarFolioCatalogo).toHaveBeenCalledWith(7, 'evento')

    mocks.eliminarFolioCatalogo.mockClear()
    eliminar?.({}, { id: 7, origen: 'catalogo' })
    expect(mocks.eliminarFolioCatalogo).toHaveBeenCalledWith(7, 'catalogo')
  })

  it('rechaza solicitudes de eliminación con identificador u origen inválido', () => {
    const eliminar = handlers.get('configuracion:eliminarFolio')

    expect(() => eliminar?.({}, { id: 0, origen: 'catalogo' })).toThrow(/identificador/i)
    expect(() => eliminar?.({}, { id: 7, origen: 'desconocido' })).toThrow(/origen/i)
    expect(mocks.eliminarFolioCatalogo).not.toHaveBeenCalled()
  })

  it('lee y actualiza el máximo de constancias por persona', async () => {
    const inicial = (await handlers.get('configuracion:obtener')?.({}, {})) as { reglas: unknown }
    const actualizado = await handlers.get('configuracion:actualizarReglas')?.({}, { maxConstanciasPorPersona: 8 })

    expect(inicial.reglas).toEqual(expect.objectContaining({ maxConstanciasPorPersona: 6 }))
    expect(mocks.actualizarConfiguracionReglas).toHaveBeenCalledWith({ maxConstanciasPorPersona: 8 })
    expect(actualizado).toEqual(expect.objectContaining({ maxConstanciasPorPersona: 8 }))
  })

  it('expone lectura y actualización de sello y firmantes', () => {
    const inicial = handlers.get('configuracion:obtener')?.({}, {})
    handlers.get('configuracion:actualizarSello')?.({}, { personaFirmante: 'Nueva directora', cargoFirmante: 'Directora', rutaSelloConFirma: null, rutaSelloSinFirma: null, selloActivoId: null })
    handlers.get('configuracion:actualizarFirmantesGraduacion')?.({}, { rectorNombre: 'R', rectorCargo: 'Rector', directorNombre: 'D', directorCargo: 'Director' })

    expect(inicial).toEqual(expect.objectContaining({ sello: expect.any(Object), firmantesGraduacion: expect.any(Object) }))
    expect(mocks.actualizarConfiguracionSello).toHaveBeenCalled()
    expect(mocks.actualizarConfiguracionFirmantesGraduacion).toHaveBeenCalled()
  })
})
