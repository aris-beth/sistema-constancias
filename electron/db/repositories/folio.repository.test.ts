import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carpetaBaseDatos = `${process.cwd()}/.tmp-folio-integration`

vi.mock('electron', () => ({
  app: { getPath: () => carpetaBaseDatos },
}))

import { cerrarBaseDeDatos, obtenerBaseDeDatos } from '../connection'
import {
  actualizarFolioDeEvento,
  eliminarFolioCatalogo,
  listarFoliosCatalogo,
  registrarFolioCatalogo,
} from './folio.repository'

function crearEventoConConstancias(folio: string, nombre: string): number {
  const db = obtenerBaseDeDatos()
  const evento = Number(
    db
      .prepare(
        `INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla)
         VALUES (?, ?, '2026-03-10', 'En línea', 'regular')`,
      )
      .run(folio, nombre).lastInsertRowid,
  )
  const rol = Number(db.prepare("INSERT INTO rol (nombre_rol, plantilla_texto) VALUES (?, '')").run(`Rol ${folio}`).lastInsertRowid)
  for (const consecutivo of ['0001', '0002']) {
    db.prepare(
      `INSERT INTO constancia (evento_id, rol_id, texto_generado, tipo_documento, fecha_generacion, folio_interno, estado)
       VALUES (?, ?, 'texto', 'constancia', '2026-03-11T10:00:00.000Z', ?, 'generada')`,
    ).run(evento, rol, `${folio}-${consecutivo}`)
  }
  return evento
}

describe('folios: lista completa y edición', () => {
  beforeEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })
  afterEach(() => {
    cerrarBaseDeDatos()
    fs.rmSync(carpetaBaseDatos, { recursive: true, force: true })
  })

  it('la lista incluye los folios de eventos guardados y los capturados a mano', () => {
    crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    registrarFolioCatalogo({ folio: 'VIEJO-2019-003', nombreReferencia: 'Evento anterior' })

    const lista = listarFoliosCatalogo()
    expect(lista.map((item) => [item.folio, item.origen]).sort()).toEqual([
      ['EFAC-2026-001', 'evento'],
      ['VIEJO-2019-003', 'catalogo'],
    ])
    expect(lista.find((item) => item.origen === 'evento')?.nombreReferencia).toBe('Evento Facultad')
  })

  it('un folio presente en el catálogo y en un evento se muestra una sola vez, como evento', () => {
    crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    obtenerBaseDeDatos()
      .prepare("INSERT INTO folio_catalogo (folio, nombre_referencia, fecha_registro) VALUES ('EFAC-2026-001', NULL, '2026-01-01T00:00:00.000Z')")
      .run()

    const lista = listarFoliosCatalogo().filter((item) => item.folio === 'EFAC-2026-001')
    expect(lista).toHaveLength(1)
    expect(lista[0].origen).toBe('evento')
  })

  it('no permite registrar en el catálogo un folio que ya es de un evento', () => {
    crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    expect(() => registrarFolioCatalogo({ folio: 'EFAC-2026-001', nombreReferencia: null })).toThrow(/evento/i)
  })

  it('eliminar un folio manual libera solo la reserva y conserva eventos y constancias', () => {
    const eventoId = crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    const reserva = registrarFolioCatalogo({ folio: 'RESERVADO-2026-001', nombreReferencia: 'Reserva' })

    eliminarFolioCatalogo(reserva.id, 'catalogo')

    expect(listarFoliosCatalogo().some((item) => item.folio === 'RESERVADO-2026-001')).toBe(false)
    expect(registrarFolioCatalogo({ folio: 'RESERVADO-2026-001', nombreReferencia: null }).folio)
      .toBe('RESERVADO-2026-001')
    expect(obtenerBaseDeDatos().prepare('SELECT folio FROM evento WHERE id = ?').get(eventoId))
      .toEqual({ folio: 'EFAC-2026-001' })
    expect(obtenerBaseDeDatos().prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = ?').get(eventoId))
      .toEqual({ total: 2 })
  })

  it('elimina el evento y sus constancias pero conserva los participantes compartidos', () => {
    const eventoId = crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    const db = obtenerBaseDeDatos()
    const participanteId = Number(
      db.prepare(
        `INSERT INTO participante (nombre_original, nombre_normalizado)
         VALUES ('Juan Perez', 'PEREZ JUAN')`,
      ).run().lastInsertRowid,
    )
    const constancia = db.prepare('SELECT id FROM constancia WHERE evento_id = ? ORDER BY id LIMIT 1')
      .get(eventoId) as { id: number } | undefined
    if (!constancia) throw new Error('La prueba necesita una constancia para el evento.')
    const constanciaId = constancia.id
    db.prepare('INSERT INTO constancia_participante (constancia_id, participante_id) VALUES (?, ?)')
      .run(constanciaId, participanteId)

    eliminarFolioCatalogo(eventoId, 'evento')

    expect(db.prepare('SELECT id FROM evento WHERE id = ?').get(eventoId)).toBeUndefined()
    expect(db.prepare('SELECT COUNT(*) AS total FROM constancia WHERE evento_id = ?').get(eventoId))
      .toEqual({ total: 0 })
    expect(db.prepare('SELECT COUNT(*) AS total FROM constancia_participante WHERE constancia_id = ?').get(constanciaId))
      .toEqual({ total: 0 })
    expect(db.prepare('SELECT id FROM participante WHERE id = ?').get(participanteId))
      .toEqual({ id: participanteId })
    expect(listarFoliosCatalogo().some((item) => item.folio === 'EFAC-2026-001')).toBe(false)
    expect(registrarFolioCatalogo({ folio: 'EFAC-2026-001', nombreReferencia: 'Folio liberado' }).folio)
      .toBe('EFAC-2026-001')
  })

  it('renombrar el folio de un evento actualiza también el folio de sus constancias', () => {
    const eventoId = crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')

    const actualizado = actualizarFolioDeEvento(eventoId, 'EFAC-2026-010')

    expect(actualizado).toEqual(expect.objectContaining({ folio: 'EFAC-2026-010', origen: 'evento' }))
    const internos = obtenerBaseDeDatos()
      .prepare('SELECT folio_interno FROM constancia WHERE evento_id = ? ORDER BY id')
      .all(eventoId)
    expect(internos).toEqual([{ folio_interno: 'EFAC-2026-010-0001' }, { folio_interno: 'EFAC-2026-010-0002' }])
  })

  it('rechaza renombrar un evento a un folio que ya existe', () => {
    const eventoId = crearEventoConConstancias('EFAC-2026-001', 'Evento Facultad')
    registrarFolioCatalogo({ folio: 'OCUPADO-2020-001', nombreReferencia: null })

    expect(() => actualizarFolioDeEvento(eventoId, 'OCUPADO-2020-001')).toThrow(/ya existe/i)
    const evento = obtenerBaseDeDatos().prepare('SELECT folio FROM evento WHERE id = ?').get(eventoId)
    expect(evento).toEqual({ folio: 'EFAC-2026-001' })
  })
})
