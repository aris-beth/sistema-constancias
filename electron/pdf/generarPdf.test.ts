import { describe, expect, it } from 'vitest'
import {
  crearPaginaGraduacion,
  crearPaginaRegular,
  type DatosDocumentoPdf,
  crearHtmlDocumento,
  RECURSOS_VACIOS,
} from './plantillaDocumento'
import { nombreCarpetaEvento } from './generarPdf'
import type { ConfiguracionFirmantesGraduacion, ConfiguracionSello } from '../../shared/types/configuracion'

const sello = {
  personaFirmante: 'Firma de prueba',
  cargoFirmante: 'Cargo de prueba',
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

describe('generarPdf', () => {
  it('sanitiza folios históricos al construir el nombre de carpeta del evento', () => {
    const nombre = nombreCarpetaEvento({
      folio: '2020/05:15',
      nombreEvento: 'Congreso: pasado/actual',
    })

    expect(nombre).toContain('2020_05_15_')
    expect(nombre).toContain('_Congreso_pasado_actual')
    expect(nombre).not.toMatch(/[\\/:*?"<>|]/)
    expect(nombreCarpetaEvento({
      folio: '2020:05/15',
      nombreEvento: 'Congreso: pasado/actual',
    })).not.toBe(nombre)
  })

  it('aplica autoajuste y saltos de línea a un nombre de 168 caracteres', () => {
    const html = crearPaginaRegular(documento({ nombre: textoDeLongitud(168) }), sello, RECURSOS_VACIOS)

    expect(html).toContain('<br/>')
    expect(html).toContain('class="destinatario" style="font-size: 11pt"')
    expect(html).not.toContain('class="destinatario">A:')
  })

  it('aplica autoajuste al nombre de graduación', () => {
    const html = crearPaginaGraduacion(documento({ nombre: textoDeLongitud(168) }), firmantes)

    expect(html).toContain('<br/>')
    expect(html).toContain('class="destinatario" style="font-size: 14.1pt"')
  })

  it('reduce el cuerpo cuando la ponencia requiere un nivel menor', () => {
    const html = crearPaginaRegular(
      documento({ nombre: 'PEREZ JUAN', ponencia: textoDeLongitud(130) }),
      sello,
      RECURSOS_VACIOS,
    )

    expect(html).toContain('class="cuerpo" style="font-size: 11pt"')
    expect(html).not.toContain('cuerpo-destacado')
  })
})

describe('calibración de plantilla', () => {
  it('mantiene la hoja en Carta horizontal y conserva las medidas del logo', () => {
    const html = crearHtmlDocumento(
      [crearPaginaRegular(documento(), sello, RECURSOS_VACIOS)],
      RECURSOS_VACIOS,
    )
    expect(html).toContain('@page { size: Letter landscape; margin: 0; }')
    expect(html).toContain('width: 2.46in;')
    expect(html).toContain('aspect-ratio: 292 / 386;')
    expect(html).toContain('font-size: 40pt;')
    expect(html).toContain('letter-spacing: 4pt;')
  })

  it('usa 16 pt como tamaño base del destinatario regular', () => {
    const html = crearPaginaRegular(documento({ nombre: 'PEREZ JUAN' }), sello, RECURSOS_VACIOS)
    expect(html).toContain('class="destinatario" style="font-size: 16pt"')
  })
})
