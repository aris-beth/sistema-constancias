import { obtenerBaseDeDatos } from '../connection'
import type {
  SubtipoGraduacion,
  SubtipoGraduacionNuevo,
} from '../../../shared/types/subtipoGraduacion'

interface FilaSubtipoGraduacion {
  id: number
  nombre_subtipo: string
  plantilla_texto: string
}

function mapearFila(fila: FilaSubtipoGraduacion): SubtipoGraduacion {
  return {
    id: fila.id,
    nombreSubtipo: fila.nombre_subtipo,
    plantillaTexto: fila.plantilla_texto,
  }
}

export function crearSubtipoGraduacion(datos: SubtipoGraduacionNuevo): SubtipoGraduacion {
  const db = obtenerBaseDeDatos()

  try {
    const insertar = db.prepare(
      'INSERT INTO subtipo_graduacion (nombre_subtipo, plantilla_texto) VALUES (@nombreSubtipo, @plantillaTexto)',
    )
    const resultado = insertar.run(datos)

    const creado = obtenerSubtipoGraduacionPorId(Number(resultado.lastInsertRowid))
    if (!creado) {
      throw new Error('El subtipo se guardó pero no pudo recuperarse inmediatamente después.')
    }
    return creado
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: subtipo_graduacion.nombre_subtipo')
    ) {
      throw new Error(
        `Ya existe un subtipo de graduación registrado como "${datos.nombreSubtipo}".`,
      )
    }
    throw error
  }
}

export function obtenerSubtipoGraduacionPorId(id: number): SubtipoGraduacion | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM subtipo_graduacion WHERE id = ?').get(id) as
    | FilaSubtipoGraduacion
    | undefined
  return fila ? mapearFila(fila) : null
}

/**
 * Busca un subtipo por nombre exacto (usado por el motor de validación del
 * Excel de graduación para confirmar que el valor de la columna SUBTIPO
 * existe en el catálogo — sección 4.1 de requerimientos).
 */
export function obtenerSubtipoGraduacionPorNombre(
  nombreSubtipo: string,
): SubtipoGraduacion | null {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT * FROM subtipo_graduacion WHERE nombre_subtipo = ?')
    .get(nombreSubtipo) as FilaSubtipoGraduacion | undefined
  return fila ? mapearFila(fila) : null
}

export function listarSubtiposGraduacion(): SubtipoGraduacion[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare('SELECT * FROM subtipo_graduacion ORDER BY nombre_subtipo')
    .all() as FilaSubtipoGraduacion[]
  return filas.map(mapearFila)
}
