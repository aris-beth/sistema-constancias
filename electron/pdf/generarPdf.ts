import { BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { autoajustarTexto } from '../business/autoajuste/autoajustarTexto'
import type { Evento } from '../../shared/types/evento'
import type { ConfiguracionFirmantesGraduacion, ConfiguracionSello } from '../../shared/types/configuracion'

export interface DatosDocumentoPdf {
  folioInterno: string
  encabezado: 'CONSTANCIA' | 'RECONOCIMIENTO'
  nombre: string
  institucion: string | null
  ponencia: string | null
  texto: string
  fecha: string
}

export interface GrupoPdf {
  nombreRol: string
  documentos: DatosDocumentoPdf[]
}

function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function crearPaginaRegular(
  documento: DatosDocumentoPdf,
  sello: ConfiguracionSello,
  evento: Evento,
): string {
  const ajusteNombre = autoajustarTexto(documento.nombre, 'nombre')
  const nombreHtml = ajusteNombre.lineas.map((linea) => escaparHtml(linea)).join('<br/>')
  const ajustePonencia = documento.ponencia
    ? autoajustarTexto(documento.ponencia, 'ponencia')
    : null
  // El cuerpo conserva la oración completa; cuando hay ponencia, el menor
  // nivel entre nombre y ponencia evita que ambos autoajustes compitan en la página.
  const tamanoFuenteCuerpo = ajustePonencia
    ? Math.min(ajusteNombre.tamanoFuentePt, ajustePonencia.tamanoFuentePt)
    : 12

  return `<section class="pagina">
    <header>
      <div class="universidad">Benemérita Universidad Autónoma de Puebla</div>
      <div class="subtitulo">A través de la Facultad de Ciencias de la Computación</div>
      <div class="encabezado">${escaparHtml(documento.encabezado)}</div>
    </header>
    <main>
      <div class="destinatario" style="font-size: ${ajusteNombre.tamanoFuentePt}pt">A: ${nombreHtml}</div>
      ${documento.institucion ? `<div class="institucion">${escaparHtml(documento.institucion)}</div>` : ''}
      <div class="cuerpo" style="font-size: ${tamanoFuenteCuerpo}pt">${escaparHtml(documento.texto)}</div>
      <div class="fecha">Puebla de Z., a ${escaparHtml(documento.fecha)}</div>
    </main>
    <footer>
      <div class="qr">${evento.rutaQr ? `<img src="file://${escaparHtml(evento.rutaQr)}" alt="Código QR" />` : ''}</div>
      <div class="firma">${sello.rutaFirma ? `<img src="file://${escaparHtml(sello.rutaFirma)}" alt="Firma" />` : ''}
        <strong>${escaparHtml(sello.nombreDirectora || 'Directora pendiente')}</strong>
        <span>Directora de Facultad</span>
      </div>
      <div class="sello">${sello.rutaImagenSello ? `<img src="file://${escaparHtml(sello.rutaImagenSello)}" alt="Sello institucional" />` : ''}
        <strong>${escaparHtml(sello.nombreRectora || 'Rectora pendiente')}</strong>
        <span>Rectora</span>
      </div>
      <div class="metadatosPie"><div class="lema">Pensar bien, para vivir mejor</div><div class="folio">Folio: ${escaparHtml(documento.folioInterno)}</div></div>
    </footer>
  </section>`
}

export function crearPaginaGraduacion(documento: DatosDocumentoPdf, firmantes: ConfiguracionFirmantesGraduacion): string {
  const ajusteNombre = autoajustarTexto(documento.nombre, 'nombre')
  const nombreHtml = ajusteNombre.lineas.map((linea) => escaparHtml(linea)).join('<br/>')

  return `<section class="pagina graduacion">
    <header>
      <div class="universidad">Benemérita Universidad Autónoma de Puebla</div>
      <div class="subtitulo">Facultad de Ciencias de la Computación</div>
      <div class="encabezado">RECONOCIMIENTO</div>
    </header>
    <main>
      <div class="destinatario" style="font-size: ${ajusteNombre.tamanoFuentePt}pt">A: ${nombreHtml}</div>
      <div class="cuerpo">${escaparHtml(documento.texto)}</div>
      <div class="fecha">Puebla de Z., a ${escaparHtml(documento.fecha)}</div>
    </main>
    <footer class="firmantes">
      <div><strong>${escaparHtml(firmantes.rectorNombre)}</strong><span>${escaparHtml(firmantes.rectorCargo)}</span></div>
      <div><strong>${escaparHtml(firmantes.directorNombre)}</strong><span>${escaparHtml(firmantes.directorCargo)}</span></div>
    </footer>
  </section>`
}

function crearHtml(paginas: string[]): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <style>
      @page { size: Letter landscape; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Source Sans Pro', Arial, sans-serif; color: #244061; }
      .pagina { width: 11in; height: 8.5in; padding: 0.55in 0.75in; display: flex; flex-direction: column; text-align: center; page-break-after: always; }
      header { flex: 0 0 auto; }
      .universidad { font-size: 24pt; }
      .subtitulo { font-size: 15pt; margin-top: 0.12in; }
      .encabezado { font-size: 40pt; font-weight: 900; letter-spacing: 4pt; margin-top: 0.22in; }
      main { flex: 1; display: flex; flex-direction: column; align-items: center; min-height: 0; }
      .destinatario { font-size: 16pt; font-weight: 700; margin-top: 0.28in; max-width: 9.4in; overflow-wrap: anywhere; }
      .institucion { font-size: 13pt; margin-top: 0.12in; }
      .cuerpo { color: #222; font-size: 12pt; line-height: 1.35; max-width: 8.9in; margin: auto 0; overflow-wrap: anywhere; }
      .fecha { color: #222; font-size: 11pt; margin-top: 0.22in; }
      footer { min-height: 1.25in; display: grid; grid-template-columns: 0.8fr 1fr 1fr 1.2fr; align-items: end; color: #222; font-size: 10pt; }
      .firma, .sello, .firmantes > div { display: flex; flex-direction: column; align-items: center; gap: 0.04in; }
      .firma img { max-height: 0.65in; max-width: 2.2in; object-fit: contain; }
      .sello img { max-height: 0.72in; max-width: 1.35in; object-fit: contain; }
      .qr img { max-height: 0.85in; max-width: 0.85in; object-fit: contain; }
      .metadatosPie { display: flex; flex-direction: column; align-items: end; gap: 0.08in; }
      .lema { align-self: end; font-style: italic; }
      .folio { align-self: end; text-align: right; font-size: 8pt; }
      .firmantes { grid-template-columns: 1fr 1fr; padding: 0 1.8in; }
    </style></head><body>${paginas.join('')}</body></html>`
}

async function imprimirHtml(html: string): Promise<Buffer> {
  const ventana = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  try {
    await ventana.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return await ventana.webContents.printToPDF({
      pageSize: 'Letter',
      landscape: true,
      printBackground: true,
      margins: { marginType: 'none' },
    })
  } finally {
    if (!ventana.isDestroyed()) ventana.destroy()
  }
}

export async function generarPdfsPorRol(
  evento: Evento,
  grupos: GrupoPdf[],
  carpetaDestino: string,
  sello: ConfiguracionSello,
  firmantes: ConfiguracionFirmantesGraduacion,
): Promise<string[]> {
  if (!carpetaDestino.trim()) throw new Error('La carpeta de destino es obligatoria.')
  if (grupos.length === 0) throw new Error('El evento no tiene documentos para generar.')

  const carpetaEvento = path.join(carpetaDestino, `${evento.folio}_${evento.nombreEvento.replace(/[^a-z0-9]+/gi, '_')}`)
  const carpetaPdfs = path.join(carpetaEvento, 'PDFs')
  await fs.mkdir(carpetaPdfs, { recursive: true })
  const rutas: string[] = []
  for (const grupo of grupos) {
    const paginas = grupo.documentos.map((documento) =>
      evento.tipoPlantilla === 'graduacion'
        ? crearPaginaGraduacion(documento, firmantes)
        : crearPaginaRegular(documento, sello, evento),
    )
    const buffer = await imprimirHtml(crearHtml(paginas))
    const nombreRol = grupo.nombreRol.replace(/[^a-z0-9áéíóúñ]+/gi, '_').replace(/^_|_$/g, '') || 'sin_rol'
    const ruta = path.join(carpetaPdfs, `${nombreRol}.pdf`)
    await fs.writeFile(ruta, buffer)
    rutas.push(ruta)
  }
  return rutas
}