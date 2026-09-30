import { esUniversidadBUAP } from '../business/instituciones'

/**
 * Plantillas HTML/CSS de los documentos (sección 7 del TDD: "Diseño de
 * plantillas visuales"). Este módulo es PURO: no importa Electron ni toca el
 * disco, así que sirve igual para el PDF final (printToPDF) y para la
 * previsualización en pantalla, y se puede probar con vitest.
 *
 * Diseño (tomado de la plantilla institucional de Reconocimiento de
 * graduación, Requerimientos §6.5):
 *   - Columna izquierda con el logo BUAP, barra vertical azul y, a la
 *     derecha, todo el contenido centrado.
 *   - Tipografía Source Sans Pro y color #244061 en TODO el texto.
 *   - Página carta horizontal (11 x 8.5 in), definida en @page y en las
 *     opciones de printToPDF.
 *
 * Todas las imágenes (logo, firma, sello) y las fuentes se incrustan como
 * data URI dentro del <style>: así el HTML funciona igual cargado desde un
 * archivo temporal (PDF) o desde un iframe srcDoc (previsualización), sin
 * depender de rutas file:// ni de permisos del renderer.
 */
import { autoajustarTexto } from '../business/autoajuste/autoajustarTexto'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
} from '../../shared/types/configuracion'

export interface DatosDocumentoPdf {
  folioInterno: string
  encabezado: 'CONSTANCIA' | 'RECONOCIMIENTO'
  nombre: string
  institucion: string | null
  ponencia: string | null
  texto: string
  fecha: string
  /** Fragmentos del cuerpo que se imprimen en negritas (solo graduación). */
  resaltar?: string[]
  /** Fragmento antes del cual el cuerpo hace salto de línea (solo graduación). */
  saltoAntesDe?: string | null
}

export interface RecursosDocumento {
  /** Reglas @font-face con las fuentes incrustadas. */
  fuentesCss: string
  /** data URI del logo institucional (o null si no se encontró el archivo). */
  logo: string | null
  firma: string | null
  sello: string | null
}

export const RECURSOS_VACIOS: RecursosDocumento = {
  fuentesCss: '',
  logo: null,
  firma: null,
  sello: null,
}

const LEMA_INSTITUCIONAL = 'Pensar bien, para vivir mejor'

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * La plantilla oficial escribe el mes en minúscula ("17 de agosto"). El Excel
 * se formatea como "17 de Agosto de 2026"; aquí solo se ajusta la
 * presentación, sin tocar el dato guardado.
 */
export function formatearFechaParaDocumento(fecha: string): string {
  return fecha.replace(/^(\d{1,2}) de ([A-Za-zÁÉÍÓÚáéíóúñÑ]+)( de \d{4})$/, (_todo, dia, mes, resto) =>
    `${dia} de ${String(mes).toLocaleLowerCase('es-MX')}${resto}`,
  )
}

/**
 * En los reconocimientos de graduación el nombre se imprime en orden natural
 * ("Yuliset Sanzón Rosas"), como en la plantilla. Si el Excel lo trae todo en
 * mayúsculas o todo en minúsculas se pasa a formato título; si ya trae
 * mayúsculas y minúsculas mezcladas se respeta tal cual.
 */
export function formatearNombreGraduacion(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  const soloMayusculas = limpio === limpio.toLocaleUpperCase('es-MX')
  const soloMinusculas = limpio === limpio.toLocaleLowerCase('es-MX')
  if (!soloMayusculas && !soloMinusculas) return limpio

  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
  return limpio
    .toLocaleLowerCase('es-MX')
    .split(' ')
    .map((palabra, indice) =>
      indice > 0 && particulas.has(palabra)
        ? palabra
        : palabra.charAt(0).toLocaleUpperCase('es-MX') + palabra.slice(1),
    )
    .join(' ')
}

/**
 * La línea de institución solo se imprime para participantes externos
 * (requerimientos §5.5): con "BUAP" o vacío no se agrega.
 */
export function institucionParaDocumento(universidad: string | null | undefined): string | null {
  const texto = (universidad ?? '').trim()
  if (!texto) return null
  return esUniversidadBUAP(texto) ? null : texto
}

/** Fragmentos en negritas y salto de línea del cuerpo de graduación. */
export function opcionesCuerpoGraduacion(
  generacion: string | null,
  carrera: string | null,
): Pick<DatosDocumentoPdf, 'resaltar' | 'saltoAntesDe'> {
  const gen = (generacion ?? '').trim()
  const car = (carrera ?? '').trim()
  return {
    resaltar: [
      gen ? `Generación ${gen}` : '',
      gen,
      car,
      'Distinción al Mérito Académico',
    ].filter(Boolean),
    saltoAntesDe: car ? ` de la ${car}` : null,
  }
}

/** Escapa el cuerpo y envuelve en <b> los fragmentos indicados. */
export function resaltarFragmentos(texto: string, fragmentos: string[] | undefined): string {
  const escapado = escaparHtml(texto)
  const utiles = (fragmentos ?? [])
    .map((fragmento) => fragmento.trim())
    .filter((fragmento) => fragmento.length > 0)
    .map((fragmento) => escaparHtml(fragmento))
  if (utiles.length === 0) return escapado

  // El más largo primero: "Generación 2021-2026" gana sobre "2021-2026".
  const patron = new RegExp(
    [...new Set(utiles)]
      .sort((a, b) => b.length - a.length)
      .map(escaparRegex)
      .join('|'),
    'g',
  )
  return escapado.replace(patron, (coincidencia) => `<b>${coincidencia}</b>`)
}

function cuerpoHtml(documento: DatosDocumentoPdf): string {
  const salto = documento.saltoAntesDe?.trim()
  const indice = salto ? documento.texto.indexOf(salto) : -1
  if (salto && indice > 0) {
    const primera = documento.texto.slice(0, indice).trimEnd()
    const segunda = documento.texto.slice(indice).trimStart()
    return `${resaltarFragmentos(primera, documento.resaltar)}<br/>${resaltarFragmentos(segunda, documento.resaltar)}`
  }
  return resaltarFragmentos(documento.texto, documento.resaltar)
}

function destinatarioHtml(nombre: string, escala = 1): { html: string; tamanoPt: number } {
  const ajuste = autoajustarTexto(nombre, 'nombre')
  return {
    html: ajuste.lineas.map((linea) => escaparHtml(linea)).join('<br/>'),
    tamanoPt: Math.round(ajuste.tamanoFuentePt * escala * 10) / 10,
  }
}

/**
 * En la plantilla de graduación el nombre se imprime más grande que en la
 * regular (≈20.5 pt contra 16 pt, medido sobre la imagen de la plantilla). El
 * autoajuste sigue mandando: solo se escala su resultado.
 */
const ESCALA_NOMBRE_GRADUACION = 1.28

function encabezadoInstitucional(encabezado: string): string {
  return `<header class="encabezado-inst">
        <div class="universidad">La Benemérita Universidad Autónoma de Puebla</div>
        <div class="subtitulo">A través de la Facultad de Ciencias de la Computación</div>
        <div class="subtitulo otorga">otorga el presente</div>
        <div class="titulo-doc">${escaparHtml(encabezado)}</div>
      </header>`
}

export function crearPaginaRegular(documento: DatosDocumentoPdf, sello: ConfiguracionSello): string {
  const destinatario = destinatarioHtml(documento.nombre)
  const ajustePonencia = documento.ponencia ? autoajustarTexto(documento.ponencia, 'ponencia') : null
  // Cuando hay ponencia larga, el nivel menor entre nombre y ponencia evita
  // que ambos autoajustes compitan por el espacio de la página.
  const tamanoCuerpo = ajustePonencia
    ? Math.min(destinatario.tamanoPt, ajustePonencia.tamanoFuentePt, 12)
    : 12
  const nombreFirmante = sello.nombreFirmante ?? sello.nombreDirectora
  const cargoFirmante = sello.cargoFirmante ?? 'Directora'

  return `<section class="pagina">
    <div class="col-izq"><div class="logo"></div><div class="folio-bloque"><div class="folio">Folio: ${escaparHtml(documento.folioInterno)}</div></div></div>
    <div class="barra"></div>
    <div class="col-der">
      ${encabezadoInstitucional(documento.encabezado)}
      <main class="centro">
        <div class="bloque-texto">
          <div class="destinatario" style="font-size: ${destinatario.tamanoPt}pt"><span class="prefijo">A:</span> <strong>${destinatario.html}</strong></div>
          ${documento.institucion ? `<div class="institucion">${escaparHtml(documento.institucion)}</div>` : ''}
          <div class="cuerpo" style="font-size: ${tamanoCuerpo}pt">${cuerpoHtml(documento)}</div>
        </div>
        <div class="bloque-fecha">
          <div class="lema">“${LEMA_INSTITUCIONAL}”</div>
          <div class="fecha">Puebla de Z., a ${escaparHtml(formatearFechaParaDocumento(documento.fecha))}</div>
        </div>
      </main>
      <footer class="pie-regular">
        <div class="firma"><div class="firma-img"></div><strong>${escaparHtml(nombreFirmante)}</strong><span>${escaparHtml(cargoFirmante)}</span></div>
        <div class="sello"></div>
      </footer>
    </div>
  </section>`
}

export function crearPaginaGraduacion(
  documento: DatosDocumentoPdf,
  firmantes: ConfiguracionFirmantesGraduacion,
): string {
  const destinatario = destinatarioHtml(documento.nombre, ESCALA_NOMBRE_GRADUACION)

  return `<section class="pagina graduacion">
    <div class="col-izq"><div class="logo"></div></div>
    <div class="barra"></div>
    <div class="col-der">
      ${encabezadoInstitucional('RECONOCIMIENTO')}
      <main class="centro">
        <div class="bloque-texto">
          <div class="destinatario" style="font-size: ${destinatario.tamanoPt}pt"><span class="prefijo">A:</span> <strong>${destinatario.html}</strong></div>
          <div class="cuerpo">${cuerpoHtml(documento)}</div>
        </div>
        <div class="bloque-fecha">
          <div class="lema">“${LEMA_INSTITUCIONAL}”</div>
          <div class="fecha">Puebla de Z., a ${escaparHtml(formatearFechaParaDocumento(documento.fecha))}</div>
        </div>
      </main>
      <footer class="firmantes">
        <div class="firmante"><strong>${escaparHtml(firmantes.rectorNombre)}</strong><span>${escaparHtml(firmantes.rectorCargo)}</span></div>
        <div class="firmante"><strong>${escaparHtml(firmantes.directorNombre)}</strong><span>${escaparHtml(firmantes.directorCargo)}</span></div>
      </footer>
    </div>
  </section>`
}

function reglaImagen(selector: string, dataUri: string | null): string {
  return dataUri ? `${selector}{background-image:url("${dataUri}")}` : ''
}

export function crearHtmlDocumento(
  paginas: string[],
  recursos: RecursosDocumento,
  opciones: { previsualizacion?: boolean } = {},
): string {
  const previsualizacion = opciones.previsualizacion === true
  const estilosPreview = previsualizacion
    ? `html,body{overflow:hidden;background:#fff}
      .visor{position:absolute;left:0;top:0;width:11in;height:8.5in;transform-origin:0 0}`
    : ''
  const cuerpo = previsualizacion
    ? `<div class="visor">${paginas.join('')}</div>
      <script>
        (function () {
          function ajustar() {
            var visor = document.querySelector('.visor');
            if (!visor) return;
            var escala = Math.min(window.innerWidth / 1056, window.innerHeight / 816);
            visor.style.transform = 'scale(' + escala + ')';
          }
          window.addEventListener('resize', ajustar);
          ajustar();
        })();
      </script>`
    : paginas.join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <style>
      ${recursos.fuentesCss}
      @page { size: Letter landscape; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: 'Source Sans Pro', 'Source Sans 3', Arial, sans-serif; color: #244061; }
      .pagina { position: relative; width: 11in; height: 8.5in; overflow: hidden; background: #fff; break-after: page; page-break-after: always; }
      .pagina:last-child { break-after: auto; page-break-after: auto; }

      /* Columna del logo + barra vertical (medidas tomadas de la plantilla) */
      .col-izq { position: absolute; left: 0.2in; top: 1.17in; width: 2.5in; height: 6.18in; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
      .logo { width: 2.46in; aspect-ratio: 292 / 386; background-repeat: no-repeat; background-position: center; background-size: contain; }
      /* Folio en la parte baja de la columna izquierda. */
      .folio-bloque { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 100%; min-height: 1.05in; }
      .folio { font-size: 10pt; font-weight: 600; text-align: center; overflow-wrap: anywhere; }
      .barra { position: absolute; left: 2.82in; top: 1.17in; width: 0.055in; height: 6.18in; background: #244061; }

      /* Columna de contenido: todo centrado */
      .col-der { position: absolute; left: 3in; top: 1.17in; width: 6.95in; height: 6.18in; padding-top: 0.03in; display: flex; flex-direction: column; align-items: center; text-align: center; }
      .encabezado-inst { flex: 0 0 auto; }
      .universidad { font-size: 24pt; line-height: 1.15; white-space: nowrap; }
      .subtitulo { font-size: 15pt; line-height: 1.2; margin-top: 0.07in; }
      .subtitulo.otorga { font-size: 13pt; margin-top: 0.075in; }
      .titulo-doc { font-size: 40pt; font-weight: 900; letter-spacing: 4pt; line-height: 1.1; margin-top: 0.37in; padding-left: 4pt; }

      .centro { flex: 1 1 auto; min-height: 0; width: 100%; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; margin-top: 0.196in; }
      .bloque-texto { display: flex; flex-direction: column; align-items: center; width: 100%; }
      .destinatario { font-size: 16pt; line-height: 1.2; max-width: 6.7in; overflow-wrap: anywhere; }
      .destinatario .prefijo { font-weight: 400; }
      .destinatario strong { font-weight: 700; }
      .institucion { font-size: 13pt; margin-top: 0.06in; }
      .cuerpo { font-size: 12pt; line-height: 1.3; max-width: 6.5in; margin-top: 0.12in; overflow-wrap: anywhere; text-wrap: balance; }
      .cuerpo b { font-weight: 700; }
      .bloque-fecha { display: flex; flex-direction: column; align-items: center; margin-top: 0.25in; }
      .lema { font-size: 12pt; font-weight: 700; line-height: 1.45; }
      .fecha { font-size: 12pt; line-height: 1.45; }

      /* Pie: regular (firma + sello) */
      .pie-regular { flex: 0 0 auto; position: relative; width: 100%; height: 1.5in; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 0.2in; }
      .firma { display: flex; flex-direction: column; align-items: center; font-size: 12pt; line-height: 1.25; }
      .firma strong { font-weight: 700; }
      .firma-img { width: 2.2in; height: 0.7in; background-repeat: no-repeat; background-position: center bottom; background-size: contain; }
      .sello { position: absolute; right: 0; bottom: 0.1in; width: 1.3in; height: 1.3in; background-repeat: no-repeat; background-position: center; background-size: contain; }

      /* Pie: graduación (dos firmantes, alineados verticalmente) */
      .firmantes { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.56in; padding-bottom: 0.15in; }
      .firmante { display: flex; flex-direction: column; align-items: center; font-size: 12pt; line-height: 1.45; }
      .firmante strong { font-weight: 700; }

      /* Ajustes propios de la plantilla de graduación (medidos sobre la imagen de la plantilla) */
      .graduacion .cuerpo { font-size: 13.5pt; line-height: 1.3; margin-top: 0.065in; }

      ${reglaImagen('.logo', recursos.logo)}
      ${reglaImagen('.firma-img', recursos.firma)}
      ${reglaImagen('.sello', recursos.sello)}
      ${estilosPreview}
    </style></head><body>${cuerpo}</body></html>`
}
