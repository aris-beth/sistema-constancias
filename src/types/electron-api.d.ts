import type { FilaExcelCruda, FilaExcelCrudaGraduacion } from '../../shared/types/excel'
import type {
  GuardarGraduacionEntrada,
  GuardarGraduacionResultado,
  GenerarPdfsEntrada,
  GenerarPdfsResultado,
  PrevisualizarEntrada,
  PrevisualizarFolioEntrada,
  FilaProcesada,
  FilaProcesadaGraduacion,
  GuardarLoteEntrada,
  GuardarLoteResultado,
  ResultadoCargaExcel,
  ResultadoCargaGraduacion,
  ConfiguracionInicial,
  ConfiguracionSelloEntrada,
  ConfiguracionFirmantesGraduacionEntrada,
  ActualizarFolioEntrada,
  RegistrarFolioEntrada,
  EstadisticasEntrada,
  EstadisticasResultado,
} from '../../shared/types/ipc'
import type {
  ConfiguracionSello,
  ConfiguracionFirmantesGraduacion,
  FolioCatalogoEntry,
} from '../../shared/types/configuracion'

declare global {
  interface Window {
    electronAPI: {
      version: () => string
      cargarExcel: () => Promise<ResultadoCargaExcel | null>
      cargarGraduacion: () => Promise<ResultadoCargaGraduacion | null>
      revalidarFilas: (filas: FilaExcelCruda[]) => Promise<FilaProcesada[]>
      revalidarFilasGraduacion: (filas: FilaExcelCrudaGraduacion[]) => Promise<FilaProcesadaGraduacion[]>
      previsualizarFolio: (entrada: PrevisualizarFolioEntrada) => Promise<string | null>
      guardarLote: (entrada: GuardarLoteEntrada) => Promise<GuardarLoteResultado>
      guardarGraduacion: (entrada: GuardarGraduacionEntrada) => Promise<GuardarGraduacionResultado>
      generarPdfs: (entrada: GenerarPdfsEntrada) => Promise<GenerarPdfsResultado>
      seleccionarCarpetaDestino: () => Promise<string | null>
      previsualizarDocumento: (entrada: PrevisualizarEntrada) => Promise<string>
      obtenerConfiguracion: () => Promise<ConfiguracionInicial>
      seleccionarImagenFirma: () => Promise<string | null>
      seleccionarImagenSello: () => Promise<string | null>
      actualizarConfiguracionSello: (entrada: ConfiguracionSelloEntrada) => Promise<ConfiguracionSello>
      actualizarFirmantesGraduacion: (entrada: ConfiguracionFirmantesGraduacionEntrada) => Promise<ConfiguracionFirmantesGraduacion>
      listarFolios: () => Promise<FolioCatalogoEntry[]>
      registrarFolio: (entrada: RegistrarFolioEntrada) => Promise<FolioCatalogoEntry>
      actualizarFolio: (entrada: ActualizarFolioEntrada) => Promise<FolioCatalogoEntry>
      eliminarFolio: (id: number) => Promise<void>
      consultarEstadisticas: (entrada: EstadisticasEntrada) => Promise<EstadisticasResultado>
    }
  }
}

// Este archivo es solo de tipos: el "export {}" lo convierte en un módulo
// para que TypeScript aplique "declare global" en vez de tratarlo como
// un script suelto.
export {}
