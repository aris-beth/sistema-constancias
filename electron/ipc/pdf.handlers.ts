import { dialog, ipcMain } from 'electron'
import { obtenerBaseDeDatos } from '../db/connection'
import { obtenerEventoPorFolio } from '../db/repositories/evento.repository'
import { obtenerConfiguracionSello } from '../db/repositories/configuracionSello.repository'
import { obtenerConfiguracionFirmantesGraduacion } from '../db/repositories/configuracionFirmantesGraduacion.repository'
import { generarPdfsPorRol, type GrupoPdf } from '../pdf/generarPdf'
import type { GenerarPdfsEntrada, GenerarPdfsResultado } from '../../shared/types/ipc'

interface FilaPdf {
  nombre_rol: string
  folio_interno: string
  tipo_documento: string
  nombre_normalizado: string
  universidad_origen: string | null
  ponencia: string | null
  texto_generado: string
  fecha_constancia: string
}

export function registrarManejadorGenerarPdfs(): void {
  ipcMain.handle(
    'pdf:generar',
    async (_evento, entrada: GenerarPdfsEntrada): Promise<GenerarPdfsResultado> => {
      const folio = entrada?.folioEvento?.trim()
      if (!folio) throw new Error('El folio del evento es obligatorio para generar PDFs.')
      const evento = obtenerEventoPorFolio(folio)
      if (!evento) throw new Error(`No se encontró un evento con el folio "${folio}".`)

      const seleccion = await dialog.showOpenDialog({
        title: 'Selecciona la carpeta donde se guardarán los PDFs',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (seleccion.canceled || seleccion.filePaths.length === 0) {
        throw new Error('No se seleccionó una carpeta de destino.')
      }

      const filas = obtenerBaseDeDatos()
        .prepare(
           `SELECT r.nombre_rol, c.folio_interno, c.tipo_documento, c.ponencia, c.texto_generado,
             e.fecha_constancia, p.nombre_normalizado, p.universidad_origen
           FROM constancia c
           JOIN rol r ON r.id = c.rol_id
           JOIN evento e ON e.id = c.evento_id
           JOIN constancia_participante cp ON cp.constancia_id = c.id
           JOIN participante p ON p.id = cp.participante_id
           WHERE c.evento_id = ? AND c.estado = 'generada'
           ORDER BY r.nombre_rol, c.id, p.id`,
        )
        .all(evento.id) as FilaPdf[]

      const gruposMap = new Map<string, GrupoPdf>()
      for (const fila of filas) {
        const grupo = gruposMap.get(fila.nombre_rol) ?? { nombreRol: fila.nombre_rol, documentos: [] }
        let documento = grupo.documentos.find((item) => item.folioInterno === fila.folio_interno)
        if (!documento) {
          documento = {
            folioInterno: fila.folio_interno,
            encabezado: fila.tipo_documento === 'reconocimiento' ? 'RECONOCIMIENTO' : 'CONSTANCIA',
            nombre: fila.nombre_normalizado,
            institucion: fila.universidad_origen,
            ponencia: fila.ponencia,
            texto: fila.texto_generado,
            fecha: fila.fecha_constancia,
          }
          grupo.documentos.push(documento)
        } else {
          documento.nombre = `${documento.nombre}, ${fila.nombre_normalizado}`
        }
        gruposMap.set(fila.nombre_rol, grupo)
      }

      const rutas = await generarPdfsPorRol(
        evento,
        [...gruposMap.values()],
        seleccion.filePaths[0],
        obtenerConfiguracionSello(),
        obtenerConfiguracionFirmantesGraduacion(),
      )
      return { rutas }
    },
  )
}