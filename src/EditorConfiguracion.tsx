import { useEffect, useState } from 'react'
import { Badge, Button, Card, Field } from './components/UI'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionReglas,
  ConfiguracionSello,
  FolioCatalogoEntry,
  OpcionSello,
} from '../shared/types/configuracion'

interface Props {
  onVolver: () => void
  onAbrirFolios: () => void
}

// file:// con cada segmento de ruta codificado aparte (encodeURIComponent):
// una ruta con espacios o acentos (bastante probable en Windows, p. ej.
// "C:/Users/María/Desktop/sello 2026.png") rompía la vista previa porque el
// <img src> no es una URL válida tal cual. La letra de unidad ("C:") se deja
// sin codificar porque los dos puntos ahí sí son válidos en una file URL.
function rutaImagen(ruta: string | null): string | undefined {
  if (!ruta) return undefined
  // Quita el "/" inicial (rutas tipo /home/usuario/...) antes de separar en
  // segmentos, para no duplicarlo al anteponer "file:///".
  const segmentos = ruta.replace(/\\/g, '/').replace(/^\/+/, '').split('/')
  const codificados = segmentos.map((segmento, indice) =>
    indice === 0 && /^[a-zA-Z]:$/.test(segmento) ? segmento : encodeURIComponent(segmento),
  )
  return `file:///${codificados.join('/')}`
}

function VistaImagen({ ruta, alt }: { ruta: string | null; alt: string }): JSX.Element {
  const src = rutaImagen(ruta)
  return src ? <img className="image-preview" src={src} alt={alt} /> : <span className="image-placeholder">Sin imagen seleccionada</span>
}

export default function EditorConfiguracion({ onVolver, onAbrirFolios }: Props) {
  const [sello, setSello] = useState<ConfiguracionSello | null>(null)
  const [firmantes, setFirmantes] = useState<ConfiguracionFirmantesGraduacion | null>(null)
  const [reglas, setReglas] = useState<ConfiguracionReglas | null>(null)
  // Texto crudo del campo numérico: permite borrarlo y reescribirlo sin que el valor salte.
  const [maxConstanciasTexto, setMaxConstanciasTexto] = useState('')
  const [folios, setFolios] = useState<FolioCatalogoEntry[]>([])
  const [folioNuevo, setFolioNuevo] = useState('')
  const [referenciaNueva, setReferenciaNueva] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [registrandoFolio, setRegistrandoFolio] = useState(false)
  const [procesandoSello, setProcesandoSello] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void cargarConfiguracion() }, [])

  async function cargarConfiguracion(): Promise<void> {
    setCargando(true)
    setError(null)
    try {
      const inicial = await window.electronAPI.obtenerConfiguracion()
      setSello(inicial.sello)
      setFirmantes(inicial.firmantesGraduacion)
      setReglas(inicial.reglas)
      setMaxConstanciasTexto(String(inicial.reglas.maxConstanciasPorPersona))
      setFolios(inicial.folios)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setCargando(false)
    }
  }

  async function agregarSello(incluyeFirma: boolean): Promise<void> {
    if (!sello) return
    setProcesandoSello(true)
    setError(null)
    try {
      const nuevo = await window.electronAPI.agregarSello({ incluyeFirma })
      if (!nuevo) return
      setSello((actual) => actual && {
        ...actual,
        sellos: [...actual.sellos, nuevo],
        selloActivoId: actual.selloActivoId ?? nuevo.id,
      })
      setMensaje(`Sello "${nuevo.nombre}" agregado al catálogo. Guarda los cambios para aplicarlo.`)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setProcesandoSello(false)
    }
  }

  async function reemplazarSello(opcion: OpcionSello): Promise<void> {
    setProcesandoSello(true)
    setError(null)
    try {
      const actualizado = await window.electronAPI.reemplazarSello(opcion.id)
      if (!actualizado) return
      setSello((actual) => actual && {
        ...actual,
        sellos: actual.sellos.map((selloGuardado) =>
          selloGuardado.id === actualizado.id ? actualizado : selloGuardado,
        ),
      })
      setMensaje(`La imagen de "${actualizado.nombre}" fue reemplazada. Si es el sello activo, se usará en las próximas generaciones.`)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setProcesandoSello(false)
    }
  }

  async function guardarCambios(): Promise<void> {
    if (!sello || !firmantes) return
    const maxConstancias = Number(maxConstanciasTexto)
    if (!Number.isInteger(maxConstancias) || maxConstancias < 1) {
      setMensaje(null)
      setError('El máximo de constancias por persona debe ser un número entero de 1 en adelante.')
      return
    }
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      const selloActivo = sello.sellos.find((opcion) => opcion.id === sello.selloActivoId)
      const [selloGuardado, firmantesGuardados, reglasGuardadas] = await Promise.all([
        window.electronAPI.actualizarConfiguracionSello({
          personaFirmante: sello.personaFirmante,
          cargoFirmante: sello.cargoFirmante,
          rutaSelloConFirma: selloActivo?.incluyeFirma ? selloActivo.rutaImagen : null,
          rutaSelloSinFirma: selloActivo && !selloActivo.incluyeFirma ? selloActivo.rutaImagen : null,
          selloActivoId: selloActivo?.id ?? null,
        }),
        window.electronAPI.actualizarFirmantesGraduacion({
          rectorNombre: firmantes.rectorNombre,
          rectorCargo: firmantes.rectorCargo,
          directorNombre: firmantes.directorNombre,
          directorCargo: firmantes.directorCargo,
        }),
        window.electronAPI.actualizarConfiguracionReglas({ maxConstanciasPorPersona: maxConstancias }),
      ])
      setSello(selloGuardado)
      setFirmantes(firmantesGuardados)
      setReglas(reglasGuardadas)
      setMaxConstanciasTexto(String(reglasGuardadas.maxConstanciasPorPersona))
      setMensaje('Cambios administrativos guardados.')
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setGuardando(false)
    }
  }

  async function registrarFolio(): Promise<void> {
    setRegistrandoFolio(true)
    setError(null)
    setMensaje(null)
    try {
      const registrado = await window.electronAPI.registrarFolio({
        folio: folioNuevo,
        nombreReferencia: referenciaNueva.trim() || null,
      })
      setFolios(await window.electronAPI.listarFolios())
      setFolioNuevo('')
      setReferenciaNueva('')
      setMensaje(`Folio ${registrado.folio} registrado.`)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setRegistrandoFolio(false)
    }
  }

  if (cargando) return <p>Cargando configuración administrativa...</p>
  if (!sello || !firmantes || !reglas) return <p>No se pudo cargar la configuración administrativa.</p>

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <Button variant="text" type="button" onClick={onVolver}>← Regresar a carga de archivos</Button>
        <div><p className="app-kicker">Configuración administrativa</p><h2>Edición de plantillas</h2></div>
      </div>
      {error && <p className="status-message status-message--error">Error: {error}</p>}
      {mensaje && <p className="status-message status-message--success">{mensaje}</p>}

      <div className="editor-layout">
        <main className="editor-main">
          <Card>
            <div className="section-heading"><div><h3>Firma y sello</h3><p>Selecciona cuál se usará en las constancias regulares. El cambio aplica a las siguientes generaciones.</p></div></div>
            <div className="preview-actions">
              <Button variant="secondary" type="button" disabled={procesandoSello} onClick={() => void agregarSello(true)}>Agregar sello con firma</Button>
              <Button variant="secondary" type="button" disabled={procesandoSello} onClick={() => void agregarSello(false)}>Agregar sello en blanco</Button>
            </div>
            {sello.sellos.length > 0 ? (
              <div className="image-grid">
                {sello.sellos.map((opcion) => (
                  <div className="image-control" key={opcion.id}>
                    <label className="campo-ayuda">
                      <input
                        type="radio"
                        name="selloActivo"
                        checked={sello.selloActivoId === opcion.id}
                        onChange={() => setSello({ ...sello, selloActivoId: opcion.id })}
                      />
                      {sello.selloActivoId === opcion.id ? 'Sello activo' : 'Usar este sello'}
                    </label>
                    <strong>{opcion.nombre}</strong>
                    <VistaImagen ruta={opcion.rutaImagen} alt={`Vista previa de ${opcion.nombre}`} />
                    <span className="campo-ayuda">{opcion.incluyeFirma ? 'Incluye firma en la imagen' : 'Sin firma; se imprimirá el nombre configurado'}</span>
                    <div className="preview-actions">
                      <Button variant="text" type="button" disabled={procesandoSello} onClick={() => void reemplazarSello(opcion)}>Reemplazar imagen</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="campo-ayuda">Aún no hay sellos cargados. Puedes agregar uno o continuar solo con el nombre y cargo de la persona firmante.</p>
            )}
            <div className="form-grid">
              <Field label="Persona firmante"><input value={sello.personaFirmante} onChange={(evento) => setSello({ ...sello, personaFirmante: evento.target.value })} /></Field>
              <Field label="Cargo"><input value={sello.cargoFirmante} onChange={(evento) => setSello({ ...sello, cargoFirmante: evento.target.value })} /></Field>
            </div>
          </Card>

          <Card>
            <div className="section-heading"><div><h3>Reglas de emisión</h3><p>Cuándo una constancia pasa a ser reconocimiento.</p></div></div>
            <div className="form-grid">
              <Field label="Máximo de constancias por persona en un evento"><input type="number" min={1} step={1} inputMode="numeric" value={maxConstanciasTexto} onChange={(evento) => setMaxConstanciasTexto(evento.target.value)} /></Field>
            </div>
            <p className="campo-ayuda">La constancia siguiente a este máximo se emite como RECONOCIMIENTO. Con {Number.isInteger(Number(maxConstanciasTexto)) && Number(maxConstanciasTexto) >= 1 ? maxConstanciasTexto : '…'} constancias, la número {Number.isInteger(Number(maxConstanciasTexto)) && Number(maxConstanciasTexto) >= 1 ? Number(maxConstanciasTexto) + 1 : '…'} ya es reconocimiento. Aplica a los lotes que se guarden a partir de ahora.</p>
          </Card>

          <Card>
            <h3>Firmantes de reconocimiento de graduación</h3>
            <div className="form-grid">
              <Field label="Nombre de rectoría"><input value={firmantes.rectorNombre} onChange={(evento) => setFirmantes({ ...firmantes, rectorNombre: evento.target.value })} /></Field>
              <Field label="Cargo"><input value={firmantes.rectorCargo} onChange={(evento) => setFirmantes({ ...firmantes, rectorCargo: evento.target.value })} /></Field>
              <Field label="Nombre de dirección"><input value={firmantes.directorNombre} onChange={(evento) => setFirmantes({ ...firmantes, directorNombre: evento.target.value })} /></Field>
              <Field label="Cargo"><input value={firmantes.directorCargo} onChange={(evento) => setFirmantes({ ...firmantes, directorCargo: evento.target.value })} /></Field>
            </div>
          </Card>

          <Card>
            <div className="section-heading"><div><h3>Catálogo de folios</h3><p>Registra folios ya existentes. Los folios nuevos se generan automáticamente.</p></div><Badge tone="neutral">{folios.length} registrados</Badge></div>
            <div className="folio-form"><Field label="Folio"><input value={folioNuevo} onChange={(evento) => setFolioNuevo(evento.target.value)} placeholder="Ej. EFAC-2026-001" /></Field><Field label="Referencia (opcional)"><input value={referenciaNueva} onChange={(evento) => setReferenciaNueva(evento.target.value)} placeholder="Nombre del evento" /></Field><Button type="button" onClick={() => void registrarFolio()} disabled={registrandoFolio || !folioNuevo.trim()}>{registrandoFolio ? 'Registrando...' : 'Registrar folio'}</Button></div>
            {folios.length > 0 && <div className="table-wrap"><table><thead><tr><th>Folio</th><th>Referencia</th><th>Fecha de registro</th></tr></thead><tbody>{folios.slice(0, 5).map((folio) => <tr key={folio.id}><td>{folio.folio}</td><td>{folio.nombreReferencia ?? '—'}</td><td>{folio.fechaRegistro}</td></tr>)}</tbody></table></div>}
          </Card>
        </main>

        <aside className="editor-actions">
          <Card className="action-card">
            <Button type="button" onClick={() => void guardarCambios()} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button variant="text" type="button" onClick={onAbrirFolios}>
              Catálogo de folios (ver y editar)
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
