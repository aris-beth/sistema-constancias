import { contextBridge, ipcRenderer } from 'electron'
import type { FilaExcelCruda, FilaExcelCrudaGraduacion } from '../shared/types/excel'
import type {
  GuardarLoteEntrada,
  GuardarLoteResultado,
  GuardarGraduacionEntrada,
  GuardarGraduacionResultado,
  GenerarPdfsEntrada,
  GenerarPdfsResultado,
  PrevisualizarEntrada,
  PrevisualizarFolioEntrada,
  ResultadoCargaExcel,
  ResultadoCargaGraduacion,
  FilaProcesada,
  FilaProcesadaGraduacion,
  ConfiguracionInicial,
  ConfiguracionSelloEntrada,
  ConfiguracionFirmantesGraduacionEntrada,
  ActualizarFolioEntrada,
  RegistrarFolioEntrada,
  EstadisticasEntrada,
  EstadisticasResultado,
  ListarEventosReimprimiblesEntrada,
} from '../shared/types/ipc'
import type { Evento } from '../shared/types/evento'

// Cada función que agregamos aquí es una función real que React podrá
// llamar como si fuera una API normal (window.electronAPI.cargarExcel()),
// pero por dentro viaja como un mensaje IPC hacia el proceso principal.
// React JAMÁS obtiene acceso directo a Node ni al sistema de archivos:
// solo a estas funciones puntuales que nosotros decidimos exponer.
contextBridge.exposeInMainWorld('electronAPI', {
  version: () => process.versions.electron,
  cargarExcel: (): Promise<ResultadoCargaExcel | null> => ipcRenderer.invoke('excel:cargar'),
  cargarGraduacion: (): Promise<ResultadoCargaGraduacion | null> =>
    ipcRenderer.invoke('excel:cargarGraduacion'),
  revalidarFilas: (filas: FilaExcelCruda[]): Promise<FilaProcesada[]> =>
    ipcRenderer.invoke('excel:revalidar', filas),
  revalidarFilasGraduacion: (filas: FilaExcelCrudaGraduacion[]): Promise<FilaProcesadaGraduacion[]> =>
    ipcRenderer.invoke('excel:revalidarGraduacion', filas),
  previsualizarFolio: (entrada: PrevisualizarFolioEntrada): Promise<string | null> =>
    ipcRenderer.invoke('folio:previsualizar', entrada),
  guardarLote: (entrada: GuardarLoteEntrada): Promise<GuardarLoteResultado> =>
    ipcRenderer.invoke('excel:guardarLote', entrada),
  guardarGraduacion: (entrada: GuardarGraduacionEntrada): Promise<GuardarGraduacionResultado> =>
    ipcRenderer.invoke('excel:guardarGraduacion', entrada),
  generarPdfs: (entrada: GenerarPdfsEntrada): Promise<GenerarPdfsResultado> =>
    ipcRenderer.invoke('pdf:generar', entrada),
  listarEventosReimprimibles: (entrada: ListarEventosReimprimiblesEntrada): Promise<Evento[]> =>
    ipcRenderer.invoke('evento:listarReimprimibles', entrada.tipoPlantilla),
  seleccionarCarpetaDestino: (): Promise<string | null> =>
    ipcRenderer.invoke('pdf:seleccionarCarpeta'),
  previsualizarDocumento: (entrada: PrevisualizarEntrada): Promise<string> =>
    ipcRenderer.invoke('pdf:previsualizar', entrada),
  obtenerConfiguracion: (): Promise<ConfiguracionInicial> =>
    ipcRenderer.invoke('configuracion:obtener'),
  seleccionarSelloConFirma: (): Promise<string | null> =>
    ipcRenderer.invoke('configuracion:seleccionarSelloConFirma'),
  seleccionarSelloSinFirma: (): Promise<string | null> =>
    ipcRenderer.invoke('configuracion:seleccionarSelloSinFirma'),
  actualizarConfiguracionSello: (entrada: ConfiguracionSelloEntrada) =>
    ipcRenderer.invoke('configuracion:actualizarSello', entrada),
  actualizarFirmantesGraduacion: (entrada: ConfiguracionFirmantesGraduacionEntrada) =>
    ipcRenderer.invoke('configuracion:actualizarFirmantesGraduacion', entrada),
  listarFolios: () => ipcRenderer.invoke('configuracion:listarFolios'),
  registrarFolio: (entrada: RegistrarFolioEntrada) =>
    ipcRenderer.invoke('configuracion:registrarFolio', entrada),
  actualizarFolio: (entrada: ActualizarFolioEntrada) =>
    ipcRenderer.invoke('configuracion:actualizarFolio', entrada),
  eliminarFolio: (id: number) => ipcRenderer.invoke('configuracion:eliminarFolio', id),
  consultarEstadisticas: (entrada: EstadisticasEntrada): Promise<EstadisticasResultado> =>
    ipcRenderer.invoke('estadisticas:consultar', entrada),
})
