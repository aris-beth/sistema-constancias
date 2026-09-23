import { obtenerBaseDeDatos } from '../connection'
import type { Participante, ParticipanteNuevo } from '../../../shared/types/participante'

interface FilaParticipante {
  id: number
  nombre_original: string
  nombre_normalizado: string
  grado_academico: string | null
  categoria: string | null
  universidad_origen: string | null
}

function mapearFila(fila: FilaParticipante): Participante {
  return {
    id: fila.id,
    nombreOriginal: fila.nombre_original,
    nombreNormalizado: fila.nombre_normalizado,
    gradoAcademico: fila.grado_academico,
    categoria: fila.categoria as Participante['categoria'],
    universidadOrigen: fila.universidad_origen,
  }
}

export function crearParticipante(datos: ParticipanteNuevo): Participante {
  const db = obtenerBaseDeDatos()

  const insertar = db.prepare(`
    INSERT INTO participante (nombre_original, nombre_normalizado, grado_academico, categoria, universidad_origen)
    VALUES (@nombreOriginal, @nombreNormalizado, @gradoAcademico, @categoria, @universidadOrigen)
  `)

  const resultado = insertar.run({
    nombreOriginal: datos.nombreOriginal,
    nombreNormalizado: datos.nombreNormalizado,
    gradoAcademico: datos.gradoAcademico,
    categoria: datos.categoria,
    universidadOrigen: datos.universidadOrigen,
  })

  const creado = obtenerParticipantePorId(Number(resultado.lastInsertRowid))
  if (!creado) {
    throw new Error('El participante se guardó pero no pudo recuperarse inmediatamente después.')
  }
  return creado
}

export function obtenerParticipantePorId(id: number): Participante | null {
  const db = obtenerBaseDeDatos()
  const fila = db.prepare('SELECT * FROM participante WHERE id = ?').get(id) as
    | FilaParticipante
    | undefined
  return fila ? mapearFila(fila) : null
}

/**
 * Busca un participante ya existente por su nombre normalizado. Se usa
 * antes de crear uno nuevo, para no duplicar a la misma persona si
 * aparece en varios eventos o varias veces en el mismo Excel.
 */
export function buscarParticipantePorNombreNormalizado(
  nombreNormalizado: string,
): Participante | null {
  const db = obtenerBaseDeDatos()
  const fila = db
    .prepare('SELECT * FROM participante WHERE nombre_normalizado = ?')
    .get(nombreNormalizado) as FilaParticipante | undefined
  return fila ? mapearFila(fila) : null
}

export function listarParticipantes(): Participante[] {
  const db = obtenerBaseDeDatos()
  const filas = db.prepare('SELECT * FROM participante ORDER BY nombre_normalizado').all() as FilaParticipante[]
  return filas.map(mapearFila)
}
