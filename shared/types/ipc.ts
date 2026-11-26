import type { TipoPlantilla } from './evento'

/**
 * Una fila del Excel ya combinada con el resultado de normalizar su
 * nombre. Es lo que el proceso main le entrega a React para la vista
 * previa — nunca se manda el objeto crudo del Excel por separado del
 * resultado de la normalización, para que la UI no tenga que repetir
 * esa lógica.
 */
export interface FilaProcesada {
  numeroFila: number
  nombreOriginal: string
  nombreNormalizado: string | null
  gradoDetectado: string | null
  textoGenerado: string | null
  esPersonalizado: boolean
  universidadExterna: string | null
  confianza: 'alta' | 'baja' | null
  /** Si normalizar esta fila falló, el mensaje queda aquí y los campos
   * de arriba quedan en null — la fila se muestra en la vista previa
   * marcada como error, en vez de detener todo el lote. */
  error: string | null
  participaComo: string
  nombrePonencia: string | null
  nombreEvento: string
  fechaConstancia: string
  duracion?: string | null
  universidadOrigen: string | null
  modalidad: string
  textoPersonalizado: string | null
  categoria: string | null
  /** Artículo del nombre del evento ya resuelto (elegido o propuesto); null si no se pudo decidir. */
  articuloEvento?: import('./evento').ArticuloEvento | null
}

export interface PrevisualizarFolioEntrada {
  nombreEvento: string
  fecha: string
}

export interface ResultadoCargaExcel {
  nombreArchivo: string
  filas: FilaProcesada[]
}

export interface GuardarLoteEntrada {
  /** Si viene vacío/null, el sistema genera el folio automáticamente. */
  folioEvento: string | null
  filas: FilaProcesada[]
  modo?: ModoGuardado
}

export type ModoGuardado = 'nuevo' | 'agregar' | 'reemplazar'

export interface GuardarLoteResultado {
  folioEvento: string
  nombreEvento: string
  constanciasCreadas: number
  reconocimientosCreados: number
  constanciasPendientes: number
  foliosInternos: string[]
  tandaId: number
  numeroTanda: number
}

export interface ListarEventosReimprimiblesEntrada {
  tipoPlantilla: TipoPlantilla
}

export interface GenerarPdfsEntrada {
  folioEvento: string
  /** Cuando se indica, genera exclusivamente los documentos de esa tanda. */
  tandaId?: number
  /** Carpeta elegida en la pantalla de generación. Si se omite, el proceso
   * main abre su propio diálogo para elegirla. */
  carpetaDestino?: string
}

export interface ResumenPdfRol {
  rol: string
  cantidad: number
  ruta: string
}

export interface ErrorPdfRol {
  rol: string
  cantidad: number
  detalle: string
}

export interface GenerarPdfsResultado {
  rutas: string[]
  carpetaEvento: string
  roles: ResumenPdfRol[]
  /** Un rol que falla no detiene a los demás: se reporta aquí. */
  errores: ErrorPdfRol[]
  advertencias: string[]
}

export interface ConstanciaCorreccion {
  id: number
  folioInterno: string
  rol: string
  tipoDocumento: 'constancia' | 'reconocimiento'
  tipoPlantilla: TipoPlantilla
  nombre: string
  textoGenerado: string
  ponencia: string | null
  universidadOrigen: string | null
  fechaConstancia: string
}

export interface GuardarCorreccionConstanciaEntrada {
  folioEvento: string
  constanciaId: number
  nombre: string
  textoGenerado: string
}

export interface GenerarCorreccionesEntrada {
  folioEvento: string
  constanciaIds: number[]
  carpetaDestino?: string
}

export interface GenerarCorreccionesResultado {
  carpetaCorrecciones: string
  rutas: string[]
  errores: Array<{ folioInterno: string; detalle: string }>
  advertencias: string[]
}

export interface PrevisualizarEntrada {
  modo: 'regular' | 'graduacion'
  folioEvento: string
  /** Número de fila (del Excel) del documento que se quiere ver. */
  numeroFila: number
  /** Todas las filas del lote: el encabezado CONSTANCIA/RECONOCIMIENTO
   * depende del conteo por persona dentro del evento. */
  filasRegular?: FilaProcesada[]
  filasGraduacion?: FilaProcesadaGraduacion[]
}

export interface ConfiguracionSelloEntrada {
  personaFirmante: string
  cargoFirmante: string
  rutaSelloConFirma: string | null
  rutaSelloSinFirma: string | null
  selloActivoId: number | null
}

export interface SelloCatalogoEntrada {
  incluyeFirma: boolean
}

export interface ConfiguracionFirmantesGraduacionEntrada {
  rectorNombre: string
  rectorCargo: string
  directorNombre: string
  directorCargo: string
}

export interface RegistrarFolioEntrada {
  folio: string
  nombreReferencia: string | null
}

export interface ActualizarFolioEntrada extends RegistrarFolioEntrada {
  id: number
  /** Tabla de la que viene el folio; si falta se asume 'catalogo'. */
  origen?: import('./configuracion').OrigenFolio
}

export interface EliminarFolioEntrada {
  id: number
  origen: import('./configuracion').OrigenFolio
}

export interface ConfiguracionReglasEntrada {
  maxConstanciasPorPersona: number
}

export interface ConfiguracionInicial {
  sello: import('./configuracion').ConfiguracionSello
  firmantesGraduacion: import('./configuracion').ConfiguracionFirmantesGraduacion
  folios: import('./configuracion').FolioCatalogoEntry[]
  reglas: import('./configuracion').ConfiguracionReglas
}

export interface FiltrosEstadisticas {
  fechaDesde: string | null
  fechaHasta: string | null
  folioEvento: string | null
}

export interface PeriodoEstadisticas {
  fechaDesde: string | null
  fechaHasta: string | null
}

export interface DesgloseEstadisticas {
  etiqueta: string
  documentos: number
}

export interface PuntoTendenciaEstadisticas {
  fecha: string
  documentos: number
  eventos: number
}

export interface ResultadoEstadisticas {
  totalEventos: number
  totalDocumentos: number
  totalReconocimientos: number
  porRol: DesgloseEstadisticas[]
  porCategoria: DesgloseEstadisticas[]
  personasConMasDocumentos: DesgloseEstadisticas[]
  tendencia: PuntoTendenciaEstadisticas[]
}

export interface EstadisticasEntrada {
  filtros: FiltrosEstadisticas
  comparacion?: {
    periodoA: PeriodoEstadisticas
    periodoB: PeriodoEstadisticas
  }
}

export interface EstadisticasResultado {
  actual: ResultadoEstadisticas
  comparacion: {
    periodoA: ResultadoEstadisticas
    periodoB: ResultadoEstadisticas
  } | null
}

export interface FilaProcesadaGraduacion {
  numeroFila: number
  nombreOriginal: string
  nombreNormalizado: string | null
  subtipo: string
  generacion: string
  carrera: string
  fecha: string
  textoGenerado: string | null
  confianza: 'alta' | 'baja' | null
  error: string | null
}

export interface ResultadoCargaGraduacion {
  nombreArchivo: string
  filas: FilaProcesadaGraduacion[]
}

export interface GuardarGraduacionEntrada {
  folioEvento: string | null
  filas: FilaProcesadaGraduacion[]
  modo?: ModoGuardado
}

export interface GuardarGraduacionResultado {
  folioEvento: string
  nombreEvento: string
  reconocimientosCreados: number
  foliosInternos: string[]
  tandaId: number
  numeroTanda: number
}
