import { obtenerBaseDeDatos } from '../connection'
import type { Evento, EventoNuevo, TipoPlantilla } from '../../../shared/types/evento'

// Forma "cruda" de la fila tal como la devuelve SQLite (nombres de
// columna en snake_case, igual que en schema.ts).
interface FilaEvento {
  id: number
  folio: string
  nombre_evento: string
  fecha_constancia: string
  modalidad: string
  tipo_plantilla: string
  generacion: string | null
  carrera: string | null
}

// Traduce la fila cruda de la base de datos al tipo Evento (camelCase)
// que usa el resto de la aplicación. Mantener esta traducción en un solo
// lugar evita que el estilo snake_case de SQL se filtre a React.
function mapearFila(fila: FilaEvento): Evento {
  return {
    id: fila.id,
    folio: fila.folio,
    nombreEvento: fila.nombre_evento,
    fechaConstancia: fila.fecha_constancia,
    modalidad: fila.modalidad as Evento['modalidad'],
    tipoPlantilla: fila.tipo_plantilla as Evento['tipoPlantilla'],
    generacion: fila.generacion,
    carrera: fila.carrera,
  }
}

export function crearEvento(datos: EventoNuevo): Evento {
  const db = obtenerBaseDeDatos()

  try {
    const insertar = db.prepare(`
      INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla, generacion, carrera)
      VALUES (@folio, @nombreEvento, @fechaConstancia, @modalidad, @tipoPlantilla, @generacion, @carrera)
    `)

    const resultado = insertar.run({
      folio: datos.folio,
      nombreEvento: datos.nombreEvento,
      fechaConstancia: datos.fechaConstancia,
      modalidad: datos.modalidad,
      tipoPlantilla: datos.tipoPlantilla,
      generacion: datos.generacion,
      carrera: datos.carrera,
    })

    const eventoCreado = obtenerEventoPorId(Number(resultado.lastInsertRowid))
    if (!eventoCreado) {
      throw new Error('El evento se guardó pero no pudo recuperarse inmediatamente después.')
    }
    return eventoCreado
  } catch (error) {
    // SQLite reporta violaciones de UNIQUE con un mensaje genérico;
    // lo traducimos a algo que la UI pueda mostrar directamente.
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: evento.folio')) {
      throw new Error(`Ya existe un evento registrado con el folio "${datos.folio}".`)
    }
    throw error
  }
}

export function obtenerEventoPorId(id: number): Evento | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM evento WHERE id = ?').get(id) as FilaEvento | undefined
  return fila ? mapearFila(fila) : null
}

export function obtenerEventoPorFolio(folio: string): Evento | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM evento WHERE folio = ?').get(folio) as FilaEvento | undefined
  return fila ? mapearFila(fila) : null
}

export function listarEventos(): Evento[] {
  const db = obtenerBaseDeDatos()
  const filas = db.prepare('SELECT * FROM evento ORDER BY id DESC').all() as FilaEvento[]
  return filas.map(mapearFila)
}

/**
 * Filtra el historial de eventos por tipo de plantilla (regular o
 * graduación). La pantalla de "elegir tipo de documento" (requisito
 * funcional 1) y el panel de Estadísticas la usan para no mezclar el
 * histórico de ambos flujos, que tienen formatos de Excel y reglas de
 * redacción independientes (sección 4.1 de requerimientos).
 */
export function listarEventosPorTipoPlantilla(tipoPlantilla: TipoPlantilla): Evento[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare('SELECT * FROM evento WHERE tipo_plantilla = ? ORDER BY id DESC')
    .all(tipoPlantilla) as FilaEvento[]
  return filas.map(mapearFila)
}
