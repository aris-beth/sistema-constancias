import { useEffect, useState } from 'react'
import { Badge, Button, Card, Field } from './components/UI'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
  QrCatalogoEntry,
} from '../shared/types/configuracion'

interface Props {
  onVolver: () => void
  onAbrirQrs: () => void
}

function rutaImagen(ruta: string | null): string | undefined {
  return ruta ? `file:///${ruta.replace(/\\/g, '/')}` : undefined
}

function VistaImagen({ ruta, alt }: { ruta: string | null; alt: string }): JSX.Element {
  const src = rutaImagen(ruta)
  return src ? <img className="image-preview" src={src} alt={alt} /> : <span className="image-placeholder">Sin imagen seleccionada</span>
}

export default function EditorConfiguracion({ onVolver, onAbrirQrs }: Props) {
  const [sello, setSello] = useState<ConfiguracionSello | null>(null)
  const [firmantes, setFirmantes] = useState<ConfiguracionFirmantesGraduacion | null>(null)
  const [qrs, setQrs] = useState<QrCatalogoEntry[]>([])
  const [folioQr, setFolioQr] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cargandoQr, setCargandoQr] = useState(false)
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
      setQrs(inicial.qrs)
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setCargando(false)
    }
  }

  async function seleccionarImagen(tipo: 'firma' | 'sello'): Promise<void> {
    if (!sello) return
    try {
      const ruta = tipo === 'firma'
        ? await window.electronAPI.seleccionarImagenFirma()
        : await window.electronAPI.seleccionarImagenSello()
      if (!ruta) return
      setSello((actual) => actual && (tipo === 'firma'
        ? { ...actual, rutaFirma: ruta, rutaImagenFirma: ruta }
        : { ...actual, rutaImagenSello: ruta }))
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
          rutaFirma: sello.rutaFirma,
          rutaImagenSello: sello.rutaImagenSello,
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

  async function cargarQr(): Promise<void> {
    setCargandoQr(true)
    setError(null)
    setMensaje(null)
    try {
      const qr = await window.electronAPI.registrarQr({ folioEvento: folioQr })
      if (qr) {
        setQrs(await window.electronAPI.listarQrs())
        setFolioQr('')
        setMensaje(`QR cargado para ${qr.folioEvento}.`)
      }
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setCargandoQr(false)
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
            <div className="image-grid">
              <div className="image-control"><strong>Firma de directora</strong><VistaImagen ruta={sello.rutaFirma} alt="Vista previa de la firma" /><Button variant="secondary" type="button" onClick={() => void seleccionarImagen('firma')}>Subir firma</Button></div>
              <div className="image-control"><strong>Sello institucional</strong><VistaImagen ruta={sello.rutaImagenSello} alt="Vista previa del sello" /><Button variant="secondary" type="button" onClick={() => void seleccionarImagen('sello')}>Subir sello</Button></div>
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
            <div className="section-heading"><div><h3>Códigos QR</h3><p>Asocia un código QR con el folio del evento.</p></div><Badge tone="neutral">{qrs.length} registrados</Badge></div>
            <div className="qr-form"><Field label="Folio asociado"><input value={folioQr} onChange={(evento) => setFolioQr(evento.target.value)} placeholder="Ej. EVT-2026-001" /></Field><Button type="button" onClick={() => void cargarQr()} disabled={cargandoQr || !folioQr.trim()}>{cargandoQr ? 'Cargando QR...' : 'Cargar nuevo QR'}</Button></div>
            {qrs.length > 0 && <div className="table-wrap"><table><thead><tr><th>Folio</th><th>Archivo</th><th>Fecha de carga</th></tr></thead><tbody>{qrs.map((qr) => <tr key={qr.id}><td>{qr.folioEvento}</td><td>{qr.rutaArchivo}</td><td>{qr.fechaCarga}</td></tr>)}</tbody></table></div>}
          </Card>
        </main>

        <aside className="editor-actions"><Card className="action-card"><Button type="button" onClick={() => void guardarCambios()} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button><div className="preview-actions"><Button variant="secondary" type="button" onClick={() => mostrarMensajeVistaPrevia('Vista previa de constancia regular')}>Vista previa de constancia regular</Button><Button variant="secondary" type="button" onClick={() => mostrarMensajeVistaPrevia('Vista previa de reconocimiento graduación')}>Vista previa de reconocimiento graduación</Button><Button variant="text" type="button" onClick={onAbrirQrs}>Vista previa de códigos QR</Button></div></Card></aside>
      </div>
    </div>
  )
}
