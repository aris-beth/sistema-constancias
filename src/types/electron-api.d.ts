import type {
  GuardarGraduacionEntrada,
  GuardarGraduacionResultado,
  GenerarPdfsEntrada,
  GenerarPdfsResultado,
  GuardarLoteEntrada,
  GuardarLoteResultado,
  ResultadoCargaExcel,
  ResultadoCargaGraduacion,
  ConfiguracionInicial,
  ConfiguracionSelloEntrada,
  ConfiguracionFirmantesGraduacionEntrada,
  RegistrarQrEntrada,
  EstadisticasEntrada,
  EstadisticasResultado,
} from '../../shared/types/ipc'
import type {
  ConfiguracionSello,
  ConfiguracionFirmantesGraduacion,
  QrCatalogoEntry,
} from '../../shared/types/configuracion'

declare global {
  interface Window {
    electronAPI: {
      version: () => string
      cargarExcel: () => Promise<ResultadoCargaExcel | null>
      cargarGraduacion: () => Promise<ResultadoCargaGraduacion | null>
      guardarLote: (entrada: GuardarLoteEntrada) => Promise<GuardarLoteResultado>
      guardarGraduacion: (entrada: GuardarGraduacionEntrada) => Promise<GuardarGraduacionResultado>
      generarPdfs: (entrada: GenerarPdfsEntrada) => Promise<GenerarPdfsResultado>
      obtenerConfiguracion: () => Promise<ConfiguracionInicial>
      seleccionarImagenFirma: () => Promise<string | null>
      seleccionarImagenSello: () => Promise<string | null>
      actualizarConfiguracionSello: (entrada: ConfiguracionSelloEntrada) => Promise<ConfiguracionSello>
      actualizarFirmantesGraduacion: (entrada: ConfiguracionFirmantesGraduacionEntrada) => Promise<ConfiguracionFirmantesGraduacion>
      registrarQr: (entrada: RegistrarQrEntrada) => Promise<QrCatalogoEntry | null>
      listarQrs: () => Promise<QrCatalogoEntry[]>
      consultarEstadisticas: (entrada: EstadisticasEntrada) => Promise<EstadisticasResultado>
    }
  }
}

// Este archivo es solo de tipos: el "export {}" lo convierte en un módulo
// para que TypeScript aplique "declare global" en vez de tratarlo como
// un script suelto.
export {}
