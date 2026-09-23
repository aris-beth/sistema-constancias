import { obtenerBaseDeDatos } from '../connection'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionFirmantesGraduacionActualizable,
} from '../../../shared/types/configuracion'

interface FilaConfiguracionFirmantes {
  id: number
  rector_nombre: string
  rector_cargo: string
  director_nombre: string
  director_cargo: string
  fecha_actualizacion: string
}

function mapearFila(fila: FilaConfiguracionFirmantes): ConfiguracionFirmantesGraduacion {
  return {
    rectorNombre: fila.rector_nombre,
    rectorCargo: fila.rector_cargo,
    directorNombre: fila.director_nombre,
    directorCargo: fila.director_cargo,
    fechaActualizacion: fila.fecha_actualizacion,
  }
}

/**
 * Igual que `configuracion_sello`, esta tabla es un singleton (fila id = 1):
 * los dos firmantes de reconocimientos de graduación (Rector/a y
 * Director/a — sección 6.5 de requerimientos) son configuración fija que
 * cambia con poca frecuencia ("la próxima vez el siguiente año, y después
 * cada ~4 años"), no un dato por evento.
 */
export function obtenerConfiguracionFirmantesGraduacion(): ConfiguracionFirmantesGraduacion {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT * FROM configuracion_firmantes_graduacion WHERE id = 1')
    .get() as FilaConfiguracionFirmantes | undefined

  if (!fila) {
    throw new Error(
      'No se encontró la configuración de firmantes de graduación. La base de datos podría no haberse inicializado correctamente.',
    )
  }
  return mapearFila(fila)
}

export function actualizarConfiguracionFirmantesGraduacion(
  datos: ConfiguracionFirmantesGraduacionActualizable,
): ConfiguracionFirmantesGraduacion {
  const db = obtenerBaseDeDatos()

  if (!datos.rectorNombre.trim() || !datos.rectorCargo.trim()) {
    throw new Error('El nombre y cargo de la Rectoría no pueden estar vacíos.')
  }
  if (!datos.directorNombre.trim() || !datos.directorCargo.trim()) {
    throw new Error('El nombre y cargo de la Dirección no pueden estar vacíos.')
  }

  const resultado = db
    .prepare(
      `UPDATE configuracion_firmantes_graduacion
       SET rector_nombre = @rectorNombre,
           rector_cargo = @rectorCargo,
           director_nombre = @directorNombre,
           director_cargo = @directorCargo,
           fecha_actualizacion = @fechaActualizacion
       WHERE id = 1`,
    )
    .run({
      rectorNombre: datos.rectorNombre.trim(),
      rectorCargo: datos.rectorCargo.trim(),
      directorNombre: datos.directorNombre.trim(),
      directorCargo: datos.directorCargo.trim(),
      fechaActualizacion: new Date().toISOString(),
    })

  if (resultado.changes === 0) {
    throw new Error(
      'No se pudo actualizar la configuración de firmantes de graduación: la fila singleton no existe.',
    )
  }

  return obtenerConfiguracionFirmantesGraduacion()
}
