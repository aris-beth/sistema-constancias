import { dialog, ipcMain } from 'electron'
import {
  actualizarConfiguracionFirmantesGraduacion,
  obtenerConfiguracionFirmantesGraduacion,
} from '../db/repositories/configuracionFirmantesGraduacion.repository'
import {
  actualizarConfiguracionSello,
  obtenerConfiguracionSello,
} from '../db/repositories/configuracionSello.repository'
import {
  actualizarFolioCatalogo,
  eliminarFolioCatalogo,
  listarFoliosCatalogo,
  registrarFolioCatalogo,
} from '../db/repositories/folio.repository'
import type {
  ConfiguracionFirmantesGraduacionEntrada,
  ConfiguracionSelloEntrada,
  ActualizarFolioEntrada,
  RegistrarFolioEntrada,
} from '../../shared/types/ipc'

const filtroImagenes = [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]

export function registrarManejadoresConfiguracion(): void {
  ipcMain.handle('configuracion:obtener', () => ({
    sello: obtenerConfiguracionSello(),
    firmantesGraduacion: obtenerConfiguracionFirmantesGraduacion(),
    folios: listarFoliosCatalogo(),
  }))

  ipcMain.handle('configuracion:seleccionarFirma', async () => {
    const seleccion = await dialog.showOpenDialog({
      title: 'Selecciona la imagen de la firma',
      properties: ['openFile'],
      filters: filtroImagenes,
    })
    return seleccion.canceled || seleccion.filePaths.length === 0 ? null : seleccion.filePaths[0]
  })
  ipcMain.handle('configuracion:seleccionarSello', async () => {
    const seleccion = await dialog.showOpenDialog({
      title: 'Selecciona la imagen del sello',
      properties: ['openFile'],
      filters: filtroImagenes,
    })
    return seleccion.canceled || seleccion.filePaths.length === 0 ? null : seleccion.filePaths[0]
  })

  ipcMain.handle(
    'configuracion:actualizarSello',
    (_evento, entrada: ConfiguracionSelloEntrada) => actualizarConfiguracionSello(entrada),
  )
  ipcMain.handle(
    'configuracion:actualizarFirmantesGraduacion',
    (_evento, entrada: ConfiguracionFirmantesGraduacionEntrada) =>
      actualizarConfiguracionFirmantesGraduacion(entrada),
  )
  ipcMain.handle('configuracion:listarFolios', () => listarFoliosCatalogo())
  ipcMain.handle('configuracion:registrarFolio', (_evento, entrada: RegistrarFolioEntrada) =>
    registrarFolioCatalogo({ folio: entrada?.folio ?? '', nombreReferencia: entrada?.nombreReferencia ?? null }),
  )
  ipcMain.handle('configuracion:actualizarFolio', (_evento, entrada: ActualizarFolioEntrada) =>
    actualizarFolioCatalogo(entrada?.id, { folio: entrada?.folio ?? '', nombreReferencia: entrada?.nombreReferencia ?? null }),
  )
  ipcMain.handle('configuracion:eliminarFolio', (_evento, id: number) => eliminarFolioCatalogo(id))
}
