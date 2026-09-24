import { dialog, ipcMain } from 'electron'
import { obtenerBaseDeDatos } from '../db/connection'
import { obtenerEventoPorFolio } from '../db/repositories/evento.repository'
import { obtenerConfiguracionSello } from '../db/repositories/configuracionSello.repository'
import { obtenerConfiguracionFirmantesGraduacion } from '../db/repositories/configuracionFirmantesGraduacion.repository'
import { buscarQrPorFolio } from '../db/repositories/qrCatalogo.repository'
import { calcularEncabezadosPorFila } from '../business/calcularEncabezados'
import { carpetaResources, generarPdfsPorRol, type GrupoPdf } from '../pdf/generarPdf'
import {
  crearHtmlDocumento,
  crearPaginaGraduacion,
  crearPaginaRegular,
  formatearNombreGraduacion,
  institucionParaDocumento,
  opcionesCuerpoGraduacion,
  type DatosDocumentoPdf,
} from '../pdf/plantillaDocumento'
import { armarRecursos } from '../pdf/recursos'
import type {
  GenerarPdfsEntrada,
  GenerarPdfsResultado,
  PrevisualizarEntrada,
} from '../../shared/types/ipc'

interface FilaPdf {
  nombre_rol: string
  folio_interno: string
  tipo_documento: string
  nombre_normalizado: string
  nombre_original: string
  universidad_origen: string | null
  ponencia: string | null
  texto_generado: string
  fecha_constancia: string
}

async function elegirCarpeta(): Promise<string | null> {
  const seleccion = await dialog.showOpenDialog({
    title: 'Selecciona la carpeta donde se guardarán los PDFs',
    properties: ['openDirectory', 'createDirectory'],
  })
  return seleccion.canceled || seleccion.filePaths.length === 0 ? null : seleccion.filePaths[0]
}

function rellenar(indice: number): string {
  return String(indice).padStart(4, '0')
}

async function generarPrevisualizacion(entrada: PrevisualizarEntrada): Promise<string> {
  const folio = entrada.folioEvento?.trim() ?? ''

  if (entrada.modo === 'graduacion') {
    const filas = entrada.filasGraduacion ?? []
    const validas = filas.filter((fila) => !fila.error)
    const indice = validas.findIndex((fila) => fila.numeroFila === entrada.numeroFila)
    const fila = indice >= 0 ? validas[indice] : filas.find((item) => item.numeroFila === entrada.numeroFila)
    if (!fila) throw new Error(`No se encontró la fila ${entrada.numeroFila} para previsualizar.`)

    const documento: DatosDocumentoPdf = {
      folioInterno: `${folio || 'SIN-FOLIO'}-${rellenar(Math.max(indice, 0) + 1)}`,
      encabezado: 'RECONOCIMIENTO',
      nombre: formatearNombreGraduacion(fila.nombreOriginal),
      institucion: null,
      ponencia: null,
      texto: fila.textoGenerado ?? '',
      fecha: fila.fecha,
      ...opcionesCuerpoGraduacion(fila.generacion, fila.carrera),
    }
    const { recursos } = await armarRecursos(carpetaResources(), null, null)
    return crearHtmlDocumento(
      [crearPaginaGraduacion(documento, obtenerConfiguracionFirmantesGraduacion())],
      recursos,
      { previsualizacion: true },
    )
  }

  const filas = entrada.filasRegular ?? []
  const validas = filas.filter((fila) => !fila.error)
  const indice = validas.findIndex((fila) => fila.numeroFila === entrada.numeroFila)
  const fila = indice >= 0 ? validas[indice] : filas.find((item) => item.numeroFila === entrada.numeroFila)
  if (!fila) throw new Error(`No se encontró la fila ${entrada.numeroFila} para previsualizar.`)

  const encabezados = calcularEncabezadosPorFila(filas)
  const documento: DatosDocumentoPdf = {
    folioInterno: `${folio || 'SIN-FOLIO'}-${rellenar(Math.max(indice, 0) + 1)}`,
    encabezado: encabezados.get(fila.numeroFila) ?? 'CONSTANCIA',
    nombre: fila.nombreNormalizado ?? fila.nombreOriginal,
    institucion: institucionParaDocumento(fila.universidadOrigen),
    ponencia: fila.nombrePonencia,
    texto: fila.textoGenerado ?? '',
    fecha: fila.fechaConstancia,
  }
  const sello = obtenerConfiguracionSello()
  const rutaQr = folio ? (buscarQrPorFolio(folio)?.rutaArchivo ?? null) : null
  const { recursos } = await armarRecursos(carpetaResources(), rutaQr, sello)
  return crearHtmlDocumento([crearPaginaRegular(documento, sello)], recursos, { previsualizacion: true })
}

export function registrarManejadorGenerarPdfs(): void {
  ipcMain.handle('pdf:seleccionarCarpeta', () => elegirCarpeta())

  ipcMain.handle('pdf:previsualizar', (_evento, entrada: PrevisualizarEntrada) =>
    generarPrevisualizacion(entrada),
  )

  ipcMain.handle(
    'pdf:generar',
    async (_evento, entrada: GenerarPdfsEntrada): Promise<GenerarPdfsResultado> => {
      const folio = entrada?.folioEvento?.trim()
      if (!folio) throw new Error('El folio del evento es obligatorio para generar PDFs.')
      const evento = obtenerEventoPorFolio(folio)
      if (!evento) throw new Error(`No se encontró un evento con el folio "${folio}".`)

      const carpetaDestino = entrada.carpetaDestino?.trim() || (await elegirCarpeta())
      if (!carpetaDestino) throw new Error('No se seleccionó una carpeta de destino.')

      const filas = obtenerBaseDeDatos()
        .prepare(
          `SELECT r.nombre_rol, c.folio_interno, c.tipo_documento, c.ponencia, c.texto_generado,
             e.fecha_constancia, p.nombre_normalizado, p.nombre_original, p.universidad_origen
           FROM constancia c
           JOIN rol r ON r.id = c.rol_id
           JOIN evento e ON e.id = c.evento_id
           JOIN constancia_participante cp ON cp.constancia_id = c.id
           JOIN participante p ON p.id = cp.participante_id
           WHERE c.evento_id = ? AND c.estado = 'generada'
           ORDER BY r.nombre_rol, c.id, p.id`,
        )
        .all(evento.id) as FilaPdf[]

      const esGraduacion = evento.tipoPlantilla === 'graduacion'
      const extraGraduacion = esGraduacion ? opcionesCuerpoGraduacion(evento.generacion, evento.carrera) : {}
      const gruposMap = new Map<string, GrupoPdf>()
      for (const fila of filas) {
        const grupo = gruposMap.get(fila.nombre_rol) ?? { nombreRol: fila.nombre_rol, documentos: [] }
        const nombre = esGraduacion ? formatearNombreGraduacion(fila.nombre_original) : fila.nombre_normalizado
        const documento = grupo.documentos.find((item) => item.folioInterno === fila.folio_interno)
        if (!documento) {
          grupo.documentos.push({
            folioInterno: fila.folio_interno,
            encabezado: fila.tipo_documento === 'reconocimiento' ? 'RECONOCIMIENTO' : 'CONSTANCIA',
            nombre,
            institucion: institucionParaDocumento(fila.universidad_origen),
            ponencia: fila.ponencia,
            texto: fila.texto_generado,
            fecha: fila.fecha_constancia,
            ...extraGraduacion,
          })
        } else {
          documento.nombre = `${documento.nombre}, ${nombre}`
        }
        gruposMap.set(fila.nombre_rol, grupo)
      }

      const sello = obtenerConfiguracionSello()
      const resultado = await generarPdfsPorRol(
        evento,
        [...gruposMap.values()],
        carpetaDestino,
        sello,
        obtenerConfiguracionFirmantesGraduacion(),
      )

      const advertencias = [...resultado.advertencias]
      if (!esGraduacion) {
        if (!evento.rutaQr) {
          advertencias.push(
            `No se encontró el QR para el folio ${evento.folio}. Los documentos salieron sin QR; puedes cargarlo en el Editor de sellos/QR.`,
          )
        }
        if (!(sello.nombreFirmante ?? sello.nombreDirectora)?.trim()) {
          advertencias.push('La configuración de firma no tiene nombre de firmante; revisa el Editor de sellos/QR.')
        }
      }

      return {
        rutas: resultado.roles.map((rol) => rol.ruta),
        carpetaEvento: resultado.carpetaEvento,
        roles: resultado.roles,
        errores: resultado.errores,
        advertencias,
      }
    },
  )
}
