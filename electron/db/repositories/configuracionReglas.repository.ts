import { obtenerBaseDeDatos } from '../connection'
import type {
  ConfiguracionReglas,
  ConfiguracionReglasActualizable,
} from '../../../shared/types/configuracion'
import {
  MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
  MAX_CONSTANCIAS_POR_PERSONA_LIMITE,
} from '../../business/reglas/determinarTipoDocumento'

interface FilaConfiguracionReglas {
  max_constancias_por_persona: number
  fecha_actualizacion: string
}

function mapearFila(fila: FilaConfiguracionReglas): ConfiguracionReglas {
  return {
    maxConstanciasPorPersona: fila.max_constancias_por_persona,
    fechaActualizacion: fila.fecha_actualizacion,
  }
}

/**
 * `configuracion_reglas` es un singleton (siempre la fila id = 1) creado por
 * el seed de `schema.ts`. Si por cualquier motivo no existe, se devuelve el
 * valor predeterminado en lugar de impedir que se guarde o previsualice un
 * lote: la regla de reconocimiento nunca debe dejar la app inutilizable.
 */
export function obtenerConfiguracionReglas(): ConfiguracionReglas {
  const fila = obtenerBaseDeDatos()
    .prepare('SELECT max_constancias_por_persona, fecha_actualizacion FROM configuracion_reglas WHERE id = 1')
    .get() as FilaConfiguracionReglas | undefined

  if (!fila) {
    return {
      maxConstanciasPorPersona: MAX_CONSTANCIAS_POR_PERSONA_PREDETERMINADO,
      fechaActualizacion: '',
    }
  }
  return mapearFila(fila)
}

export function actualizarConfiguracionReglas(
  datos: ConfiguracionReglasActualizable,
): ConfiguracionReglas {
  const maximo = datos?.maxConstanciasPorPersona
  if (!Number.isInteger(maximo) || maximo < 1 || maximo > MAX_CONSTANCIAS_POR_PERSONA_LIMITE) {
    throw new Error(
      `El máximo de constancias por persona debe ser un número entero entre 1 y ${MAX_CONSTANCIAS_POR_PERSONA_LIMITE}.`,
    )
  }

  const db = obtenerBaseDeDatos()
  db.prepare(
    `INSERT INTO configuracion_reglas (id, max_constancias_por_persona, fecha_actualizacion)
     VALUES (1, @maximo, @fecha)
     ON CONFLICT(id) DO UPDATE SET
       max_constancias_por_persona = excluded.max_constancias_por_persona,
       fecha_actualizacion = excluded.fecha_actualizacion`,
  ).run({ maximo, fecha: new Date().toISOString() })

  return obtenerConfiguracionReglas()
}
