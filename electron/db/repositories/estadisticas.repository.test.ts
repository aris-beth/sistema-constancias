import Database from 'better-sqlite3'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_SQL } from '../schema'
import type { FiltrosEstadisticas } from '../../../shared/types/ipc'

const estado = vi.hoisted(() => ({ database: null as Database.Database | null }))
vi.mock('../connection', () => ({ obtenerBaseDeDatos: () => estado.database }))

import { consultarEstadisticas } from './estadisticas.repository'

const sinFiltro: FiltrosEstadisticas = { fechaDesde: null, fechaHasta: null, folioEvento: null }

beforeAll(() => {
  estado.database = new Database(':memory:')
  estado.database.exec(SCHEMA_SQL)
})

beforeEach(() => {
  estado.database?.exec('DELETE FROM constancia_participante; DELETE FROM constancia; DELETE FROM participante; DELETE FROM rol; DELETE FROM evento;')
  estado.database?.exec("DELETE FROM sqlite_sequence WHERE name IN ('evento', 'rol', 'participante', 'constancia')")
  estado.database?.exec(`
    INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla) VALUES
      ('EVT-ENE-1', 'Evento enero 1', '10 de Enero de 2026', 'Presencial CU', 'regular'),
      ('EVT-ENE-2', 'Evento enero 2', '15 de Enero de 2026', 'Presencial CU', 'regular'),
      ('EVT-FEB-1', 'Evento febrero', '20 de Febrero de 2026', 'Presencial CU', 'regular');
    INSERT INTO rol (nombre_rol, plantilla_texto) VALUES ('Asistente', 'texto'), ('Ponente', 'texto');
    INSERT INTO participante (nombre_original, nombre_normalizado, categoria) VALUES
      ('Juan Perez', 'PEREZ JUAN', 'Maestro BUAP'),
      ('Ana Lopez', 'LOPEZ ANA', 'Externo'),
      ('Luis Ruiz', 'RUIZ LUIS', 'Alumno BUAP');
    INSERT INTO constancia (evento_id, rol_id, texto_generado, tipo_documento, fecha_generacion, folio_interno, estado) VALUES
      (1, 1, 'texto', 'constancia', '2026-01-10', 'E1-001', 'generada'),
      (1, 2, 'texto', 'constancia', '2026-01-10', 'E1-002', 'generada'),
      (2, 1, 'texto', 'constancia', '2026-01-01', 'E2-001', 'generada'),
      (3, 2, 'texto', 'constancia', '2026-02-20', 'E3-001', 'pendiente');
    INSERT INTO constancia_participante (constancia_id, participante_id) VALUES
      (1, 1), (2, 2), (3, 1), (4, 3);
  `)
})

describe('consultarEstadisticas', () => {
  it('agrega solo documentos generados por rol, categoría y persona', () => {
    const resultado = consultarEstadisticas(sinFiltro)

    expect(resultado.totalEventos).toBe(2)
    expect(resultado.totalDocumentos).toBe(3)
    expect(resultado.porRol).toEqual([
      { etiqueta: 'Asistente', documentos: 2 },
      { etiqueta: 'Ponente', documentos: 1 },
    ])
    expect(resultado.porCategoria).toEqual([
      { etiqueta: 'Maestro BUAP', documentos: 2 },
      { etiqueta: 'Externo', documentos: 1 },
    ])
    expect(resultado.personasConMasDocumentos).toEqual([
      { etiqueta: 'PEREZ JUAN', documentos: 2 },
      { etiqueta: 'LOPEZ ANA', documentos: 1 },
    ])
  })

  it('filtra por rango de fechas y por evento específico', () => {
    expect(consultarEstadisticas({ ...sinFiltro, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' }).totalDocumentos).toBe(3)
    expect(consultarEstadisticas({ ...sinFiltro, folioEvento: 'EVT-ENE-2' })).toMatchObject({
      totalEventos: 1,
      totalDocumentos: 1,
      tendencia: [{ fecha: '15 de Enero de 2026', documentos: 1, eventos: 1 }],
    })
  })

  it('devuelve la tendencia agrupada por fecha', () => {
    expect(consultarEstadisticas(sinFiltro).tendencia).toEqual([
      { fecha: '10 de Enero de 2026', documentos: 2, eventos: 1 },
      { fecha: '15 de Enero de 2026', documentos: 1, eventos: 1 },
    ])
  })
})
