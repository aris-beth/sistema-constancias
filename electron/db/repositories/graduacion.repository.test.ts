import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-graduacion-integration`

vi.mock('electron', () => ({
  app: { getPath: () => carpetaBaseDatos },
}))

import { cerrarBaseDeDatos, obtenerBaseDeDatos } from '../connection'
import { guardarLoteGraduacion } from './graduacion.repository'
import type { FilaProcesadaGraduacion } from '../../../shared/types/ipc'

function fila(overrides: Partial<FilaProcesadaGraduacion> = {}): FilaProcesadaGraduacion {
  return {
    numeroFila: 2,
    nombreOriginal: 'Juan Perez',
    nombreNormalizado: 'PEREZ JUAN',
    subtipo: 'Distinción al Mérito Académico',
    generacion: '2022-2026',
    carrera: 'Ingeniería en Ciencias de la Computación',
    fecha: '19 de Octubre de 2026',
    textoGenerado: 'Reconocimiento de prueba.',
    confianza: 'alta',
    error: null,
    ...overrides,
  }
}

describe('guardarLoteGraduacion', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('reemplaza las constancias de graduación existentes cuando se vuelve a guardar el mismo folio', () => {
    guardarLoteGraduacion('GRAD-2026-001', [
      fila(),
      fila({ numeroFila: 3, nombreOriginal: 'Ana Lopez', nombreNormalizado: 'LOPEZ ANA' }),
    ])

    const resultado = guardarLoteGraduacion('GRAD-2026-001', [
      fila({
        nombreOriginal: 'Maria Ruiz',
        nombreNormalizado: 'RUIZ MARIA',
        generacion: '2023-2027',
        carrera: 'Ciencia de Datos',
        fecha: '20 de Octubre de 2026',
        textoGenerado: 'Reconocimiento actualizado.',
      }),
    ])

    const db = obtenerBaseDeDatos()
    expect(resultado).toMatchObject({
      folioEvento: 'GRAD-2026-001',
      nombreEvento: 'Reconocimientos de graduación 2023-2027',
      reconocimientosCreados: 1,
      foliosInternos: ['GRAD-2026-001-0001'],
    })
    expect(
      db.prepare('SELECT nombre_evento, fecha_constancia, generacion, carrera FROM evento WHERE folio = ?')
        .get('GRAD-2026-001'),
    ).toEqual({
      nombre_evento: 'Reconocimientos de graduación 2023-2027',
      fecha_constancia: '20 de Octubre de 2026',
      generacion: '2023-2027',
      carrera: 'Ciencia de Datos',
    })
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = (SELECT id FROM evento WHERE folio = ?)')
        .get('GRAD-2026-001'),
    ).toEqual({ total: 1 })
    expect(
      db.prepare(
        `SELECT p.nombre_normalizado FROM participante p
         JOIN constancia_participante cp ON cp.participante_id = p.id
         JOIN constancia c ON c.id = cp.constancia_id
         JOIN evento e ON e.id = c.evento_id
         WHERE e.folio = ?`,
      ).all('GRAD-2026-001'),
    ).toEqual([{ nombre_normalizado: 'RUIZ MARIA' }])
  })

  it('agrega un lote sin eliminar reconocimientos previos y continúa los folios internos', () => {
    guardarLoteGraduacion('GRAD-2026-002', [fila()], 'nuevo')

    const resultado = guardarLoteGraduacion(
      'GRAD-2026-002',
      [fila({ nombreOriginal: 'Ana Lopez', nombreNormalizado: 'LOPEZ ANA' })],
      'agregar',
    )
    const db = obtenerBaseDeDatos()

    expect(resultado).toMatchObject({
      folioEvento: 'GRAD-2026-002',
      numeroTanda: 2,
      foliosInternos: ['GRAD-2026-002-0002'],
    })
    expect(
      db.prepare('SELECT folio_interno, tanda_id FROM constancia ORDER BY id').all(),
    ).toEqual([
      { folio_interno: 'GRAD-2026-002-0001', tanda_id: 1 },
      { folio_interno: 'GRAD-2026-002-0002', tanda_id: 2 },
    ])
  })

  it('guarda el nombre impreso de cada fila sin reutilizar el orden de otra constancia de la misma persona', () => {
    guardarLoteGraduacion(
      'GRAD-2026-004',
      [
        fila({ nombreOriginal: 'Perez Juan', nombreNormalizado: 'PEREZ JUAN' }),
        fila({ numeroFila: 3, nombreOriginal: 'Juan Perez', nombreNormalizado: 'PEREZ JUAN' }),
      ],
      'nuevo',
    )

    expect(
      obtenerBaseDeDatos()
        .prepare('SELECT nombre_impreso FROM constancia ORDER BY id')
        .all(),
    ).toEqual([{ nombre_impreso: 'Perez Juan' }, { nombre_impreso: 'Juan Perez' }])
  })

  it('rechaza un lote idéntico para prevenir una carga duplicada accidental', () => {
    guardarLoteGraduacion('GRAD-2026-003', [fila()], 'nuevo')

    expect(() => guardarLoteGraduacion('GRAD-2026-003', [fila()], 'agregar')).toThrow(
      'El contenido coincide con el lote de constancias 1 ya registrado en este evento.',
    )
    expect(
      obtenerBaseDeDatos()
        .prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = (SELECT id FROM evento WHERE folio = ?)')
        .get('GRAD-2026-003'),
    ).toEqual({ total: 1 })
  })

  it('no permite reemplazar un evento regular con el flujo de graduación', () => {
    obtenerBaseDeDatos()
      .prepare(
        `INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla)
         VALUES ('FOLIO-REGULAR', 'Evento regular', '19 de Octubre de 2026', 'Otro', 'regular')`,
      )
      .run()

    expect(() => guardarLoteGraduacion('FOLIO-REGULAR', [fila()])).toThrow(
      'El folio "FOLIO-REGULAR" pertenece a un evento regular.',
    )
  })
})
