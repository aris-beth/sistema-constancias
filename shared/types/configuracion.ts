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
 * Una entrada del catálogo de folios: sirve para registrar folios que ya
 * existen (eventos anteriores o externos al sistema) y para corregir un
 * folio autogenerado. El folio es único.
 */
export interface FolioCatalogoEntry {
  id: number
  folio: string
  nombreReferencia: string | null
  fechaRegistro: string
}

export type FolioCatalogoEntryNuevo = Omit<FolioCatalogoEntry, 'id' | 'fechaRegistro'>
