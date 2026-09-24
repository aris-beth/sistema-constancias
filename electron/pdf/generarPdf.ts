import { app, BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Evento } from '../../shared/types/evento'
import type { ConfiguracionFirmantesGraduacion, ConfiguracionSello } from '../../shared/types/configuracion'
import type { ErrorPdfRol, ResumenPdfRol } from '../../shared/types/ipc'
import {
  crearHtmlDocumento,
  crearPaginaGraduacion,
  crearPaginaRegular,
  type DatosDocumentoPdf,
} from './plantillaDocumento'
import { armarRecursos } from './recursos'

// Las plantillas viven en plantillaDocumento.ts (código puro, sin Electron).
export { crearPaginaGraduacion, crearPaginaRegular, type DatosDocumentoPdf } from './plantillaDocumento'

export interface GrupoPdf {
  nombreRol: string
  documentos: DatosDocumentoPdf[]
}

export interface ResultadoGeneracionPdfs {
  carpetaEvento: string
  roles: ResumenPdfRol[]
  errores: ErrorPdfRol[]
  advertencias: string[]
}

/** Carpeta `resources/` (fuentes y logo). Dentro del asar también se puede leer con fs. */
export function carpetaResources(): string {
  return path.join(app.getAppPath(), 'resources')
}

/**
 * El HTML se escribe en un archivo temporal y se carga con loadFile. Una URL
 * `data:` tiene un límite de tamaño (~2 MB en Chromium) que un lote grande
 * supera fácilmente, y desde ella no se pueden leer imágenes file://.
 */
async function imprimirHtml(html: string): Promise<Buffer> {
  const archivo = path.join(app.getPath('temp'), `constancias-${randomUUID()}.html`)
  await fs.writeFile(archivo, html, 'utf-8')
  const ventana = new BrowserWindow({ show: false })
  try {
    await ventana.loadFile(archivo)
    return await ventana.webContents.printToPDF({
      pageSize: 'Letter',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
    })
  } finally {
    if (!ventana.isDestroyed()) ventana.destroy()
    await fs.rm(archivo, { force: true })
  }
}

function nombreSeguro(valor: string, respaldo: string): string {
  return valor.replace(/[^a-z0-9áéíóúñ]+/gi, '_').replace(/^_|_$/g, '') || respaldo
}

export async function generarPdfsPorRol(
  evento: Evento,
  grupos: GrupoPdf[],
  carpetaDestino: string,
  sello: ConfiguracionSello,
  firmantes: ConfiguracionFirmantesGraduacion,
): Promise<ResultadoGeneracionPdfs> {
  if (!carpetaDestino.trim()) throw new Error('La carpeta de destino es obligatoria.')
  if (grupos.length === 0) throw new Error('El evento no tiene documentos para generar.')

  const esGraduacion = evento.tipoPlantilla === 'graduacion'
  const carpetaEvento = path.join(carpetaDestino, `${evento.folio}_${nombreSeguro(evento.nombreEvento, 'evento')}`)
  const carpetaPdfs = path.join(carpetaEvento, 'PDFs')
  await fs.mkdir(carpetaPdfs, { recursive: true })

  const { recursos, advertencias } = await armarRecursos(
    carpetaResources(),
    esGraduacion ? null : evento.rutaQr,
    esGraduacion ? null : sello,
  )

  const roles: ResumenPdfRol[] = []
  const errores: ErrorPdfRol[] = []
  for (const grupo of grupos) {
    try {
      const paginas = grupo.documentos.map((documento) =>
        esGraduacion ? crearPaginaGraduacion(documento, firmantes) : crearPaginaRegular(documento, sello),
      )
      const buffer = await imprimirHtml(crearHtmlDocumento(paginas, recursos))
      const ruta = path.join(carpetaPdfs, `${nombreSeguro(grupo.nombreRol, 'sin_rol')}.pdf`)
      await fs.writeFile(ruta, buffer)
      roles.push({ rol: grupo.nombreRol, cantidad: grupo.documentos.length, ruta })
    } catch (error) {
      errores.push({
        rol: grupo.nombreRol,
        cantidad: grupo.documentos.length,
        detalle: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return { carpetaEvento, roles, errores, advertencias }
}
