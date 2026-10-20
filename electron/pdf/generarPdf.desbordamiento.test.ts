import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Evento } from '../../shared/types/evento'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
} from '../../shared/types/configuracion'
import type { DatosDocumentoPdf } from './plantillaDocumento'

const rutas = vi.hoisted(() => ({
  raiz: `${process.cwd()}\\.tmp-pdf-desbordamiento`,
  paginasDesbordadas: [] as number[],
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => path.join(rutas.raiz, 'app'),
    getPath: () => path.join(rutas.raiz, 'temp'),
  },
  BrowserWindow: class {
    webContents = {
      executeJavaScript: vi.fn(async (script: string) => {
        if (!script.includes('scrollHeight') || !script.includes('document.fonts.ready')) {
          throw new Error('No se midió el desbordamiento después de cargar las fuentes.')
        }
        return rutas.paginasDesbordadas
      }),
      printToPDF: vi.fn(async () => Buffer.from('pdf')),
    }
    loadFile = vi.fn(async () => undefined)
    isDestroyed = () => false
    destroy = vi.fn()
  },
}))

import { generarPdfsPorRol } from './generarPdf'

const evento: Evento = {
  id: 1,
  folio: 'EVT-001',
  nombreEvento: 'Evento de prueba',
  fechaConstancia: '19 de Octubre de 2026',
  modalidad: 'Presencial CU',
  tipoPlantilla: 'regular',
  generacion: null,
  carrera: null,
}

const documento = (folioInterno: string): DatosDocumentoPdf => ({
  folioInterno,
  encabezado: 'CONSTANCIA',
  nombre: 'PEREZ JUAN',
  institucion: null,
  ponencia: null,
  texto: 'Texto de prueba.',
  fecha: '19 de Octubre de 2026',
})

const sello = {
  personaFirmante: '',
  cargoFirmante: '',
  rutaSelloConFirma: null,
  rutaSelloSinFirma: null,
} as unknown as ConfiguracionSello
const firmantes = {} as ConfiguracionFirmantesGraduacion

describe('desbordamientos de contenido en PDF', () => {
  beforeEach(() => {
    fs.rmSync(rutas.raiz, { recursive: true, force: true })
    fs.mkdirSync(path.join(rutas.raiz, 'temp'), { recursive: true })
    rutas.paginasDesbordadas = []
  })

  afterEach(() => {
    fs.rmSync(rutas.raiz, { recursive: true, force: true })
  })

  it('avisa en la bitácora por cada constancia cuya página desborda', async () => {
    rutas.paginasDesbordadas = [1]
    const resultado = await generarPdfsPorRol(
      evento,
      [{
        nombreRol: 'Texto personalizado',
        documentos: [documento('EVT-001-0001'), documento('EVT-001-0002')],
      }],
      path.join(rutas.raiz, 'salida'),
      sello,
      firmantes,
    )

    expect(resultado.roles).toHaveLength(1)
    expect(resultado.advertencias).toContain(
      'El documento con folio interno "EVT-001-0002" del rol "Texto personalizado" ' +
        'desborda el espacio disponible y podría aparecer recortado. Revisa la extensión del texto.',
    )
  })

  it('no añade avisos si todas las páginas caben en el área disponible', async () => {
    const resultado = await generarPdfsPorRol(
      evento,
      [{ nombreRol: 'Asistente', documentos: [documento('EVT-001-0001')] }],
      path.join(rutas.raiz, 'salida'),
      sello,
      firmantes,
    )

    expect(
      resultado.advertencias.some((aviso) => aviso.includes('desborda el espacio disponible')),
    ).toBe(false)
  })

  it('avisa si el nombre excede el rango calibrado aunque la página no desborde', async () => {
    const resultado = await generarPdfsPorRol(
      evento,
      [{
        nombreRol: 'Asistente',
        documentos: [{ ...documento('EVT-001-0001'), nombre: 'A'.repeat(169) }],
      }],
      path.join(rutas.raiz, 'salida'),
      sello,
      firmantes,
    )

    expect(resultado.advertencias).toContain(
      'El nombre del documento con folio interno "EVT-001-0001" del rol "Asistente" ' +
        'supera el rango calibrado; se aplicó el ajuste mínimo. Revisa visualmente el PDF antes de entregarlo.',
    )
    expect(resultado.advertencias.some((aviso) => aviso.includes('desborda el espacio disponible'))).toBe(false)
  })

  it('avisa por ponencia fuera de calibración en documentos regulares', async () => {
    const resultado = await generarPdfsPorRol(
      evento,
      [{
        nombreRol: 'Ponente',
        documentos: [{ ...documento('EVT-001-0001'), ponencia: 'A '.repeat(66) }],
      }],
      path.join(rutas.raiz, 'salida'),
      sello,
      firmantes,
    )

    expect(resultado.advertencias).toContain(
      'La ponencia del documento con folio interno "EVT-001-0001" del rol "Ponente" ' +
        'supera el rango calibrado; se aplicó el ajuste mínimo. Revisa visualmente el PDF antes de entregarlo.',
    )
  })
})
