import { obtenerBaseDeDatos } from '../connection'
import type {
  ConfiguracionSello,
  ConfiguracionSelloActualizable,
} from '../../../shared/types/configuracion'

interface FilaConfiguracionSello {
  id: number
  nombre_directora: string
  nombre_rectora: string
  ruta_sello_con_firma: string | null
  ruta_sello_sin_firma: string | null
  fecha_actualizacion: string
}

function mapearFila(fila: FilaConfiguracionSello): ConfiguracionSello {
  return {
    id: fila.id,
    nombreDirectora: fila.nombre_directora,
    nombreRectora: fila.nombre_rectora,
    rutaSelloConFirma: fila.ruta_sello_con_firma,
    rutaSelloSinFirma: fila.ruta_sello_sin_firma,
    fechaActualizacion: fila.fecha_actualizacion,
  }
}

/**
 * La tabla `configuracion_sello` es un singleton (siempre la fila id = 1):
 * no existe un "sello por evento", sino una sola configuración vigente que
 * la Coordinación edita desde el Editor de plantillas (sección 6.4 de
 * requerimientos) y que se reutiliza en todas las constancias regulares
 * que se generen después. La fila la crea `schema.ts` al inicializar la
 * base de datos, así que en operación normal siempre debería existir.
 */
export function obtenerConfiguracionSello(): ConfiguracionSello {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT * FROM configuracion_sello WHERE id = 1')
    .get() as FilaConfiguracionSello | undefined

  if (!fila) {
    throw new Error(
      'No se encontró la configuración de sello/firma. La base de datos podría no haberse inicializado correctamente.',
    )
  }
  return mapearFila(fila)
}

export function actualizarConfiguracionSello(
  datos: ConfiguracionSelloActualizable,
): ConfiguracionSello {
  const db = obtenerBaseDeDatos()

  const nombreDirectora = datos.nombreDirectora?.trim() || ''
  const nombreRectora = datos.nombreRectora?.trim() || ''
  const rutaSelloConFirma = datos.rutaSelloConFirma ?? null
  const rutaSelloSinFirma = datos.rutaSelloSinFirma ?? null

  if (!nombreDirectora && !nombreRectora) {
    throw new Error('Escribe al menos el nombre de la directora o de la rectora.')
  }

  const resultado = db
    .prepare(
      `UPDATE configuracion_sello
         SET nombre_directora = @nombreDirectora,
           nombre_rectora = @nombreRectora,
           ruta_sello_con_firma = @rutaSelloConFirma,
           ruta_sello_sin_firma = @rutaSelloSinFirma,
           fecha_actualizacion = @fechaActualizacion
       WHERE id = 1`,
    )
    .run({
      nombreDirectora,
      nombreRectora,
      rutaSelloConFirma,
      rutaSelloSinFirma,
      fechaActualizacion: new Date().toISOString(),
    })

  if (resultado.changes === 0) {
    throw new Error(
      'No se pudo actualizar la configuración de sello/firma: la fila singleton no existe.',
    )
  }

  return obtenerConfiguracionSello()
}
