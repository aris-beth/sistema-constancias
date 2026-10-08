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
  /**
   * Sello con la firma de la directora ya horneada en la imagen (incluye
   * también su nombre y cargo impresos). Cuando existe, se usa tal cual y
   * NO se repite el nombre como texto aparte.
   */
  rutaSelloConFirma: string | null;
  /**
   * Versión en blanco (sin firma) del mismo sello, para cuando todavía no
   * se ha cargado/actualizado la versión con firma: el nombre y cargo se
   * imprimen entonces como texto normal encima de esta imagen.
   */
  rutaSelloSinFirma: string | null;
  fechaActualizacion?: string;
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
