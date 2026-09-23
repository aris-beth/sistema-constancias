import { useEffect, useState } from 'react'
import { Button, Card } from '../components/UI'
import type { QrCatalogoEntry } from '../../shared/types/configuracion'

interface Props {
  onVolver: () => void
}

function rutaImagen(ruta: string): string {
  return `file:///${ruta.replace(/\\/g, '/')}`
}

export default function VistaPreviaCodigosQr({ onVolver }: Props) {
  const [qrs, setQrs] = useState<QrCatalogoEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarQrs(): Promise<void> {
      try {
        setQrs(await window.electronAPI.listarQrs())
      } catch (errorActual) {
        setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
      } finally {
        setCargando(false)
      }
    }
    void cargarQrs()
  }, [])

  return (
    <div className="qr-gallery-page">
      <div className="qr-gallery-header">
        <div>
          <Button variant="text" type="button" onClick={onVolver}>← Regresar a edición de plantillas</Button>
          <p className="app-kicker">Catálogo visual</p>
          <h2>Vista previa de códigos QR</h2>
          <p>Consulta los códigos cargados y su folio asociado.</p>
        </div>
        <span className="badge badge--neutral">{qrs.length} códigos</span>
      </div>
      {cargando && <p>Cargando códigos QR...</p>}
      {error && <p className="status-message status-message--error">Error: {error}</p>}
      {!cargando && !error && qrs.length === 0 && <Card><p>No hay códigos QR cargados.</p></Card>}
      <div className="qr-gallery-grid">
        {qrs.map((qr) => (
          <Card className="qr-card" key={qr.id}>
            <div className="qr-image-frame"><img src={rutaImagen(qr.rutaArchivo)} alt={`Código QR del evento ${qr.folioEvento}`} /></div>
            <strong>{qr.folioEvento}</strong>
          </Card>
        ))}
      </div>
    </div>
  )
}
