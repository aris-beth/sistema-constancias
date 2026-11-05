import { useEffect, useMemo, useState } from 'react'
import { Button, Card } from '../components/UI'
import type { FolioCatalogoEntry } from '../../shared/types/configuracion'

interface Props {
  onVolver: () => void
  onCorregirEvento: (folio: string) => Promise<void>
}

interface Borrador {
  folio: string
  nombreReferencia: string
}

function normalizarBusqueda(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .trim()
}

function claveEntrada(entrada: FolioCatalogoEntry): string {
  return `${entrada.origen}-${entrada.id}`
}

function etiquetaOrigen(entrada: FolioCatalogoEntry): string {
  return entrada.origen === 'evento' ? 'Evento guardado' : 'Capturado a mano'
}

function fechaLegible(valor: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return valor

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha)
}

export default function CatalogoFolios({ onVolver, onCorregirEvento }: Props) {
  const [folios, setFolios] = useState<FolioCatalogoEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [editandoClave, setEditandoClave] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<Borrador>({ folio: '', nombreReferencia: '' })
  const [nuevo, setNuevo] = useState<Borrador>({ folio: '', nombreReferencia: '' })
  const [abriendoCorrecciones, setAbriendoCorrecciones] = useState(false)

  useEffect(() => {
    void cargarFolios()
  }, [])

  const foliosFiltrados = useMemo(() => {
    const consulta = normalizarBusqueda(busqueda)
    if (!consulta) return folios

    return folios.filter((entrada) =>
      normalizarBusqueda(`${entrada.folio} ${entrada.nombreReferencia ?? ''}`).includes(consulta),
    )
  }, [busqueda, folios])

  async function cargarFolios(): Promise<void> {
    setCargando(true)
    setError(null)
    try {
      setFolios(await window.electronAPI.listarFolios())
    } catch (errorActual) {
      mostrarError(errorActual)
    } finally {
      setCargando(false)
    }
  }

  async function recargar(): Promise<void> {
    setCargando(true)
    setError(null)
    try {
      setFolios(await window.electronAPI.listarFolios())
    } catch (errorActual) {
      mostrarError(errorActual)
      throw errorActual
    } finally {
      setCargando(false)
    }
  }

  function mostrarError(errorActual: unknown): void {
    setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
  }

  async function agregar(): Promise<void> {
    setError(null)
    setMensaje(null)
    setOcupado(true)
    try {
      const registrado = await window.electronAPI.registrarFolio({
        folio: nuevo.folio.trim(),
        nombreReferencia: nuevo.nombreReferencia.trim() || null,
      })
      setNuevo({ folio: '', nombreReferencia: '' })
      await recargar()
      setMensaje(`Folio ${registrado.folio} registrado correctamente.`)
    } catch (errorActual) {
      mostrarError(errorActual)
    } finally {
      setOcupado(false)
    }
  }

  function empezarEdicion(entrada: FolioCatalogoEntry): void {
    setEditandoClave(claveEntrada(entrada))
    setBorrador({ folio: entrada.folio, nombreReferencia: entrada.nombreReferencia ?? '' })
    setError(null)
    setMensaje(null)
  }

  async function guardarEdicion(entrada: FolioCatalogoEntry): Promise<void> {
    setError(null)
    setMensaje(null)
    setOcupado(true)
    try {
      const actualizado = await window.electronAPI.actualizarFolio({
        id: entrada.id,
        origen: entrada.origen,
        folio: borrador.folio.trim(),
        nombreReferencia: borrador.nombreReferencia.trim() || null,
      })
      await recargar()
      setEditandoClave(null)
      setMensaje(
        entrada.origen === 'evento'
          ? `Folio ${actualizado.folio} actualizado en el evento y en sus constancias. Vuelve a generar los PDF para que lo reflejen.`
          : `Folio ${actualizado.folio} actualizado correctamente.`,
      )
    } catch (errorActual) {
      mostrarError(errorActual)
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(entrada: FolioCatalogoEntry): Promise<void> {
    const mensajeConfirmacion = entrada.origen === 'evento'
      ? `El folio ${entrada.folio} pertenece al evento "${entrada.nombreReferencia ?? 'sin nombre'}". Se eliminarán permanentemente el evento y sus constancias de la base de datos. Los PDF ya generados permanecerán en sus carpetas. Esta acción no se puede deshacer. ¿Deseas continuar?`
      : `¿Eliminar el folio ${entrada.folio} del catálogo? Esto solo quitará la reserva manual y dejará el folio libre; no eliminará eventos ni constancias.`
    if (!window.confirm(mensajeConfirmacion)) return
    setError(null)
    setMensaje(null)
    setOcupado(true)
    try {
      await window.electronAPI.eliminarFolio({ id: entrada.id, origen: entrada.origen })
      await recargar()
      setMensaje(`Folio ${entrada.folio} eliminado correctamente.`)
    } catch (errorActual) {
      mostrarError(errorActual)
    } finally {
      setOcupado(false)
    }
  }

  async function abrirCorrecciones(entrada: FolioCatalogoEntry): Promise<void> {
    setError(null)
    setMensaje(null)
    setAbriendoCorrecciones(true)
    try {
      await onCorregirEvento(entrada.folio)
    } catch (errorActual) {
      mostrarError(errorActual)
    } finally {
      setAbriendoCorrecciones(false)
    }
  }

  const formularioOcupado = ocupado || cargando || abriendoCorrecciones

  return (
    <div className="catalogo-page">
      <div className="catalogo-header">
        <div>
          <Button variant="text" type="button" onClick={onVolver} disabled={formularioOcupado}>← Regresar a edición de plantillas</Button>
          <p className="app-kicker">Catálogo</p>
          <h2>Catálogo de folios</h2>
          <p>Administra folios reservados: agrega, busca, corrige o elimina registros. Los folios nuevos de eventos se generan automáticamente.</p>
        </div>
        <span className="badge badge--neutral">{folios.length} {folios.length === 1 ? 'folio' : 'folios'}</span>
      </div>

      {error && <p className="status-message status-message--error" role="alert">Error: {error}</p>}
      {mensaje && <p className="status-message status-message--success" role="status">{mensaje}</p>}

      <Card>
        <form className="folio-form" onSubmit={(evento) => { evento.preventDefault(); void agregar() }}>
          <label className="field" htmlFor="folio-nuevo">Folio<input id="folio-nuevo" value={nuevo.folio} onChange={(e) => setNuevo({ ...nuevo, folio: e.target.value })} placeholder="Ej. EFAC-2026-001" autoComplete="off" disabled={ocupado} /></label>
          <label className="field" htmlFor="folio-referencia-nueva">Referencia (opcional)<input id="folio-referencia-nueva" value={nuevo.nombreReferencia} onChange={(e) => setNuevo({ ...nuevo, nombreReferencia: e.target.value })} placeholder="Nombre del evento" disabled={ocupado} /></label>
          <Button type="submit" disabled={formularioOcupado || !nuevo.folio.trim()}>{ocupado ? 'Guardando...' : 'Agregar folio'}</Button>
        </form>

        <div className="catalogo-tools">
          <label className="field catalogo-search" htmlFor="buscar-folio">
            Buscar folio o referencia
            <input
              id="buscar-folio"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Escribe para filtrar"
            />
          </label>
          <Button variant="secondary" type="button" onClick={() => void recargar()} disabled={cargando || ocupado}>
            {cargando ? 'Cargando...' : 'Actualizar lista'}
          </Button>
        </div>

        {cargando && <p role="status">Cargando folios...</p>}
        {!cargando && !error && folios.length === 0 && <p>No hay folios registrados. Agrega uno con el formulario.</p>}
        {!cargando && folios.length > 0 && foliosFiltrados.length === 0 && (
          <p role="status">No hay folios que coincidan con “{busqueda}”.</p>
        )}
        {!cargando && foliosFiltrados.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Folio</th><th>Referencia</th><th>Origen</th><th>Fecha de registro</th><th>Acciones</th></tr></thead>
              <tbody>
                {foliosFiltrados.map((entrada) => editandoClave === claveEntrada(entrada) ? (
                  <tr key={claveEntrada(entrada)}>
                    <td><label className="catalogo-edit-field"><span className="visually-hidden">Folio</span><input value={borrador.folio} onChange={(e) => setBorrador({ ...borrador, folio: e.target.value })} /></label></td>
                    <td><label className="catalogo-edit-field"><span className="visually-hidden">Referencia</span><input value={borrador.nombreReferencia} disabled={entrada.origen === 'evento'} onChange={(e) => setBorrador({ ...borrador, nombreReferencia: e.target.value })} /></label></td>
                    <td>{etiquetaOrigen(entrada)}</td>
                    <td>{fechaLegible(entrada.fechaRegistro)}</td>
                    <td>
                      <div className="catalogo-row-actions">
                        <Button type="button" onClick={() => void guardarEdicion(entrada)} disabled={formularioOcupado || !borrador.folio.trim()}>Guardar</Button>
                        <Button variant="text" type="button" onClick={() => setEditandoClave(null)} disabled={ocupado}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={claveEntrada(entrada)}>
                    <td>{entrada.folio}</td>
                    <td>{entrada.nombreReferencia ?? '—'}</td>
                    <td>{etiquetaOrigen(entrada)}</td>
                    <td>{fechaLegible(entrada.fechaRegistro)}</td>
                    <td>
                      <div className="catalogo-row-actions">
                        {entrada.origen === 'evento' && (
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => void abrirCorrecciones(entrada)}
                            disabled={formularioOcupado}
                          >
                            {abriendoCorrecciones ? 'Abriendo...' : 'Corregir constancias'}
                          </Button>
                        )}
                        <Button variant="secondary" type="button" onClick={() => empezarEdicion(entrada)} disabled={formularioOcupado}>Editar</Button>
                        <Button variant="text" type="button" onClick={() => void eliminar(entrada)} disabled={formularioOcupado}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!cargando && foliosFiltrados.length > 0 && (
          <p className="catalogo-result-count" role="status">
            Mostrando {foliosFiltrados.length} de {folios.length} folios.
          </p>
        )}
      </Card>
    </div>
  )
}
