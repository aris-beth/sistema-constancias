import { app, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
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

/**
 * Copia la imagen elegida a una carpeta propia de la app (userData/sellos),
 * con un nombre fijo por "slot" (con-firma / sin-firma). Así la ruta que se
 * guarda en la base de datos ya no depende de que el archivo original (en
 * el escritorio, un pendrive, etc.) siga existiendo ahí después, y el
 * nombre del archivo nunca trae espacios ni acentos que puedan romper su
 * visualización en la app.
 */
function copiarImagenAAlmacenSello(rutaOrigen: string, slot: 'con-firma' | 'sin-firma'): string {
  const carpetaSellos = path.join(app.getPath('userData'), 'sellos')
  fs.mkdirSync(carpetaSellos, { recursive: true })
  const extension = path.extname(rutaOrigen).toLowerCase() || '.png'
  const rutaDestino = path.join(carpetaSellos, `${slot}${extension}`)
  fs.copyFileSync(rutaOrigen, rutaDestino)
  return rutaDestino
}

async function seleccionarYCopiarSello(
  titulo: string,
  slot: 'con-firma' | 'sin-firma',
): Promise<string | null> {
  const seleccion = await dialog.showOpenDialog({
    title: titulo,
    properties: ['openFile'],
    filters: filtroImagenes,
  })
  if (seleccion.canceled || seleccion.filePaths.length === 0) return null
  return copiarImagenAAlmacenSello(seleccion.filePaths[0], slot)
}

export function registrarManejadoresConfiguracion(): void {
  ipcMain.handle('configuracion:obtener', () => ({
    sello: obtenerConfiguracionSello(),
    firmantesGraduacion: obtenerConfiguracionFirmantesGraduacion(),
    folios: listarFoliosCatalogo(),
  }))

  ipcMain.handle('configuracion:seleccionarSelloConFirma', () =>
    seleccionarYCopiarSello('Selecciona el sello con la firma de la directora', 'con-firma'),
  )
  ipcMain.handle('configuracion:seleccionarSelloSinFirma', () =>
    seleccionarYCopiarSello('Selecciona el sello en blanco (sin firma)', 'sin-firma'),
  )

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
