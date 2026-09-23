import { describe, expect, it } from 'vitest'
import { autoajustarTexto } from '../../electron/business/autoajuste/autoajustarTexto'

describe('autoajustarTexto', () => {
  describe('tipo "nombre"', () => {
    it('usa el nivel más grande (16pt, 1 línea) para un nombre típico corto', () => {
      const resultado = autoajustarTexto('PEREZ LOPEZ JUAN', 'nombre')
      expect(resultado.tamanoFuentePt).toBe(16)
      expect(resultado.lineas).toEqual(['PEREZ LOPEZ JUAN'])
      expect(resultado.excedeLimiteCalibrado).toBe(false)
    })

    it('usa 14pt y hasta 2 líneas para un nombre de 41 a 80 caracteres', () => {
      const nombreDe50Caracteres = 'A'.repeat(50)
      const resultado = autoajustarTexto(nombreDe50Caracteres, 'nombre')
      expect(resultado.tamanoFuentePt).toBe(14)
      expect(resultado.excedeLimiteCalibrado).toBe(false)
    })

    it('caso de aceptación #1: nombre de ~168 caracteres (equipo de 6 personas) se distribuye sin desbordar', () => {
      const seisNombres = [
        'HERNÁNDEZ GARCÍA MARÍA FERNANDA',
        'RODRÍGUEZ MARTÍNEZ JOSÉ ALBERTO',
        'GONZÁLEZ PÉREZ ANA SOFÍA',
        'LÓPEZ RAMÍREZ CARLOS EDUARDO',
        'SÁNCHEZ TORRES DANIELA GUADALUPE',
        'FLORES JIMÉNEZ LUIS FERNANDO',
      ]
      const nombreGrupal = seisNombres.join(', ')
      expect(nombreGrupal.length).toBeGreaterThanOrEqual(160)
      expect(nombreGrupal.length).toBeLessThanOrEqual(200)

      const resultado = autoajustarTexto(nombreGrupal, 'nombre')

      expect(resultado.tamanoFuentePt).toBe(11)
      expect(resultado.lineas.length).toBeLessThanOrEqual(3)
      expect(resultado.lineas.length).toBeGreaterThan(1)
      // No se pierde ningún nombre del equipo en la distribución.
      for (const nombre of seisNombres) {
        expect(resultado.lineas.join(' ')).toContain(nombre)
      }
    })

    it('un nombre más largo que el máximo calibrado (168) igual produce un resultado usable, marcado', () => {
      const nombreExtremo = 'A'.repeat(250)
      const resultado = autoajustarTexto(nombreExtremo, 'nombre')
      expect(resultado.excedeLimiteCalibrado).toBe(true)
      expect(resultado.tamanoFuentePt).toBe(11)
      expect(resultado.lineas.join('')).toContain(nombreExtremo)
    })

    it('rechaza un texto vacío', () => {
      expect(() => autoajustarTexto('   ', 'nombre')).toThrow(/vacío/)
    })
  })

  describe('tipo "ponencia"', () => {
    it('usa 12pt y 1 línea para una ponencia típica corta', () => {
      const resultado = autoajustarTexto('Modelos de aprendizaje profundo', 'ponencia')
      expect(resultado.tamanoFuentePt).toBe(12)
      expect(resultado.lineas).toHaveLength(1)
    })

    it('caso de aceptación #2: título de ponencia de 130+ caracteres se parte en líneas adicionales', () => {
      const tituloLargo =
        'Un análisis comparativo de arquitecturas de redes neuronales convolucionales ' +
        'aplicadas a la clasificación automática de especies vegetales endémicas de Puebla'
      expect(tituloLargo.length).toBeGreaterThan(130)

      const resultado = autoajustarTexto(tituloLargo, 'ponencia')

      expect(resultado.tamanoFuentePt).toBe(11)
      expect(resultado.lineas.length).toBeGreaterThan(1)
      expect(resultado.lineas.length).toBeLessThanOrEqual(3)
      // El texto completo se conserva (ninguna palabra se pierde al partir líneas).
      const textoReconstruido = resultado.lineas.join(' ').replace(/\s+/g, ' ')
      expect(textoReconstruido).toBe(tituloLargo.replace(/\s+/g, ' '))
    })
  })
})
