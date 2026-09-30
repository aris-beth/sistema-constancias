import { useEffect, useState } from 'react'
import { Button, Card } from '../components/UI'
import type { FolioCatalogoEntry } from '../../shared/types/configuracion'

interface Props {
  onVolver: () => void
}

interface Borrador {
  folio: string
  nombreReferencia: string
}

export default function CatalogoFolios({ onVolver }: Props) {
  const [folios, setFolios] = useState<FolioCatalogoEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [borrador, setBorrador] = useState<Borrador>({ folio: '', nombreReferencia: '' })
  const [nuevo, setNuevo] = useState<Borrador>({ folio: '', nombreReferencia: '' })

  useEffect(() => {
    void recargar().finally(() => setCargando(false))
  }, [])

  async function recargar(): Promise<void> {
    try {
      setFolios(await window.electronAPI.listarFolios())
    } catch (errorActual) {
      mostrarError(errorActual)
    }
  }

  function mostrarError(errorActual: unknown): void {
    setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
  }

  async function agregar(): Promise<void> {
    setError(null)
    setMensaje(null)
    try {
      const registrado = await window.electronAPI.registrarFolio({
        folio: nuevo.folio,
        nombreReferencia: nuevo.nombreReferencia.trim() || null,
      })
      setNuevo({ folio: '', nombreReferencia: '' })
      setMensaje(`Folio ${registrado.folio} registrado.`)
      await recargar()
    } catch (errorActual) {
      mostrarError(errorActual)
    }
  }

  function empezarEdicion(entrada: FolioCatalogoEntry): void {
    setEditandoId(entrada.id)
    setBorrador({ folio: entrada.folio, nombreReferencia: entrada.nombreReferencia ?? '' })
    setError(null)
    setMensaje(null)
  }

  async function guardarEdicion(id: number): Promise<void> {
    setError(null)
    try {
      const actualizado = await window.electronAPI.actualizarFolio({
        id,
        folio: borrador.folio,
        nombreReferencia: borrador.nombreReferencia.trim() || null,
      })
      setEditandoId(null)
      setMensaje(`Folio ${actualizado.folio} actualizado.`)
      await recargar()
    } catch (errorActual) {
      mostrarError(errorActual)
    }
  }

  async function eliminar(entrada: FolioCatalogoEntry): Promise<void> {
    if (!window.confirm(`¿Eliminar el folio ${entrada.folio} del catálogo?`)) return
    setError(null)
    try {
      await window.electronAPI.eliminarFolio(entrada.id)
      setMensaje(`Folio ${entrada.folio} eliminado.`)
      await recargar()
    } catch (errorActual) {
      mostrarError(errorActual)
    }
  }

  return (
    <div className="catalogo-page">
      <div className="catalogo-header">
        <div>
          <Button variant="text" type="button" onClick={onVolver}>← Regresar a edición de plantillas</Button>
          <p className="app-kicker">Catálogo</p>
          <h2>Catálogo de folios</h2>
          <p>Registra folios ya existentes o corrige uno autogenerado. Cada constancia lleva el folio del evento más un id consecutivo.</p>
        </div>
        <span className="badge badge--neutral">{folios.length} folios</span>
      </div>

      {cargando && <p>Cargando folios...</p>}
      {error && <p className="status-message status-message--error">Error: {error}</p>}
      {mensaje && <p className="status-message status-message--success">{mensaje}</p>}

      <Card>
        <div className="folio-form">
          <label className="field"><span>Folio</span><input value={nuevo.folio} onChange={(e) => setNuevo({ ...nuevo, folio: e.target.value })} placeholder="Ej. EFAC-2026-001" /></label>
          <label className="field"><span>Referencia (opcional)</span><input value={nuevo.nombreReferencia} onChange={(e) => setNuevo({ ...nuevo, nombreReferencia: e.target.value })} placeholder="Nombre del evento" /></label>
          <Button type="button" onClick={() => void agregar()} disabled={!nuevo.folio.trim()}>Agregar folio</Button>
        </div>

        {!cargando && folios.length === 0 && <p>No hay folios registrados.</p>}
        {folios.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Folio</th><th>Referencia</th><th>Fecha de registro</th><th>Acciones</th></tr></thead>
              <tbody>
                {folios.map((entrada) => editandoId === entrada.id ? (
                  <tr key={entrada.id}>
                    <td><input value={borrador.folio} onChange={(e) => setBorrador({ ...borrador, folio: e.target.value })} /></td>
                    <td><input value={borrador.nombreReferencia} onChange={(e) => setBorrador({ ...borrador, nombreReferencia: e.target.value })} /></td>
                    <td>{entrada.fechaRegistro}</td>
                    <td>
                      <Button type="button" onClick={() => void guardarEdicion(entrada.id)} disabled={!borrador.folio.trim()}>Guardar</Button>{' '}
                      <Button variant="text" type="button" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </td>
                  </tr>
                ) : (
                  <tr key={entrada.id}>
                    <td>{entrada.folio}</td>
                    <td>{entrada.nombreReferencia ?? '—'}</td>
                    <td>{entrada.fechaRegistro}</td>
                    <td>
                      <Button variant="secondary" type="button" onClick={() => empezarEdicion(entrada)}>Editar</Button>{' '}
                      <Button variant="text" type="button" onClick={() => void eliminar(entrada)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
