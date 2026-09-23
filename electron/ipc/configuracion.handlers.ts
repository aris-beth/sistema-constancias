import { dialog, ipcMain } from 'electron'
import {
  actualizarConfiguracionFirmantesGraduacion,
  obtenerConfiguracionFirmantesGraduacion,
} from '../db/repositories/configuracionFirmantesGraduacion.repository'
import {
  actualizarConfiguracionSello,
  obtenerConfiguracionSello,
} from '../db/repositories/configuracionSello.repository'
import { listarQrsCargados, registrarQr } from '../db/repositories/qrCatalogo.repository'
import type {
  ConfiguracionFirmantesGraduacionEntrada,
  ConfiguracionSelloEntrada,
  RegistrarQrEntrada,
} from '../../shared/types/ipc'

const filtroImagenes = [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]

export function registrarManejadoresConfiguracion(): void {
  ipcMain.handle('configuracion:obtener', () => ({
    sello: obtenerConfiguracionSello(),
    firmantesGraduacion: obtenerConfiguracionFirmantesGraduacion(),
    qrs: listarQrsCargados(),
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
  ipcMain.handle('configuracion:registrarQr', async (_evento, entrada: RegistrarQrEntrada) => {
    const folioEvento = entrada?.folioEvento?.trim()
    if (!folioEvento) throw new Error('El folio del evento es obligatorio para cargar un QR.')

    const seleccion = await dialog.showOpenDialog({
      title: 'Selecciona la imagen del código QR',
      properties: ['openFile'],
      filters: filtroImagenes,
    })
    if (seleccion.canceled || seleccion.filePaths.length === 0) return null

    return registrarQr({ folioEvento, rutaArchivo: seleccion.filePaths[0] })
  })
  ipcMain.handle('configuracion:listarQrs', () => listarQrsCargados())
}