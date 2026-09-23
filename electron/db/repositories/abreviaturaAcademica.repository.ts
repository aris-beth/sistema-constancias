import { obtenerBaseDeDatos } from '../connection'

export interface AbreviaturaAcademica {
  id: number
  formaEncontrada: string
  abreviaturaAceptada: string
}

interface FilaAbreviatura {
  id: number
  forma_encontrada: string
  abreviatura_aceptada: string
}

function mapearFila(fila: FilaAbreviatura): AbreviaturaAcademica {
  return {
    id: fila.id,
    formaEncontrada: fila.forma_encontrada,
    abreviaturaAceptada: fila.abreviatura_aceptada,
  }
}

export function agregarAbreviatura(
  formaEncontrada: string,
  abreviaturaAceptada: string,
): AbreviaturaAcademica {
  const db = obtenerBaseDeDatos()
  const insertar = db.prepare(
    'INSERT INTO abreviatura_academica (forma_encontrada, abreviatura_aceptada) VALUES (?, ?)',
  )
  const resultado = insertar.run(formaEncontrada, abreviaturaAceptada)
  const fila = db
    .prepare('SELECT * FROM abreviatura_academica WHERE id = ?')
    .get(Number(resultado.lastInsertRowid)) as FilaAbreviatura
  return mapearFila(fila)
}

/**
 * Trae el catálogo completo de una sola vez. El normalizador de nombres
 * lo carga una vez en memoria al procesar un lote, en vez de hacer una
 * consulta por cada nombre del Excel (más rápido para lotes de hasta
 * 543 constancias, como exige tu requisito no funcional).
 */
export function listarAbreviaturas(): AbreviaturaAcademica[] {
  const db = obtenerBaseDeDatos()
  const filas = db.prepare('SELECT * FROM abreviatura_academica').all() as FilaAbreviatura[]
  return filas.map(mapearFila)
}
