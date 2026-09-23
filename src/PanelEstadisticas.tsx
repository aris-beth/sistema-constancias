import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Badge, Button, Card, Field } from './components/UI'
import type { EstadisticasResultado, FiltrosEstadisticas, ResultadoEstadisticas } from '../shared/types/ipc'

const vacios: FiltrosEstadisticas = { fechaDesde: null, fechaHasta: null, folioEvento: null }
interface Props { onVolver: () => void }
interface Periodo { fechaDesde: string | null; fechaHasta: string | null }

export default function PanelEstadisticas({ onVolver }: Props) {
  const [filtros, setFiltros] = useState<FiltrosEstadisticas>(vacios)
  const [periodoA, setPeriodoA] = useState<Periodo>({ fechaDesde: null, fechaHasta: null })
  const [periodoB, setPeriodoB] = useState<Periodo>({ fechaDesde: null, fechaHasta: null })
  const [resultado, setResultado] = useState<EstadisticasResultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void consultar() }, [])

  async function consultar(): Promise<void> {
    setCargando(true)
    setError(null)
    try {
      const comparacion = periodoA.fechaDesde || periodoA.fechaHasta || periodoB.fechaDesde || periodoB.fechaHasta
        ? { periodoA, periodoB }
        : undefined
      setResultado(await window.electronAPI.consultarEstadisticas({ filtros, comparacion }))
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : String(errorActual))
    } finally {
      setCargando(false)
    }
  }

  function cambiarFiltro(campo: 'fechaDesde' | 'fechaHasta' | 'folioEvento', valor: string): void {
    setFiltros((actual) => ({ ...actual, [campo]: valor || null }))
  }

  function cambiarPeriodo(setPeriodo: Dispatch<SetStateAction<Periodo>>, campo: keyof Periodo, valor: string): void {
    setPeriodo((actual) => ({ ...actual, [campo]: valor || null }))
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <div><Button variant="text" type="button" onClick={onVolver}>← Regresar a carga de archivos</Button><p className="app-kicker">Lectura operativa</p><h2>Métricas de constancias</h2><p>Consulta documentos generados. Las filas pendientes no se contabilizan.</p></div>
      </div>

      <form className="surface-card stats-filters" onSubmit={(evento) => { evento.preventDefault(); void consultar() }}>
        <div className="section-heading"><div><h3>Seleccionar fechas</h3><p>Filtra el periodo principal y, opcionalmente, compara dos periodos.</p></div><Badge tone="neutral">Datos del sistema</Badge></div>
        <div className="stats-filter-grid">
          <Field label="Desde"><input type="date" value={filtros.fechaDesde ?? ''} onChange={(evento) => cambiarFiltro('fechaDesde', evento.target.value)} /></Field>
          <Field label="Hasta"><input type="date" value={filtros.fechaHasta ?? ''} onChange={(evento) => cambiarFiltro('fechaHasta', evento.target.value)} /></Field>
          <Field label="Folio de evento"><input value={filtros.folioEvento ?? ''} onChange={(evento) => cambiarFiltro('folioEvento', evento.target.value)} placeholder="Opcional" /></Field>
        </div>
        <div className="comparison-inputs">
          <div><h3>Comparación entre periodos</h3><div className="stats-filter-grid"><Field label="Periodo A · Desde"><input type="date" value={periodoA.fechaDesde ?? ''} onChange={(evento) => cambiarPeriodo(setPeriodoA, 'fechaDesde', evento.target.value)} /></Field><Field label="Periodo A · Hasta"><input type="date" value={periodoA.fechaHasta ?? ''} onChange={(evento) => cambiarPeriodo(setPeriodoA, 'fechaHasta', evento.target.value)} /></Field><Field label="Periodo B · Desde"><input type="date" value={periodoB.fechaDesde ?? ''} onChange={(evento) => cambiarPeriodo(setPeriodoB, 'fechaDesde', evento.target.value)} /></Field><Field label="Periodo B · Hasta"><input type="date" value={periodoB.fechaHasta ?? ''} onChange={(evento) => cambiarPeriodo(setPeriodoB, 'fechaHasta', evento.target.value)} /></Field></div></div>
  </div>
        <Button type="submit" disabled={cargando}>{cargando ? 'Consultando...' : 'Actualizar estadísticas'}</Button>
      </form>

      {error && <p className="status-message status-message--error">Error: {error}</p>}
      {resultado && <VistaEstadisticas resultado={resultado.actual} comparacion={resultado.comparacion} />}
    </div>
  )
}

function VistaEstadisticas({ resultado, comparacion }: { resultado: ResultadoEstadisticas; comparacion: EstadisticasResultado['comparacion'] }): JSX.Element {
  return (
    <div className="stats-content">
      <div className="stats-kpis">
        <Card><span className="stats-kpi-label">Eventos en el periodo</span><strong className="stats-kpi-value">{resultado.totalEventos}</strong></Card>
        <Card><span className="stats-kpi-label">Constancias emitidas</span><strong className="stats-kpi-value">{resultado.totalDocumentos - resultado.totalReconocimientos}</strong></Card>
        <Card><span className="stats-kpi-label">Reconocimientos</span><strong className="stats-kpi-value">{resultado.totalReconocimientos}</strong></Card>
      </div>
      {comparacion && <Card><div className="section-heading"><div><h3>Comparación entre periodos</h3><p>Documentos generados en los rangos seleccionados.</p></div></div><div className="comparison-results"><div><span>Periodo A</span><strong>{comparacion.periodoA.totalDocumentos}</strong><small>{comparacion.periodoA.totalEventos} eventos</small></div><div><span>Periodo B</span><strong>{comparacion.periodoB.totalDocumentos}</strong><small>{comparacion.periodoB.totalEventos} eventos</small></div></div></Card>}
      <div className="stats-columns">
        <Card><h3>Constancias por rol</h3><ListaBarras filas={resultado.porRol} total={resultado.totalDocumentos} /></Card>
        <Card><h3>Constancias por categoría</h3><TablaDesglose filas={resultado.porCategoria} etiqueta="Categoría" /></Card>
      </div>
      <Card><h3>Personas con más documentos acumulados</h3><TablaDesglose filas={resultado.personasConMasDocumentos} etiqueta="Persona" /></Card>
      <Card><h3>Tendencia en el tiempo</h3><GraficaTendencia puntos={resultado.tendencia} /></Card>
    </div>
  )
}

function ListaBarras({ filas, total }: { filas: Array<{ etiqueta: string; documentos: number }>; total: number }): JSX.Element {
  if (!filas.length) return <p>No hay documentos por rol en el periodo seleccionado.</p>
  return <div className="bar-list">{filas.map((fila) => <div className="bar-item" key={fila.etiqueta}><div className="bar-label"><span>{fila.etiqueta}</span><strong>{fila.documentos}</strong></div><div className="bar-track"><span style={{ width: `${total ? (fila.documentos / total) * 100 : 0}%` }} /></div></div>)}</div>
}

function TablaDesglose({ filas, etiqueta }: { filas: Array<{ etiqueta: string; documentos: number }>; etiqueta: string }): JSX.Element {
  if (!filas.length) return <p>No hay datos en el periodo seleccionado.</p>
  return <div className="table-wrap"><table><thead><tr><th>{etiqueta}</th><th>Documentos</th></tr></thead><tbody>{filas.map((fila) => <tr key={fila.etiqueta}><td>{fila.etiqueta}</td><td><strong>{fila.documentos}</strong></td></tr>)}</tbody></table></div>
}

function GraficaTendencia({ puntos }: { puntos: Array<{ fecha: string; documentos: number; eventos: number }> }): JSX.Element {
  if (!puntos.length) return <p>No hay documentos generados en el periodo seleccionado.</p>
  const ancho = 720
  const alto = 220
  const maximo = Math.max(...puntos.map((punto) => punto.documentos), 1)
  const puntosSvg = puntos.map((punto, indice) => ({ ...punto, x: puntos.length === 1 ? ancho / 2 : 30 + (indice * (ancho - 60)) / (puntos.length - 1), y: alto - 30 - (punto.documentos / maximo) * (alto - 60) }))
  return <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Tendencia de documentos por fecha" className="stats-chart"><line x1="30" y1={alto - 30} x2={ancho - 30} y2={alto - 30} stroke="var(--color-borde)" /><polyline points={puntosSvg.map((punto) => `${punto.x},${punto.y}`).join(' ')} fill="none" stroke="var(--color-institucional)" strokeWidth="3" />{puntosSvg.map((punto) => <g key={punto.fecha}><circle cx={punto.x} cy={punto.y} r="5" fill="var(--color-institucional)" /><text x={punto.x} y={punto.y - 10} textAnchor="middle" fontSize="12">{punto.documentos}</text><text x={punto.x} y={alto - 8} textAnchor="middle" fontSize="10">{punto.fecha}</text></g>)}</svg>
}
