import { obtenerBaseDeDatos } from '../connection'
import type {
  ConfiguracionSello,
  ConfiguracionSelloActualizable,
  OpcionSello,
} from '../../../shared/types/configuracion'

interface FilaConfiguracionSello {
  id: number
  persona_firmante: string
  cargo_firmante: string
  ruta_sello_con_firma: string | null
  ruta_sello_sin_firma: string | null
  sello_activo_id: number | null
  fecha_actualizacion: string
}

interface FilaOpcionSello {
  id: number
  nombre: string
  ruta_imagen: string
  incluye_firma: number
  fecha_actualizacion: string
}

function mapearOpcion(fila: FilaOpcionSello): OpcionSello {
  return {
    id: fila.id,
    nombre: fila.nombre,
    rutaImagen: fila.ruta_imagen,
    incluyeFirma: fila.incluye_firma === 1,
    fechaActualizacion: fila.fecha_actualizacion,
  }
}

function listarOpcionesSello(): OpcionSello[] {
  return obtenerBaseDeDatos()
    .prepare('SELECT * FROM sello_catalogo ORDER BY id')
    .all()
    .map((fila) => mapearOpcion(fila as FilaOpcionSello))
}

function mapearFila(fila: FilaConfiguracionSello): ConfiguracionSello {
  return {
    id: fila.id,
    personaFirmante: fila.persona_firmante,
    cargoFirmante: fila.cargo_firmante,
    rutaSelloConFirma: fila.ruta_sello_con_firma,
    rutaSelloSinFirma: fila.ruta_sello_sin_firma,
    sellos: listarOpcionesSello(),
    selloActivoId: fila.sello_activo_id,
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

  const personaFirmante = datos.personaFirmante?.trim() || ''
  const cargoFirmante = datos.cargoFirmante?.trim() || ''
  const tieneSeleccionExplicita = datos.selloActivoId !== undefined
  const selloActivo = tieneSeleccionExplicita && datos.selloActivoId !== null
    ? db.prepare('SELECT * FROM sello_catalogo WHERE id = ?').get(datos.selloActivoId) as FilaOpcionSello | undefined
    : undefined
  if (tieneSeleccionExplicita && datos.selloActivoId !== null && !selloActivo) {
    throw new Error('El sello seleccionado ya no existe en el catálogo. Actualiza la pantalla e inténtalo de nuevo.')
  }
  const selloActivoId = tieneSeleccionExplicita ? datos.selloActivoId ?? null : null
  const rutaSelloConFirma = tieneSeleccionExplicita
    ? selloActivo?.incluye_firma === 1 ? selloActivo.ruta_imagen : null
    : datos.rutaSelloConFirma ?? null
  const rutaSelloSinFirma = tieneSeleccionExplicita
    ? selloActivo && selloActivo.incluye_firma === 0 ? selloActivo.ruta_imagen : null
    : datos.rutaSelloSinFirma ?? null

  // El nombre solo se imprime como texto si no se eligió un sello que ya
  // tenga la firma incorporada.
  if (!rutaSelloConFirma && !personaFirmante) {
    throw new Error(
      'Escribe la persona firmante: se imprime como texto mientras no cargues el sello con firma.',
    )
  }

  const resultado = db
    .prepare(
      `UPDATE configuracion_sello
         SET persona_firmante = @personaFirmante,
           cargo_firmante = @cargoFirmante,
           ruta_sello_con_firma = @rutaSelloConFirma,
           ruta_sello_sin_firma = @rutaSelloSinFirma,
           sello_activo_id = @selloActivoId,
           fecha_actualizacion = @fechaActualizacion
       WHERE id = 1`,
    )
    .run({
      personaFirmante,
      cargoFirmante,
      rutaSelloConFirma,
      rutaSelloSinFirma,
      selloActivoId,
      fechaActualizacion: new Date().toISOString(),
    })

  if (resultado.changes === 0) {
    throw new Error(
      'No se pudo actualizar la configuración de sello/firma: la fila singleton no existe.',
    )
  }

  return obtenerConfiguracionSello()
}

export function obtenerSello(id: number): OpcionSello | null {
  const fila = obtenerBaseDeDatos()
    .prepare('SELECT * FROM sello_catalogo WHERE id = ?')
    .get(id) as FilaOpcionSello | undefined
  return fila ? mapearOpcion(fila) : null
}

export function agregarSello(
  nombre: string,
  rutaImagen: string,
  incluyeFirma: boolean,
): OpcionSello {
  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) throw new Error('El nombre del sello es obligatorio.')
  const resultado = obtenerBaseDeDatos()
    .prepare(
      `INSERT INTO sello_catalogo (nombre, ruta_imagen, incluye_firma, fecha_actualizacion)
       VALUES (@nombre, @rutaImagen, @incluyeFirma, @fechaActualizacion)`,
    )
    .run({
      nombre: nombreLimpio,
      rutaImagen,
      incluyeFirma: incluyeFirma ? 1 : 0,
      fechaActualizacion: new Date().toISOString(),
    })
  const sello = obtenerSello(Number(resultado.lastInsertRowid))
  if (!sello) throw new Error('El sello se guardó, pero no se pudo recuperar del catálogo.')
  return sello
}

export function reemplazarImagenSello(id: number, rutaImagen: string): OpcionSello {
  const db = obtenerBaseDeDatos()
  const resultado = db
    .prepare('UPDATE sello_catalogo SET ruta_imagen = ?, fecha_actualizacion = ? WHERE id = ?')
    .run(rutaImagen, new Date().toISOString(), id)
  if (resultado.changes === 0) {
    throw new Error('No se encontró el sello que se quería reemplazar.')
  }

  const configuracion = db
    .prepare('SELECT sello_activo_id FROM configuracion_sello WHERE id = 1')
    .get() as { sello_activo_id: number | null } | undefined
  if (configuracion?.sello_activo_id === id) {
    const sello = obtenerSello(id)
    db.prepare(
      `UPDATE configuracion_sello
       SET ruta_sello_con_firma = ?, ruta_sello_sin_firma = ?, fecha_actualizacion = ?
       WHERE id = 1`,
    ).run(
      sello?.incluyeFirma ? rutaImagen : null,
      sello?.incluyeFirma ? null : rutaImagen,
      new Date().toISOString(),
    )
  }
  const selloActualizado = obtenerSello(id)
  if (!selloActualizado) throw new Error('La imagen se reemplazó, pero no se pudo recuperar el sello actualizado.')
  return selloActualizado
}
