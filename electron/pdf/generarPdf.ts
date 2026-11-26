import { app, BrowserWindow } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Evento } from '../../shared/types/evento'
import type { ConfiguracionFirmantesGraduacion, ConfiguracionSello } from '../../shared/types/configuracion'
import type {
  ErrorPdfRol,
  GenerarCorreccionesResultado,
  ResumenPdfRol,
} from '../../shared/types/ipc'
import { autoajustarTexto } from '../business/autoajuste/autoajustarTexto'
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

export interface DocumentoCorreccionPdf extends DatosDocumentoPdf {
  id: number
  rol: string
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
interface ResultadoImpresion {
  pdf: Buffer
  paginasDesbordadas: number[]
}

async function imprimirHtml(html: string): Promise<ResultadoImpresion> {
  const archivo = path.join(app.getPath('temp'), `constancias-${randomUUID()}.html`)
  await fs.writeFile(archivo, html, 'utf-8')
  const ventana = new BrowserWindow({ show: false })
  try {
    await ventana.loadFile(archivo)
    const paginasDesbordadas = await ventana.webContents.executeJavaScript<number[]>(`
      (async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return Array.from(document.querySelectorAll('.pagina')).flatMap((pagina, indice) => {
          const elementos = [
            pagina,
            pagina.querySelector('.col-der'),
            pagina.querySelector('.centro')
          ].filter(Boolean);
          return elementos.some((elemento) => elemento.scrollHeight > elemento.clientHeight + 1)
            ? [indice]
            : [];
        });
      })()
    `)
    const pdf = await ventana.webContents.printToPDF({
      pageSize: 'Letter',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
    })
    return { pdf, paginasDesbordadas }
  } finally {
    if (!ventana.isDestroyed()) ventana.destroy()
    await fs.rm(archivo, { force: true })
  }
}

function nombreSeguro(valor: string, respaldo: string): string {
  return valor.replace(/[^a-z0-9áéíóúñ]+/gi, '_').replace(/^_|_$/g, '') || respaldo
}

export function nombreCarpetaEvento(evento: Pick<Evento, 'folio' | 'nombreEvento'>): string {
  const folioSeguro = nombreSeguro(evento.folio, 'folio')
  const sufijoUnico = folioSeguro === evento.folio
    ? ''
    : `_${createHash('sha256').update(evento.folio).digest('hex').slice(0, 12)}`
  return `${folioSeguro}${sufijoUnico}_${nombreSeguro(evento.nombreEvento, 'evento')}`
}

export async function generarPdfsPorRol(
  evento: Evento,
  grupos: GrupoPdf[],
  carpetaDestino: string,
  sello: ConfiguracionSello,
  firmantes: ConfiguracionFirmantesGraduacion,
  numeroTanda?: number,
): Promise<ResultadoGeneracionPdfs> {
  if (!carpetaDestino.trim()) throw new Error('La carpeta de destino es obligatoria.')
  if (grupos.length === 0) throw new Error('El evento no tiene documentos para generar.')

  const esGraduacion = evento.tipoPlantilla === 'graduacion'
  const carpetaEvento = path.join(
    carpetaDestino,
    nombreCarpetaEvento(evento),
    ...(numeroTanda && numeroTanda > 1 ? [`Lote-${String(numeroTanda).padStart(4, '0')}`] : []),
  )
  const carpetaPdfs = path.join(carpetaEvento, 'PDFs')
  await fs.mkdir(carpetaPdfs, { recursive: true })

  const { recursos, advertencias } = await armarRecursos(
    carpetaResources(),
    esGraduacion ? null : sello,
  )

  const roles: ResumenPdfRol[] = []
  const errores: ErrorPdfRol[] = []
  for (const grupo of grupos) {
    try {
      const paginas = grupo.documentos.map((documento) =>
        esGraduacion ? crearPaginaGraduacion(documento, firmantes) : crearPaginaRegular(documento, sello, recursos),
      )
      const { pdf, paginasDesbordadas } = await imprimirHtml(
        crearHtmlDocumento(paginas, recursos),
      )
      const ruta = path.join(carpetaPdfs, `${nombreSeguro(grupo.nombreRol, 'sin_rol')}.pdf`)
      await fs.writeFile(ruta, pdf)
      roles.push({ rol: grupo.nombreRol, cantidad: grupo.documentos.length, ruta })
      for (const documento of grupo.documentos) {
        const camposAjustados = [
          { nombre: 'nombre', texto: documento.nombre },
          ...(!esGraduacion && documento.ponencia
            ? [{ nombre: 'ponencia', texto: documento.ponencia }]
            : []),
        ] as const
        for (const campo of camposAjustados) {
          if (autoajustarTexto(campo.texto, campo.nombre).excedeLimiteCalibrado) {
            const etiquetaCampo = campo.nombre === 'nombre' ? 'El nombre' : 'La ponencia'
            advertencias.push(
              `${etiquetaCampo} del documento con folio interno "${documento.folioInterno}" ` +
                `del rol "${grupo.nombreRol}" supera el rango calibrado; se aplicó el ajuste mínimo. ` +
                'Revisa visualmente el PDF antes de entregarlo.',
            )
          }
        }
      }
      for (const indice of paginasDesbordadas) {
        const documento = grupo.documentos[indice]
        if (!documento) continue
        advertencias.push(
          `El documento con folio interno "${documento.folioInterno}" del rol "${grupo.nombreRol}" ` +
            'desborda el espacio disponible y podría aparecer recortado. Revisa la extensión del texto.',
        )
      }
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

export async function generarPdfsCorrecciones(
  evento: Evento,
  documentos: DocumentoCorreccionPdf[],
  carpetaDestino: string,
  sello: ConfiguracionSello,
  firmantes: ConfiguracionFirmantesGraduacion,
): Promise<GenerarCorreccionesResultado> {
  if (!carpetaDestino.trim()) throw new Error('La carpeta de destino es obligatoria.')
  if (documentos.length === 0) throw new Error('Selecciona al menos una constancia para generar.')

  const carpetaCorrecciones = path.join(
    carpetaDestino,
    nombreCarpetaEvento(evento),
    'Correcciones',
  )
  await fs.mkdir(carpetaCorrecciones, { recursive: true })
  const esGraduacion = evento.tipoPlantilla === 'graduacion'
  const { recursos, advertencias } = await armarRecursos(
    carpetaResources(),
    esGraduacion ? null : sello,
  )
  const rutas: string[] = []
  const errores: Array<{ folioInterno: string; detalle: string }> = []
  const paginas: Array<{ documento: DocumentoCorreccionPdf; html: string }> = []

  for (const documento of documentos) {
    try {
      const html = esGraduacion
        ? crearPaginaGraduacion(documento, firmantes)
        : crearPaginaRegular(documento, sello, recursos)
      paginas.push({ documento, html })
    } catch (error) {
      errores.push({
        folioInterno: documento.folioInterno,
        detalle: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (paginas.length > 0) {
    try {
      const { pdf, paginasDesbordadas } = await imprimirHtml(
        crearHtmlDocumento(paginas.map((pagina) => pagina.html), recursos),
      )
      const ruta = path.join(carpetaCorrecciones, 'Correcciones.pdf')
      await fs.writeFile(ruta, pdf)
      rutas.push(ruta)
      for (const indice of paginasDesbordadas) {
        const pagina = paginas[indice]
        if (!pagina) continue
        advertencias.push(
          `La corrección del folio interno "${pagina.documento.folioInterno}" ` +
            `del rol "${pagina.documento.rol}" desborda el espacio disponible y podría aparecer recortada. ` +
            'Revisa el PDF.',
        )
      }
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error)
      errores.push(...paginas.map(({ documento }) => ({
        folioInterno: documento.folioInterno,
        detalle,
      })))
    }
  }

  return { carpetaCorrecciones, rutas, errores, advertencias }
}
