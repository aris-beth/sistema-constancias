import { obtenerBaseDeDatos } from '../connection'
import type {
  DesgloseEstadisticas,
  FiltrosEstadisticas,
  PuntoTendenciaEstadisticas,
  ResultadoEstadisticas,
} from '../../../shared/types/ipc'

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function fechaIso(valor: string): string | null {
  const texto = valor.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(texto)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`

  const latino = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto)
  if (latino) return `${latino[3]}-${latino[2].padStart(2, '0')}-${latino[1].padStart(2, '0')}`

  const localizada = /^(\d{1,2}) de ([\p{L}]+) de (\d{4})$/iu.exec(texto)
  if (!localizada) return null
  const mes = MESES[localizada[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()]
  return mes
    ? `${localizada[3]}-${String(mes).padStart(2, '0')}-${localizada[1].padStart(2, '0')}`
    : null
}

function obtenerIdsEventos(filtros: FiltrosEstadisticas): number[] {
  const db = obtenerBaseDeDatos()
  const parametros: unknown[] = []
  const condiciones = ['1 = 1']
  if (filtros.folioEvento?.trim()) {
    condiciones.push('folio = ?')
    parametros.push(filtros.folioEvento.trim())
  }
  const filas = db
    .prepare(`SELECT id, fecha_constancia FROM evento WHERE ${condiciones.join(' AND ')}`)
    .all(...parametros) as Array<{ id: number; fecha_constancia: string }>
  const desde = filtros.fechaDesde ? fechaIso(filtros.fechaDesde) : null
  const hasta = filtros.fechaHasta ? fechaIso(filtros.fechaHasta) : null

  return filas
    .filter((fila) => {
      const fecha = fechaIso(fila.fecha_constancia)
      if (!fecha) return false
      return (!desde || fecha >= desde) && (!hasta || fecha <= hasta)
    })
    .map((fila) => fila.id)
}

function listaIdsSql(ids: number[]): { clausula: string; parametros: number[] } {
  return ids.length
    ? { clausula: `c.evento_id IN (${ids.map(() => '?').join(', ')})`, parametros: ids }
    : { clausula: '1 = 0', parametros: [] }
}

function desglose(filas: Array<{ etiqueta: string | null; documentos: number }>): DesgloseEstadisticas[] {
  return filas.map((fila) => ({ etiqueta: fila.etiqueta || 'Sin categoría', documentos: Number(fila.documentos) }))
}

export function consultarEstadisticas(filtros: FiltrosEstadisticas): ResultadoEstadisticas {
  const db = obtenerBaseDeDatos()
  const ids = obtenerIdsEventos(filtros)
  const idsSql = listaIdsSql(ids)
  const where = `${idsSql.clausula} AND c.estado = 'generada'`
  const total = db.prepare(`
    SELECT COUNT(DISTINCT c.evento_id) AS eventos,
           COUNT(DISTINCT c.id) AS documentos,
           COUNT(DISTINCT CASE WHEN c.tipo_documento = 'reconocimiento' THEN c.id END) AS reconocimientos
    FROM constancia c WHERE ${where}
  `).get(...idsSql.parametros) as { eventos: number; documentos: number; reconocimientos: number }

  const porRol = db.prepare(`
    SELECT r.nombre_rol AS etiqueta, COUNT(DISTINCT c.id) AS documentos
    FROM constancia c JOIN rol r ON r.id = c.rol_id
    WHERE ${where} GROUP BY r.nombre_rol ORDER BY documentos DESC, etiqueta
  `).all(...idsSql.parametros) as Array<{ etiqueta: string; documentos: number }>

  const porCategoria = db.prepare(`
    SELECT p.categoria AS etiqueta, COUNT(DISTINCT c.id) AS documentos
    FROM constancia c
    JOIN constancia_participante cp ON cp.constancia_id = c.id
    JOIN participante p ON p.id = cp.participante_id
    WHERE ${where} GROUP BY p.categoria ORDER BY documentos DESC, etiqueta
  `).all(...idsSql.parametros) as Array<{ etiqueta: string | null; documentos: number }>

  // La identidad disponible en este modelo es nombre_normalizado; dos personas
  // distintas con el mismo nombre normalizado se contabilizan como una sola.
  const personas = db.prepare(`
    SELECT p.nombre_normalizado AS etiqueta, COUNT(DISTINCT c.id) AS documentos
    FROM constancia c
    JOIN constancia_participante cp ON cp.constancia_id = c.id
    JOIN participante p ON p.id = cp.participante_id
    WHERE ${where} GROUP BY p.nombre_normalizado ORDER BY documentos DESC, etiqueta LIMIT 10
  `).all(...idsSql.parametros) as Array<{ etiqueta: string; documentos: number }>

  const tendencia = db.prepare(`
    SELECT e.fecha_constancia AS fecha, COUNT(DISTINCT c.id) AS documentos,
           COUNT(DISTINCT c.evento_id) AS eventos
    FROM constancia c JOIN evento e ON e.id = c.evento_id
    WHERE ${where} GROUP BY e.fecha_constancia ORDER BY e.fecha_constancia
  `).all(...idsSql.parametros) as Array<{ fecha: string; documentos: number; eventos: number }>
  tendencia.sort((a, b) => (fechaIso(a.fecha) ?? a.fecha).localeCompare(fechaIso(b.fecha) ?? b.fecha))

  return {
    totalEventos: Number(total.eventos),
    totalDocumentos: Number(total.documentos),
    totalReconocimientos: Number(total.reconocimientos),
    porRol: desglose(porRol),
    porCategoria: desglose(porCategoria),
    personasConMasDocumentos: desglose(personas),
    tendencia: tendencia.map((punto): PuntoTendenciaEstadisticas => ({
      fecha: punto.fecha,
      documentos: Number(punto.documentos),
      eventos: Number(punto.eventos),
    })),
  }
}