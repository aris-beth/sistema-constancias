import { contextBridge, ipcRenderer } from 'electron'
import type {
  GuardarLoteEntrada,
  GuardarLoteResultado,
  GuardarGraduacionEntrada,
  GuardarGraduacionResultado,
  GenerarPdfsEntrada,
  GenerarPdfsResultado,
  ResultadoCargaExcel,
  ResultadoCargaGraduacion,
  ConfiguracionInicial,
  ConfiguracionSelloEntrada,
  ConfiguracionFirmantesGraduacionEntrada,
  RegistrarQrEntrada,
  EstadisticasEntrada,
  EstadisticasResultado,
} from '../shared/types/ipc'

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
  guardarLote: (entrada: GuardarLoteEntrada): Promise<GuardarLoteResultado> =>
    ipcRenderer.invoke('excel:guardarLote', entrada),
  guardarGraduacion: (entrada: GuardarGraduacionEntrada): Promise<GuardarGraduacionResultado> =>
    ipcRenderer.invoke('excel:guardarGraduacion', entrada),
  generarPdfs: (entrada: GenerarPdfsEntrada): Promise<GenerarPdfsResultado> =>
    ipcRenderer.invoke('pdf:generar', entrada),
  obtenerConfiguracion: (): Promise<ConfiguracionInicial> =>
    ipcRenderer.invoke('configuracion:obtener'),
  seleccionarImagenFirma: (): Promise<string | null> =>
    ipcRenderer.invoke('configuracion:seleccionarFirma'),
  seleccionarImagenSello: (): Promise<string | null> =>
    ipcRenderer.invoke('configuracion:seleccionarSello'),
  actualizarConfiguracionSello: (entrada: ConfiguracionSelloEntrada) =>
    ipcRenderer.invoke('configuracion:actualizarSello', entrada),
  actualizarFirmantesGraduacion: (entrada: ConfiguracionFirmantesGraduacionEntrada) =>
    ipcRenderer.invoke('configuracion:actualizarFirmantesGraduacion', entrada),
  registrarQr: (entrada: RegistrarQrEntrada) =>
    ipcRenderer.invoke('configuracion:registrarQr', entrada),
  listarQrs: () => ipcRenderer.invoke('configuracion:listarQrs'),
  consultarEstadisticas: (entrada: EstadisticasEntrada): Promise<EstadisticasResultado> =>
    ipcRenderer.invoke('estadisticas:consultar', entrada),
})
