import { obtenerBaseDeDatos } from '../connection'
import type { Rol, RolNuevo } from '../../../shared/types/rol'

interface FilaRol {
  id: number
  nombre_rol: string
  plantilla_texto: string
}

function mapearFila(fila: FilaRol): Rol {
  return {
    id: fila.id,
    nombreRol: fila.nombre_rol,
    plantillaTexto: fila.plantilla_texto,
  }
}

export function crearRol(datos: RolNuevo): Rol {
  const db = obtenerBaseDeDatos()

  try {
    const insertar = db.prepare(
      'INSERT INTO rol (nombre_rol, plantilla_texto) VALUES (@nombreRol, @plantillaTexto)',
    )
    const resultado = insertar.run(datos)

    const creado = obtenerRolPorId(Number(resultado.lastInsertRowid))
    if (!creado) {
      throw new Error('El rol se guardó pero no pudo recuperarse inmediatamente después.')
    }
    return creado
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: rol.nombre_rol')) {
      throw new Error(`Ya existe un rol registrado con el nombre "${datos.nombreRol}".`)
    }
    throw error
  }
}

export function obtenerRolPorId(id: number): Rol | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM rol WHERE id = ?').get(id) as FilaRol | undefined
  return fila ? mapearFila(fila) : null
}

/**
 * Busca un rol por nombre exacto (usado por el motor de validación,
 * sección 5.1 de tus requerimientos, para confirmar que el valor de la
 * columna "PARTICIPA COMO" del Excel existe en el catálogo).
 */
export function obtenerRolPorNombre(nombreRol: string): Rol | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM rol WHERE nombre_rol = ?').get(nombreRol) as
    | FilaRol
    | undefined
  return fila ? mapearFila(fila) : null
}

export function listarRoles(): Rol[] {
  const db = obtenerBaseDeDatos()
  const filas = db
    .prepare("SELECT * FROM rol WHERE TRIM(plantilla_texto) <> '' ORDER BY nombre_rol")
    .all() as FilaRol[]
  return filas.map(mapearFila)
}
