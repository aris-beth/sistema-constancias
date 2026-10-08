import { useEffect, useState } from 'react'
import { Badge, Button, Card, Field } from './components/UI'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
  FolioCatalogoEntry,
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
  const [folios, setFolios] = useState<FolioCatalogoEntry[]>([])
  const [folioNuevo, setFolioNuevo] = useState('')
  const [referenciaNueva, setReferenciaNueva] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [registrandoFolio, setRegistrandoFolio] = useState(false)
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
      setFolios(inicial.folios)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setCargando(false)
    }
  }

  async function seleccionarImagen(tipo: 'con-firma' | 'sin-firma'): Promise<void> {
    if (!sello) return
    try {
      const ruta = tipo === 'con-firma'
        ? await window.electronAPI.seleccionarSelloConFirma()
        : await window.electronAPI.seleccionarSelloSinFirma()
      if (!ruta) return
      setSello((actual) => actual && (tipo === 'con-firma'
        ? { ...actual, rutaSelloConFirma: ruta }
        : { ...actual, rutaSelloSinFirma: ruta }))
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    }
  }

  async function guardarCambios(): Promise<void> {
    if (!sello || !firmantes) return
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      const [selloGuardado, firmantesGuardados] = await Promise.all([
        window.electronAPI.actualizarConfiguracionSello({
          nombreDirectora: sello.nombreDirectora,
          nombreRectora: sello.nombreRectora,
          rutaSelloConFirma: sello.rutaSelloConFirma,
          rutaSelloSinFirma: sello.rutaSelloSinFirma,
        }),
        window.electronAPI.actualizarFirmantesGraduacion({
          rectorNombre: firmantes.rectorNombre,
          rectorCargo: firmantes.rectorCargo,
          directorNombre: firmantes.directorNombre,
          directorCargo: firmantes.directorCargo,
        }),
      ])
      setSello(selloGuardado)
      setFirmantes(firmantesGuardados)
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

  function mostrarMensajeVistaPrevia(nombre: string): void {
    setMensaje(`${nombre}: genera primero un lote para habilitar su contenido.`)
  }

  if (cargando) return <p>Cargando configuración administrativa...</p>
  if (!sello || !firmantes) return <p>No se pudo cargar la configuración administrativa.</p>

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
            <div className="section-heading"><div><h3>Firma y sello</h3><p>Elementos que aparecerán en las constancias regulares.</p></div><Badge tone="neutral">Activos para nuevos documentos</Badge></div>
            <p className="campo-ayuda">
              El sello "con firma" ya trae la firma y el nombre de la directora horneados en la imagen: se usa tal cual y no se repite el nombre por separado.
              Mientras no lo cargues, se usa el sello "en blanco" y el nombre de abajo se imprime como texto.
            </p>
            <div className="image-grid">
              <div className="image-control"><strong>Sello con firma de la directora</strong><VistaImagen ruta={sello.rutaSelloConFirma} alt="Vista previa del sello con firma" /><Button variant="secondary" type="button" onClick={() => void seleccionarImagen('con-firma')}>Subir sello con firma</Button></div>
              <div className="image-control"><strong>Sello en blanco (sin firma)</strong><VistaImagen ruta={sello.rutaSelloSinFirma} alt="Vista previa del sello en blanco" /><Button variant="secondary" type="button" onClick={() => void seleccionarImagen('sin-firma')}>Subir sello en blanco</Button></div>
            </div>
            <div className="form-grid">
              <Field label="Nombre de directora de facultad"><input value={sello.nombreDirectora} onChange={(evento) => setSello({ ...sello, nombreDirectora: evento.target.value })} /></Field>
              <Field label="Nombre de rectora"><input value={sello.nombreRectora} onChange={(evento) => setSello({ ...sello, nombreRectora: evento.target.value })} /></Field>
            </div>
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

        <aside className="editor-actions"><Card className="action-card"><Button type="button" onClick={() => void guardarCambios()} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button><div className="preview-actions"><Button variant="secondary" type="button" onClick={() => mostrarMensajeVistaPrevia('Vista previa de constancia regular')}>Vista previa de constancia regular</Button><Button variant="secondary" type="button" onClick={() => mostrarMensajeVistaPrevia('Vista previa de reconocimiento graduación')}>Vista previa de reconocimiento graduación</Button><Button variant="text" type="button" onClick={onAbrirFolios}>Catálogo de folios (ver y editar)</Button></div></Card></aside>
      </div>
    </div>
  )
}
