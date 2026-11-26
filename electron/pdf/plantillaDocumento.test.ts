import { describe, expect, it } from 'vitest'
import {
  crearHtmlDocumento,
  crearPaginaGraduacion,
  crearPaginaRegular,
  elegirSelloParaDocumento,
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
  personaFirmante: 'Firma de prueba',
  cargoFirmante: 'Directora',
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

  it('imprime persona firmante y cargo configurados cuando se usa el sello en blanco', () => {
    const html = crearPaginaRegular(
      documento(),
      { ...sello, personaFirmante: 'Dra. Ejemplo', cargoFirmante: 'Directora interina' } as unknown as ConfiguracionSello,
      { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' },
    )
    expect(html).toContain('<strong>Dra. Ejemplo</strong><span>Directora interina</span>')
  })

  it('sube ligeramente el nombre y cargo cuando el sello no incluye firma', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' })],
      { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' },
    )

    expect(html).toContain(
      '.sello-firmante { position: absolute; left: 0; top: 1.62in; width: 100%; text-align: center; font-size: 12pt; line-height: 1.3; }',
    )
  })

  it('elegirSelloParaDocumento: con firma gana; si no, en blanco con texto; si no hay ninguno, solo texto', () => {
    expect(
      elegirSelloParaDocumento({ selloConFirma: 'A', selloSinFirma: 'B' }),
    ).toEqual({ imagen: 'A', incluyeFirmante: true })
    expect(
      elegirSelloParaDocumento({ selloConFirma: null, selloSinFirma: 'B' }),
    ).toEqual({ imagen: 'B', incluyeFirmante: false })
    expect(
      elegirSelloParaDocumento({ selloConFirma: null, selloSinFirma: null }),
    ).toEqual({ imagen: null, incluyeFirmante: false })
  })

  it('muestra "otorga la presente" sin anteponer "constancia" en el encabezado', () => {
    const html = crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)

    expect(html).toContain('A través de la Facultad de Ciencias de la Computación')
    expect(html).toContain('<div class="subtitulo otorga">otorga la presente</div>')
    expect(html).not.toContain('constancia otorga la presente')
  })

  it('usa "otorga el presente" en todos los reconocimientos', () => {
    const reconocimientoRegular = crearPaginaRegular(
      documento({ encabezado: 'RECONOCIMIENTO' }),
      sello,
      RECURSOS_VACIOS,
    )
    const reconocimientoGraduacion = crearPaginaGraduacion(documento(), firmantes)

    for (const html of [reconocimientoRegular, reconocimientoGraduacion]) {
      expect(html).toContain('<div class="subtitulo otorga">otorga el presente</div>')
      expect(html).not.toContain('otorga la presente')
    }
  })

  it('centra el folio entre el escudo y el borde inferior y muestra "A:" en negrita', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)],
      RECURSOS_VACIOS,
    )

    expect(html).toContain('flex: 1 1 auto; flex-direction: column; align-items: center; justify-content: center; width: 100%; min-height: 1.05in;')
    expect(html).toContain('.destinatario .prefijo { font-weight: 700; }')
  })

  it('ajusta el ancho del nombre a los límites visibles del subtítulo institucional', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)],
      RECURSOS_VACIOS,
    )

    expect(html).toContain('.destinatario { font-size: 16pt; line-height: 1.2; max-width: 100%; overflow-wrap: anywhere; }')
    expect(html).toContain("document.querySelector('.encabezado-inst .subtitulo:not(.otorga)')")
    expect(html).toContain('destinatario.style.maxWidth = anchoSubtitulo + \'px\'')
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

  it('conserva los saltos de línea explícitos en el texto de graduación', () => {
    const texto =
      'Por la excelencia de su labor docente, gran calidad profesional y humana\n' +
      'que inspiran a la comunidad universitaria a distinguirla como\n' +
      'MADRINA de la Generación 2019 - 2026'
    const html = crearPaginaGraduacion(
      documento({
        texto,
        ...opcionesCuerpoGraduacion('2019 - 2026', '', texto),
      }),
      firmantes,
    )

    expect(html).toContain(
      'gran calidad profesional y humana<br/>que inspiran a la comunidad universitaria a distinguirla como<br/><b>MADRINA de la Generación 2019 - 2026</b>',
    )
  })

  it('resalta cada plantilla de graduación usando sus valores reales aunque cambien mayúsculas o carrera', () => {
    const ejemplos = [
      {
        texto: 'Por ser integrante de la Generación 2019 - 2026 de la Ingeniería Biomédica.',
        html: '<b>Generación 2019 - 2026</b><br/>de la <b>Ingeniería Biomédica</b>.',
      },
      {
        texto: 'Por obtener la distinción al mérito académico en la Ingeniería Biomédica, 2019 - 2026.',
        html: '<b>distinción al mérito académico</b> en la Ingeniería Biomédica, <b>2019 - 2026</b>.',
      },
      {
        texto: 'Por su destacada labor docente, en favor de la Generación 2019 - 2026.',
        html: 'Por su destacada labor docente, en favor de la <b>Generación 2019 - 2026</b>.',
      },
      {
        texto: 'MADRINA de la Generación 2019 - 2026',
        html: '<b>MADRINA de la Generación 2019 - 2026</b>',
      },
      {
        texto: 'PADRINO de la Generación 2019 - 2026',
        html: '<b>PADRINO de la Generación 2019 - 2026</b>',
      },
    ]

    for (const ejemplo of ejemplos) {
      const opciones = opcionesCuerpoGraduacion('2019 - 2026', 'Carrera distinta', ejemplo.texto)
      const html = crearPaginaGraduacion(documento({ texto: ejemplo.texto, ...opciones }), firmantes)
      expect(html).toContain(ejemplo.html)
    }
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
    expect(formatearNombreGraduacion('PÉREZ JUAN')).toBe('Pérez Juan')
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

  it('usa el último día del rango en la fecha del pie del documento', () => {
    expect(formatearFechaParaDocumento('1 al 5 de Enero de 2026')).toBe('5 de enero de 2026')
    expect(formatearFechaParaDocumento('del 1 al 6 de enero de 2026')).toBe('6 de enero de 2026')
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

  it('mantiene el área del sello en 8.5 × 5.5 cm sin deformar la imagen', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)],
      RECURSOS_VACIOS,
    )

    expect(html).toContain(
      '.sello-img { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 8.5cm; height: 5.5cm; background-repeat: no-repeat; background-position: center; background-size: contain; z-index: 0; }',
    )
  })

  it('mantiene el lema y la fecha por encima de la imagen del sello', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' })],
      { ...RECURSOS_VACIOS, selloSinFirma: 'data:image/png;base64,CCCC' },
    )

    expect(html).toContain('.sello-texto { position: absolute; left: 0; top: 0.17in; width: 100%; text-align: center; z-index: 1; }')
    expect(html).toContain('.sello-img { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 8.5cm; height: 5.5cm; background-repeat: no-repeat; background-position: center; background-size: contain; z-index: 0; }')
    expect(html).toContain('<div class="fecha">Puebla de Z., a 22 de septiembre de 2026</div>')
  })
})
