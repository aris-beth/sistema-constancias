import { describe, expect, it } from 'vitest'
import { calcularEncabezadosPorFila } from './calcularEncabezados'

const fila = (numeroFila: number, nombreNormalizado: string | null, error: string | null = null) => ({
  numeroFila,
  nombreNormalizado,
  error,
})

describe('calcularEncabezadosPorFila', () => {
  it('la 7ª aparición de una persona pasa a RECONOCIMIENTO', () => {
    const filas = Array.from({ length: 7 }, (_v, i) => fila(i + 2, 'PEREZ JUAN'))
    const resultado = calcularEncabezadosPorFila(filas)
    expect(resultado.get(7)).toBe('CONSTANCIA')
    expect(resultado.get(8)).toBe('RECONOCIMIENTO')
  })

  it('usa el máximo configurado: con máximo 2, la 3ª aparición es RECONOCIMIENTO', () => {
    const filas = Array.from({ length: 3 }, (_v, i) => fila(i + 2, 'PEREZ JUAN'))
    const resultado = calcularEncabezadosPorFila(filas, 2)
    expect(resultado.get(3)).toBe('CONSTANCIA')
    expect(resultado.get(4)).toBe('RECONOCIMIENTO')
  })

  it('las filas con error no cuentan para el conteo', () => {
    const filas = [
      ...Array.from({ length: 6 }, (_v, i) => fila(i + 2, 'PEREZ JUAN')),
      fila(8, null, 'nombre vacío'),
      fila(9, 'PEREZ JUAN'),
    ]
    const resultado = calcularEncabezadosPorFila(filas)
    expect(resultado.has(8)).toBe(false)
    expect(resultado.get(9)).toBe('RECONOCIMIENTO')
  })
})
