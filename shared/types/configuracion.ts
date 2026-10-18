/**
 * Configuración editable del sello/firma de constancias regulares (sección
 * 6.4 de requerimientos: "Elementos editables sin programador"). Es un
 * dato único vigente para toda la app, no uno por evento.
 */
// shared/types/configuracion.ts
export interface ConfiguracionSello {
  id?: number;
  /** Persona que firma las constancias regulares (se imprime como texto solo si se usa el sello en blanco). */
  personaFirmante: string;
  /** Cargo de la persona firmante (se imprime como texto solo si se usa el sello en blanco). */
  cargoFirmante: string;
  /**
   * Sello con la firma de la persona firmante ya horneada en la imagen
   * (incluye también su nombre y cargo). Cuando está cargado y se puede
   * leer, se usa tal cual y NO se imprime persona/cargo como texto aparte.
   */
  rutaSelloConFirma: string | null;
  /**
   * Versión en blanco (sin firma) del mismo sello. Se usa únicamente cuando
   * no hay sello con firma utilizable: persona firmante y cargo se imprimen
   * entonces como texto debajo del sello.
   */
  rutaSelloSinFirma: string | null;
  sellos: OpcionSello[]
  selloActivoId: number | null
  fechaActualizacion?: string;
}

export interface OpcionSello {
  id: number
  nombre: string
  rutaImagen: string
  incluyeFirma: boolean
  fechaActualizacion: string
}

export interface ConfiguracionSelloActualizable {
  personaFirmante: string
  cargoFirmante: string
  rutaSelloConFirma: string | null
  rutaSelloSinFirma: string | null
  selloActivoId?: number | null
}

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
 * De dónde viene una entrada de la lista de folios:
 * - 'catalogo': folio capturado a mano (eventos anteriores o externos).
 * - 'evento': folio de un evento ya guardado en el sistema (autogenerado o corregido).
 */
export type OrigenFolio = 'catalogo' | 'evento'

/**
 * Una entrada de la lista de folios: reúne los folios capturados a mano y los
 * de los eventos ya guardados. El folio es único en todo el sistema.
 * `id` es el id de la tabla de origen (`folio_catalogo` o `evento`), así que
 * solo es único junto con `origen`.
 */
export interface FolioCatalogoEntry {
  id: number
  folio: string
  nombreReferencia: string | null
  fechaRegistro: string
  origen: OrigenFolio
}

export type FolioCatalogoEntryNuevo = Omit<FolioCatalogoEntry, 'id' | 'fechaRegistro' | 'origen'>

/**
 * Reglas de emisión editables sin programador. `maxConstanciasPorPersona` es
 * cuántas constancias puede recibir una misma persona dentro de un evento;
 * la siguiente ya se emite como RECONOCIMIENTO (por defecto 6: la 7ª es
 * reconocimiento, sección 5.3 de requerimientos).
 */
export interface ConfiguracionReglas {
  maxConstanciasPorPersona: number
  fechaActualizacion: string
}

export type ConfiguracionReglasActualizable = Omit<ConfiguracionReglas, 'fechaActualizacion'>
