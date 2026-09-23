import { obtenerBaseDeDatos } from '../connection'
import type { QrCatalogoEntry, QrCatalogoEntryNuevo } from '../../../shared/types/configuracion'

interface FilaQr {
  id: number
  folio_evento: string
  ruta_archivo: string
  fecha_carga: string
}

function mapearFila(fila: FilaQr): QrCatalogoEntry {
  return {
    id: fila.id,
    folioEvento: fila.folio_evento,
    rutaArchivo: fila.ruta_archivo,
    fechaCarga: fila.fecha_carga,
  }
}

/**
 * Registra (o reemplaza) el QR asociado a un folio de evento. El nombre del
 * archivo de imagen del QR corresponde al folio del evento (sección 5.6 de
 * requerimientos), así que solo puede haber un QR vigente por folio: si ya
 * existía uno registrado, esta operación lo sustituye en vez de duplicarlo
 * (por ejemplo, cuando el área que provee el QR envía una versión
 * corregida para el mismo evento).
 */
export function registrarQr(datos: QrCatalogoEntryNuevo): QrCatalogoEntry {
  const db = obtenerBaseDeDatos()

  if (!datos.folioEvento.trim()) {
    throw new Error('El folio del evento no puede estar vacío al registrar un QR.')
  }
  if (!datos.rutaArchivo.trim()) {
    throw new Error('La ruta del archivo de QR no puede estar vacía.')
  }

  db.prepare(
    `INSERT INTO qr_catalogo (folio_evento, ruta_archivo, fecha_carga)
     VALUES (@folioEvento, @rutaArchivo, @fechaCarga)
     ON CONFLICT(folio_evento) DO UPDATE SET
       ruta_archivo = excluded.ruta_archivo,
       fecha_carga = excluded.fecha_carga`,
  ).run({
    folioEvento: datos.folioEvento.trim(),
    rutaArchivo: datos.rutaArchivo.trim(),
    fechaCarga: new Date().toISOString(),
  })

  const registrado = buscarQrPorFolio(datos.folioEvento.trim())
  if (!registrado) {
    throw new Error('El QR se guardó pero no pudo recuperarse inmediatamente después.')
  }
  return registrado
}

/**
 * Busca el QR cuyo nombre de archivo (registrado) corresponde a un folio
 * de evento. La usa el asociador de QR automático (sección 9.3 del diseño)
 * antes de intentar generar las constancias regulares de ese evento.
 */
export function buscarQrPorFolio(folioEvento: string): QrCatalogoEntry | null {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT * FROM qr_catalogo WHERE folio_evento = ?')
    .get(folioEvento) as FilaQr | undefined
  return fila ? mapearFila(fila) : null
}

/**
 * Lista todos los QR ya cargados, más recientes primero — es el catálogo
 * que se muestra en la pantalla del Editor de sellos/QR (sección 6.4 del
 * diseño de interfaz) para que la persona operadora pueda reasignar uno
 * existente sin tener que volver a cargar el archivo.
 */
export function listarQrsCargados(): QrCatalogoEntry[] {
  const db = obtenerBaseDeDatos()
  const filas = db.prepare('SELECT * FROM qr_catalogo ORDER BY fecha_carga DESC').all() as FilaQr[]
  return filas.map(mapearFila)
}
