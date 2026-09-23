import { obtenerBaseDeDatos } from '../connection'
import type { GuardarGraduacionResultado, FilaProcesadaGraduacion } from '../../../shared/types/ipc'

function normalizarClave(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function obtenerAnio(fecha: string): string {
  const coincidencia = fecha.match(/(?:^|\/|-)(\d{4})$/) ?? fecha.match(/\b(\d{4})\b/)
  if (!coincidencia) throw new Error(`No se pudo obtener el año de la fecha "${fecha}".`)
  return coincidencia[1]
}

function obtenerIniciales(nombreEvento: string): string {
  const palabrasIgnoradas = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN'])
  const palabras = normalizarClave(nombreEvento)
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((palabra) => palabra && !palabrasIgnoradas.has(palabra))
  const iniciales = palabras.map((palabra) => palabra[0]).join('').slice(0, 8)
  return iniciales || 'GRAD'
}

export function generarFolioGraduacion(
  db: ReturnType<typeof obtenerBaseDeDatos>,
  nombreEvento: string,
  fecha: string,
): string {
  const prefijo = `${obtenerIniciales(nombreEvento)}-${obtenerAnio(fecha)}`
  const usados = new Set<string>()
  const eventos = db.prepare('SELECT folio FROM evento').all() as Array<{ folio: string }>
  const qrs = db.prepare('SELECT folio_evento FROM qr_catalogo').all() as Array<{ folio_evento: string }>
  for (const evento of eventos) usados.add(evento.folio)
  for (const qr of qrs) usados.add(qr.folio_evento)

  let lote = 1
  while (usados.has(`${prefijo}-${String(lote).padStart(3, '0')}`)) lote += 1
  return `${prefijo}-${String(lote).padStart(3, '0')}`
}

export function guardarLoteGraduacion(
  folioSolicitado: string | null,
  filas: FilaProcesadaGraduacion[],
): GuardarGraduacionResultado {
  const validas = filas.filter((fila) => fila.error === null)
  if (validas.length === 0) throw new Error('No hay filas válidas de graduación para guardar.')
  for (const fila of validas) {
    if (!fila.nombreNormalizado?.trim()) throw new Error(`La fila ${fila.numeroFila} requiere un nombre normalizado.`)
    if (!fila.textoGenerado?.trim()) throw new Error(`La fila ${fila.numeroFila} no tiene texto generado.`)
  }

  const primera = validas[0]
  const nombreEvento = `Reconocimientos de graduación ${primera.generacion}`
  const db = obtenerBaseDeDatos()
  const folio = folioSolicitado?.trim() || generarFolioGraduacion(db, nombreEvento, primera.fecha)
  if (db.prepare('SELECT id FROM evento WHERE folio = ?').get(folio)) {
    throw new Error(`Ya existe un evento registrado con el folio "${folio}".`)
  }
  if (db.prepare('SELECT id FROM qr_catalogo WHERE folio_evento = ?').get(folio)) {
    throw new Error(`El folio "${folio}" ya está asociado a un código QR.`)
  }

  const transaccion = db.transaction(() => {
    const evento = db.prepare(
      `INSERT INTO evento (folio, nombre_evento, fecha_constancia, modalidad, tipo_plantilla, generacion, carrera, ruta_qr)
       VALUES (?, ?, ?, 'Otro', 'graduacion', ?, ?, NULL)`,
    ).run(folio, nombreEvento, primera.fecha, primera.generacion, primera.carrera)
    const eventoId = Number(evento.lastInsertRowid)
    const roles = new Map<string, number>()
    const obtenerRol = db.prepare('SELECT id FROM rol WHERE nombre_rol = ?')
    const insertarRol = db.prepare('INSERT INTO rol (nombre_rol, plantilla_texto) VALUES (?, ?)')
    const obtenerParticipante = db.prepare('SELECT id FROM participante WHERE nombre_normalizado = ?')
    const insertarParticipante = db.prepare(
      `INSERT INTO participante (nombre_original, nombre_normalizado, grado_academico, categoria, universidad_origen)
       VALUES (?, ?, NULL, NULL, NULL)`,
    )
    const insertarConstancia = db.prepare(
      `INSERT INTO constancia (evento_id, rol_id, ponencia, texto_generado, es_personalizado,
       tipo_documento, numero_para_persona_evento, fecha_generacion, folio_interno, estado)
       VALUES (?, ?, NULL, ?, 0, 'reconocimiento', 1, ?, ?, 'generada')`,
    )
    const insertarRelacion = db.prepare(
      'INSERT INTO constancia_participante (constancia_id, participante_id) VALUES (?, ?)',
    )
    const foliosInternos: string[] = []

    validas.forEach((fila, indice) => {
      const rolNombre = `Graduación - ${fila.subtipo.trim()}`
      let rolId = roles.get(rolNombre)
      if (!rolId) {
        const existente = obtenerRol.get(rolNombre) as { id: number } | undefined
        rolId = existente?.id ?? Number(insertarRol.run(rolNombre, fila.textoGenerado).lastInsertRowid)
        roles.set(rolNombre, rolId)
      }
      const nombreOriginal = fila.nombreOriginal.trim()
      const participanteExistente = obtenerParticipante.get(fila.nombreNormalizado) as { id: number } | undefined
      const participanteId = participanteExistente?.id ?? Number(
        insertarParticipante.run(nombreOriginal, fila.nombreNormalizado).lastInsertRowid,
      )
      const folioInterno = `${folio}-${String(indice + 1).padStart(4, '0')}`
      const constancia = insertarConstancia.run(
        eventoId,
        rolId,
        fila.textoGenerado,
        new Date().toISOString(),
        folioInterno,
      )
      insertarRelacion.run(Number(constancia.lastInsertRowid), participanteId)
      foliosInternos.push(folioInterno)
    })

    return {
      folioEvento: folio,
      nombreEvento,
      reconocimientosCreados: validas.length,
      foliosInternos,
    }
  })
  return transaccion()
}
