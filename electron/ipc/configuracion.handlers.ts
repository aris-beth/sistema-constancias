import { app, dialog, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  actualizarConfiguracionFirmantesGraduacion,
  obtenerConfiguracionFirmantesGraduacion,
} from '../db/repositories/configuracionFirmantesGraduacion.repository'
import {
  agregarSello,
  actualizarConfiguracionSello,
  obtenerSello,
  obtenerConfiguracionSello,
  reemplazarImagenSello,
} from '../db/repositories/configuracionSello.repository'
import {
  actualizarConfiguracionReglas,
  obtenerConfiguracionReglas,
} from '../db/repositories/configuracionReglas.repository'
import {
  actualizarFolioCatalogo,
  actualizarFolioDeEvento,
  eliminarFolioCatalogo,
  listarFoliosCatalogo,
  registrarFolioCatalogo,
} from '../db/repositories/folio.repository'
import type { OpcionSello } from '../../shared/types/configuracion'
import type {
  ConfiguracionReglasEntrada,
  ConfiguracionFirmantesGraduacionEntrada,
  ConfiguracionSelloEntrada,
  SelloCatalogoEntrada,
  ActualizarFolioEntrada,
  EliminarFolioEntrada,
  RegistrarFolioEntrada,
} from '../../shared/types/ipc'

const filtroImagenes = [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]

/**
 * Copia la imagen elegida a una carpeta propia de la app (userData/sellos),
 * con un nombre único. Así la ruta que se
 * guarda en la base de datos ya no depende de que el archivo original (en
 * el escritorio, un pendrive, etc.) siga existiendo ahí después, y el
 * nombre del archivo nunca trae espacios ni acentos que puedan romper su
 * visualización en la app.
 */
function copiarImagenAAlmacenSello(rutaOrigen: string): string {
  const carpetaSellos = path.join(app.getPath('userData'), 'sellos')
  fs.mkdirSync(carpetaSellos, { recursive: true })
  const extension = path.extname(rutaOrigen).toLowerCase() || '.png'
  const rutaDestino = path.join(carpetaSellos, `sello-${randomUUID()}${extension}`)
  fs.copyFileSync(rutaOrigen, rutaDestino)
  return rutaDestino
}

async function seleccionarImagenSello(titulo: string): Promise<string | null> {
  const seleccion = await dialog.showOpenDialog({
    title: titulo,
    properties: ['openFile'],
    filters: filtroImagenes,
  })
  if (seleccion.canceled || seleccion.filePaths.length === 0) return null
  return seleccion.filePaths[0]
}

async function agregarSelloDesdeDialogo(entrada: SelloCatalogoEntrada): Promise<OpcionSello | null> {
  if (typeof entrada?.incluyeFirma !== 'boolean') {
    throw new Error('Indica si el sello ya incluye la firma.')
  }
  const rutaOrigen = await seleccionarImagenSello(
    entrada.incluyeFirma ? 'Selecciona un sello que ya incluye la firma' : 'Selecciona un sello en blanco',
  )
  if (!rutaOrigen) return null
  const rutaImagen = copiarImagenAAlmacenSello(rutaOrigen)
  const nombre = path.parse(path.basename(rutaOrigen)).name.trim() || 'Sello'
  return agregarSello(nombre, rutaImagen, entrada.incluyeFirma)
}

async function reemplazarSelloDesdeDialogo(id: number): Promise<OpcionSello | null> {
  const existente = obtenerSello(id)
  if (!existente) throw new Error('No se encontró el sello que se quiere reemplazar.')
  const rutaOrigen = await seleccionarImagenSello(
    existente.incluyeFirma ? 'Reemplaza la imagen del sello con firma' : 'Reemplaza la imagen del sello en blanco',
  )
  if (!rutaOrigen) return null
  const rutaImagen = copiarImagenAAlmacenSello(rutaOrigen)
  return reemplazarImagenSello(id, rutaImagen)
}

export function registrarManejadoresConfiguracion(): void {
  ipcMain.handle('configuracion:obtener', () => ({
    sello: obtenerConfiguracionSello(),
    firmantesGraduacion: obtenerConfiguracionFirmantesGraduacion(),
    folios: listarFoliosCatalogo(),
    reglas: obtenerConfiguracionReglas(),
  }))

  ipcMain.handle('configuracion:agregarSello', (_evento, entrada: SelloCatalogoEntrada) =>
    agregarSelloDesdeDialogo(entrada),
  )
  ipcMain.handle('configuracion:reemplazarSello', (_evento, id: number) =>
    reemplazarSelloDesdeDialogo(Number(id)),
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
  ipcMain.handle(
    'configuracion:actualizarReglas',
    (_evento, entrada: ConfiguracionReglasEntrada) =>
      actualizarConfiguracionReglas({ maxConstanciasPorPersona: Number(entrada?.maxConstanciasPorPersona) }),
  )
  ipcMain.handle('configuracion:listarFolios', () => listarFoliosCatalogo())
  ipcMain.handle('configuracion:registrarFolio', (_evento, entrada: RegistrarFolioEntrada) =>
    registrarFolioCatalogo({ folio: entrada?.folio ?? '', nombreReferencia: entrada?.nombreReferencia ?? null }),
  )
  ipcMain.handle('configuracion:actualizarFolio', (_evento, entrada: ActualizarFolioEntrada) =>
    entrada?.origen === 'evento'
      ? actualizarFolioDeEvento(entrada.id, entrada.folio ?? '')
      : actualizarFolioCatalogo(entrada?.id, { folio: entrada?.folio ?? '', nombreReferencia: entrada?.nombreReferencia ?? null }),
  )
  ipcMain.handle('configuracion:eliminarFolio', (_evento, entrada: EliminarFolioEntrada) => {
    if (!entrada || !Number.isInteger(entrada.id) || entrada.id < 1) {
      throw new Error('El identificador del folio no es válido.')
    }
    if (entrada.origen !== 'catalogo' && entrada.origen !== 'evento') {
      throw new Error('El origen del folio no es válido.')
    }
    eliminarFolioCatalogo(entrada.id, entrada.origen)
  })
}
