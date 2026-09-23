/**
 * Configuración editable del sello/firma de constancias regulares (sección
 * 6.4 de requerimientos: "Elementos editables sin programador"). Es un
 * dato único vigente para toda la app, no uno por evento.
 */
// shared/types/configuracion.ts
export interface ConfiguracionSello {
  id?: number;
  nombreDirectora: string;
  nombreRectora: string;
  rutaFirma: string | null;
  rutaImagenSello: string | null;
  fechaActualizacion?: string;
  /** Aliases temporales para instalaciones y consumidores anteriores. */
  nombreFirmante?: string;
  cargoFirmante?: string;
  rutaImagenFirma?: string | null;
}

export interface RegistroQr {
  id?: number;
  folioAsociado: string;
  rutaQr: string;
  fechaRegistro?: string;
}

export type ConfiguracionSelloActualizable = Omit<ConfiguracionSello, 'fechaActualizacion'>

/**
 * Configuración editable de los dos firmantes de reconocimientos de
 * graduación (Rector/a y Director/a — sección 6.5 de requerimientos). Al
 * igual que el sello, es un dato único vigente, editado con poca
 * frecuencia ("la próxima vez el siguiente año, y después cada ~4 años").
 */
export interface ConfiguracionFirmantesGraduacion {
  rectorNombre: string
  rectorCargo: string
  directorNombre: string
  directorCargo: string
  fechaActualizacion: string
}

export type ConfiguracionFirmantesGraduacionActualizable = Omit<
  ConfiguracionFirmantesGraduacion,
  'fechaActualizacion'
>

/**
 * Una entrada del catálogo de códigos QR ya cargados (sección 6.4 y 9.3 de
 * requerimientos/diseño). El QR es único por evento y se asocia
 * automáticamente por folio, usado como nombre de archivo esperado.
 */
export interface QrCatalogoEntry {
  id: number
  folioEvento: string
  rutaArchivo: string
  fechaCarga: string
}

export type QrCatalogoEntryNuevo = Omit<QrCatalogoEntry, 'id' | 'fechaCarga'>
