import type { QrCatalogoEntry } from '../../../shared/types/configuracion'

export interface ResultadoAsociacionQr {
  rutaQr: string | null
  pendienteDeQr: boolean
}

export function asociarQr(
  folioEvento: string,
  qrsCargados: QrCatalogoEntry[],
): ResultadoAsociacionQr {
  const qr = qrsCargados.find((entrada) => entrada.folioEvento === folioEvento)

  return qr
    ? { rutaQr: qr.rutaArchivo, pendienteDeQr: false }
    : { rutaQr: null, pendienteDeQr: true }
}