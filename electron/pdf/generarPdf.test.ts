import { describe, expect, it } from 'vitest'
import { crearHtmlDocumento, crearPaginaGraduacion, crearPaginaRegular, type DatosDocumentoPdf } from './generarPdf'
import type { Evento } from '../../shared/types/evento'

const sello = {
  rutaImagenFirma: null,
  nombreFirmante: 'Firma de prueba',
  cargoFirmante: 'Cargo de prueba',
}

const firmantes = {
  rectorNombre: 'Rector de prueba',
  rectorCargo: 'Rector',
  directorNombre: 'Director de prueba',
  directorCargo: 'Director',
}

const evento: Evento = {
  id: 1,
  folio: 'EVT-001',
  nombreEvento: 'Evento de prueba',
  fechaConstancia: '22 de Septiembre de 2026',
  modalidad: 'Presencial CU',
  tipoPlantilla: 'regular',
  generacion: null,
  carrera: null,
}

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

describe('generarPdf', () => {
  it('aplica autoajuste y saltos de línea a un nombre de 168 caracteres', () => {
    const html = crearPaginaRegular(documento({ nombre: textoDeLongitud(168) }), sello, evento)

    expect(html).toContain('<br/>')
    expect(html).toContain('class="nombre-destinatario" style="font-size: 11pt"')
    expect(html).not.toContain('class="destinatario">A:')
  })

  it('aplica autoajuste al nombre de graduación', () => {
    const html = crearPaginaGraduacion(documento({ nombre: textoDeLongitud(168) }), firmantes)

    expect(html).toContain('<br/>')
    expect(html).toContain('class="nombre-destinatario" style="font-size: 11pt"')
  })

  it('reduce el cuerpo cuando la ponencia requiere un nivel menor', () => {
    const html = crearPaginaRegular(
      documento({ nombre: 'PEREZ JUAN', ponencia: textoDeLongitud(130) }),
      sello,
      evento,
    )

    expect(html).toContain('class="cuerpo"')
    expect(html).toContain('class="cuerpo-destacado"')
  })
})

describe('calibración de plantilla', () => {
  it('mantiene la hoja en Carta horizontal y conserva las medidas del logo', () => {
    const html = crearHtmlDocumento(crearPaginaRegular(documento(), sello, evento))
    expect(html).toContain('@page { size: Letter landscape; margin: 0; }')
    expect(html).toContain('width: 2.48in;')
    expect(html).toContain('height: 3.27in;')
    expect(html).toContain('font-size: 40pt;')
    expect(html).toContain('letter-spacing: 4pt;')
  })

  it('usa 20 pt como tamaño base del destinatario', () => {
    const html = crearPaginaRegular(documento({ nombre: 'PEREZ JUAN' }), sello, evento)
    expect(html).toContain('class="nombre-destinatario" style="font-size: 20pt"')
  })
})
