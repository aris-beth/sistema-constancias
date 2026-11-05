import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-correccion-integration`

vi.mock('electron', () => ({
  app: { getPath: () => carpetaBaseDatos },
}))

import { cerrarBaseDeDatos, obtenerBaseDeDatos } from '../connection'
import {
  guardarCorreccionConstancia,
  listarConstanciasParaCorreccion,
  obtenerConstanciasParaPdfCorreccion,
} from './correccion.repository'

function crearEvento(folio: string): { constanciaId: number; otroId: number } {
  const db = obtenerBaseDeDatos()
  const eventoId = Number(db.prepare(
    `INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla)
     VALUES (?, 'Evento de prueba', '19 de Octubre de 2026', 'Otro', 'regular')`,
  ).run(folio).lastInsertRowid)
  const rolId = Number(db.prepare(
    "INSERT INTO rol (nombre_rol, plantilla_texto) VALUES ('Asistente', 'Texto base')",
  ).run().lastInsertRowid)
  const personaId = Number(db.prepare(
    `INSERT INTO participante (nombre_original, nombre_normalizado)
     VALUES ('Juan Perez', 'PEREZ JUAN')`,
  ).run().lastInsertRowid)
  const otraPersonaId = Number(db.prepare(
    `INSERT INTO participante (nombre_original, nombre_normalizado)
     VALUES ('Ana Lopez', 'LOPEZ ANA')`,
  ).run().lastInsertRowid)
  const insertarConstancia = db.prepare(
    `INSERT INTO constancia (
       evento_id, rol_id, texto_generado, tipo_documento, fecha_generacion, folio_interno
     ) VALUES (?, ?, 'Texto original', 'constancia', '2026-10-19', ?)`,
  )
  const constanciaId = Number(insertarConstancia.run(eventoId, rolId, `${folio}-0001`).lastInsertRowid)
  const otroId = Number(insertarConstancia.run(eventoId, rolId, `${folio}-0002`).lastInsertRowid)
  const vincularPersona = db.prepare(
    'INSERT INTO constancia_participante (constancia_id, participante_id) VALUES (?, ?)',
  )
  vincularPersona.run(constanciaId, personaId)
  vincularPersona.run(otroId, otraPersonaId)
  return { constanciaId, otroId }
}

describe('correcciones de constancias', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('corrige un solo documento, conserva a la persona y registra el historial', () => {
    const { constanciaId, otroId } = crearEvento('EVT-CORR')
    const iniciales = listarConstanciasParaCorreccion('EVT-CORR')

    expect(iniciales.map(({ nombre }) => nombre)).toEqual(['PEREZ JUAN', 'LOPEZ ANA'])

    const actualizada = guardarCorreccionConstancia({
      folioEvento: 'EVT-CORR',
      constanciaId,
      nombre: 'JUAN PEREZ',
      textoGenerado: 'Texto corregido',
    })

    expect(actualizada).toMatchObject({
      id: constanciaId,
      nombre: 'JUAN PEREZ',
      textoGenerado: 'Texto corregido',
    })
    expect(listarConstanciasParaCorreccion('EVT-CORR').find(({ id }) => id === otroId)).toMatchObject({
      nombre: 'LOPEZ ANA',
      textoGenerado: 'Texto original',
    })
    expect(obtenerBaseDeDatos().prepare(
      'SELECT nombre_normalizado FROM participante WHERE nombre_original = ?',
    ).get('Juan Perez')).toEqual({ nombre_normalizado: 'PEREZ JUAN' })
    expect(obtenerBaseDeDatos().prepare(
      'SELECT nombre_anterior, nombre_nuevo, texto_anterior, texto_nuevo FROM constancia_correccion WHERE constancia_id = ?',
    ).get(constanciaId)).toEqual({
      nombre_anterior: 'PEREZ JUAN',
      nombre_nuevo: 'JUAN PEREZ',
      texto_anterior: 'Texto original',
      texto_nuevo: 'Texto corregido',
    })
  })

  it('rechaza la generación si una selección incluye una constancia de otro evento', () => {
    const primera = crearEvento('EVT-UNO')
    const segunda = crearEvento('EVT-DOS')

    expect(() => obtenerConstanciasParaPdfCorreccion('EVT-UNO', [primera.constanciaId, segunda.constanciaId]))
      .toThrow('no pertenece al evento "EVT-UNO"')
  })
})
