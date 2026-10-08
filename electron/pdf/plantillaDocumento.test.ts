import { describe, expect, it } from 'vitest'
import {
  crearHtmlDocumento,
  crearPaginaGraduacion,
  crearPaginaRegular,
  formatearFechaParaDocumento,
  formatearNombreGraduacion,
  institucionParaDocumento,
  opcionesCuerpoGraduacion,
  RECURSOS_VACIOS,
  resaltarFragmentos,
  type DatosDocumentoPdf,
} from './plantillaDocumento'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
} from '../../shared/types/configuracion'

const sello = {
  nombreDirectora: 'Firma de prueba',
  rutaSelloConFirma: null,
  rutaSelloSinFirma: null,
} as unknown as ConfiguracionSello

const firmantes = {
  rectorNombre: 'Rector de prueba',
  rectorCargo: 'Rector',
  directorNombre: 'Director de prueba',
  directorCargo: 'Director',
} as unknown as ConfiguracionFirmantesGraduacion

function textoDeLongitud(longitud: number): string {
  const cantidadDePalabras = Math.ceil(longitud / 2)
  const texto = Array.from({ length: cantidadDePalabras }, () => 'A').join(' ')
  return texto.length === longitud ? texto : `${texto}X`
}

function documento(overrides: Partial<DatosDocumentoPdf> = {}): DatosDocumentoPdf {
  return {
    folioInterno: 'FOL-001',
    encabezado: 'CONSTANCIA',
    nombre: 'PEREZ JUAN',
    institucion: null,
    ponencia: null,
    texto: 'Por participar en el evento de prueba.',
    fecha: '22 de Septiembre de 2026',
    ...overrides,
  }
}

describe('plantillaDocumento', () => {
  it('aplica autoajuste y saltos de línea a un nombre de 168 caracteres', () => {
    const html = crearPaginaRegular(documento({ nombre: textoDeLongitud(168) }), sello, RECURSOS_VACIOS)

    expect(html).toContain('<br/>')
    expect(html).toContain('class="destinatario" style="font-size: 11pt"')
  })

  it('escala el nombre de graduación respecto al autoajuste (plantilla más grande)', () => {
    const corto = crearPaginaGraduacion(documento({ nombre: 'Yuliset Sanzón Rosas' }), firmantes)
    expect(corto).toContain('style="font-size: 20.5pt"')

    const largo = crearPaginaGraduacion(documento({ nombre: textoDeLongitud(168) }), firmantes)
    expect(largo).toContain('<br/>')
    expect(largo).toContain('style="font-size: 14.1pt"')
  })

  it('reduce el cuerpo cuando la ponencia requiere un nivel menor', () => {
    const html = crearPaginaRegular(documento({ ponencia: textoDeLongitud(130) }), sello, RECURSOS_VACIOS)
    expect(html).toContain('class="cuerpo" style="font-size: 11pt"')
  })

  it('la constancia regular imprime el nombre solo si no hay sello con firma horneada', () => {
    const sinFirma = crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)
    expect(sinFirma).toContain('Firma de prueba')
    expect(sinFirma).toContain('Directora')
    expect(sinFirma).toContain('Folio: FOL-001')
    expect(sinFirma.match(/<div class="sello-firmante">/g)).toHaveLength(1)

    const conFirma = crearPaginaRegular(documento(), sello, {
      ...RECURSOS_VACIOS,
      selloConFirma: 'data:image/png;base64,AAAA',
    })
    expect(conFirma).not.toContain('Firma de prueba')
    expect(conFirma).not.toContain('sello-firmante')
  })

  it('la graduación imprime dos firmantes y ningún bloque de folio', () => {
    const html = crearPaginaGraduacion(documento(), firmantes)
    expect(html).toContain('Rector de prueba')
    expect(html).toContain('Director de prueba')
    expect(html).not.toContain('class="folio-bloque"')
  })

  it('escapa HTML en nombre y texto', () => {
    const html = crearPaginaRegular(documento({ nombre: '<b>X</b>', texto: 'a & b' }), sello, RECURSOS_VACIOS)
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).toContain('a &amp; b')
  })

  it('incrusta imágenes y fuentes como data URI y no usa rutas file://', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)],
      { ...RECURSOS_VACIOS, logo: 'data:image/png;base64,BBBB' },
    )
    expect(html).toContain('.logo{background-image:url("data:image/png;base64,BBBB")}')
    expect(html).not.toContain('file://')
  })

  it('la previsualización se escala a la ventana y el PDF no', () => {
    const pagina = crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)
    expect(crearHtmlDocumento([pagina], RECURSOS_VACIOS, { previsualizacion: true })).toContain('class="visor"')
    expect(crearHtmlDocumento([pagina], RECURSOS_VACIOS)).not.toContain('class="visor"')
  })

  it('pone en negritas generación y carrera y parte el cuerpo antes de "de la carrera"', () => {
    const carrera = 'Licenciatura en Ingeniería en Ciencias de la Computación'
    const html = crearPaginaGraduacion(
      documento({
        nombre: 'Yuliset Sanzón Rosas',
        texto: `Por ser integrante de la Generación 2021-2026 de la ${carrera}.`,
        ...opcionesCuerpoGraduacion('2021-2026', carrera),
      }),
      firmantes,
    )
    expect(html).toContain('<b>Generación 2021-2026</b><br/>de la <b>' + carrera + '</b>.')
  })

  it('resaltarFragmentos prefiere el fragmento más largo y no anida etiquetas', () => {
    expect(resaltarFragmentos('Generación 2021-2026, x', ['2021-2026', 'Generación 2021-2026'])).toBe(
      '<b>Generación 2021-2026</b>, x',
    )
    expect(resaltarFragmentos('a < b', [])).toBe('a &lt; b')
  })

  it('formatea nombre de graduación en título solo si viene todo en mayúsculas o minúsculas', () => {
    expect(formatearNombreGraduacion('YULISET SANZÓN ROSAS')).toBe('Yuliset Sanzón Rosas')
    expect(formatearNombreGraduacion('MARÍA DE LA LUZ PÉREZ')).toBe('María de la Luz Pérez')
    expect(formatearNombreGraduacion('Yuliset Sanzón Rosas')).toBe('Yuliset Sanzón Rosas')
  })

  it.each([
    ' buap ',
    'B.U.A.P.',
    'Benemérita Universidad Autónoma de Puebla',
    'Benemérita Universidad Autónoma de Puebla (BUAP)',
    'Benemérita Universidad de Puebla',
    'Universidad Autónoma de Puebla',
    'Universidad de Puebla',
  ])('omite como institución externa la variante BUAP "%s"', (universidad) => {
    expect(formatearFechaParaDocumento('17 de Agosto de 2026')).toBe('17 de agosto de 2026')
    expect(institucionParaDocumento(universidad)).toBeNull()
  })

  it('omite instituciones vacías y conserva las externas', () => {
    expect(institucionParaDocumento('')).toBeNull()
    expect(institucionParaDocumento(null)).toBeNull()
    expect(institucionParaDocumento('UNAM')).toBe('UNAM')
  })

  it('usa el sello con firma cuando está disponible y si no, el sello en blanco', () => {
    const conFirma = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, { ...RECURSOS_VACIOS, selloConFirma: 'data:image/png;base64,AAAA' })],
      { ...RECURSOS_VACIOS, selloConFirma: 'data:image/png;base64,AAAA' },
    )
    expect(conFirma).toContain('.sello-img{background-image:url("data:image/png;base64,AAAA")}')

    const sinFirma = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' })],
      { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' },
    )
    expect(sinFirma).toContain('.sello-img{background-image:url("data:image/png;base64,CCCC")}')
  })
})
