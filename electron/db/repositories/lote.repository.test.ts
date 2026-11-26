import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-lote-integration`

vi.mock('electron', () => ({
  app: { getPath: () => carpetaBaseDatos },
}))

import { cerrarBaseDeDatos, obtenerBaseDeDatos } from '../connection'
import { guardarLoteRegular } from './lote.repository'
import type { FilaProcesada } from '../../../shared/types/ipc'

function fila(overrides: Partial<FilaProcesada> = {}): FilaProcesada {
  return {
    numeroFila: 2,
    nombreOriginal: 'Juan Perez',
    nombreNormalizado: 'PEREZ JUAN',
    gradoDetectado: null,
    textoGenerado: 'Por su participación como participante en el evento.',
    esPersonalizado: false,
    universidadExterna: null,
    confianza: 'alta',
    error: null,
    participaComo: 'Participante',
    nombrePonencia: null,
    nombreEvento: 'Encuentro Académico',
    fechaConstancia: '19 de Octubre de 2026',
    duracion: null,
    universidadOrigen: null,
    modalidad: 'Presencial',
    textoPersonalizado: null,
    categoria: 'Alumno BUAP',
    articuloEvento: null,
    ...overrides,
  }
}

describe('guardarLoteRegular', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('agrega un lote sin eliminar constancias previas y continúa los folios internos', () => {
    guardarLoteRegular('EVENTO-2026-001', [fila()], 'nuevo')

    const resultado = guardarLoteRegular(
      'EVENTO-2026-001',
      [fila({ nombreOriginal: 'Ana Lopez', nombreNormalizado: 'LOPEZ ANA' })],
      'agregar',
    )

    expect(resultado).toMatchObject({
      folioEvento: 'EVENTO-2026-001',
      numeroTanda: 2,
      foliosInternos: ['EVENTO-2026-001-0002'],
    })
    expect(
      obtenerBaseDeDatos().prepare('SELECT folio_interno, tanda_id FROM constancia ORDER BY id').all(),
    ).toEqual([
      { folio_interno: 'EVENTO-2026-001-0001', tanda_id: 1 },
      { folio_interno: 'EVENTO-2026-001-0002', tanda_id: 2 },
    ])
  })

  it('rechaza un lote idéntico para prevenir una carga duplicada accidental', () => {
    guardarLoteRegular('EVENTO-2026-002', [fila()], 'nuevo')

    expect(() => guardarLoteRegular('EVENTO-2026-002', [fila()], 'agregar')).toThrow(
      'El contenido coincide con el lote de constancias 1 ya registrado en este evento.',
    )
    expect(
      obtenerBaseDeDatos()
        .prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = (SELECT id FROM evento WHERE folio = ?)')
        .get('EVENTO-2026-002'),
    ).toEqual({ total: 1 })
  })
})
