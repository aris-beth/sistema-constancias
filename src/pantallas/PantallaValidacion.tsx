// src/pantallas/PantallaValidacion.tsx
import React, { useEffect, useMemo, useState } from 'react';
import '../styles/design-system.css';
import { ARTICULOS_EVENTO, type ArticuloEvento } from '../../shared/types/evento';

// Tipos base para la estructura de datos
export interface RegistroExcel {
  idFila: string;
  nombre: string;
  rol: string;
  [key: string]: any; // Otros campos dinámicos
}

export interface ErrorValidacion {
  idFila: string;
  campo: string;
  mensaje: string;
}

interface PantallaValidacionProps {
  folioEvento: string;
  setFolioEvento: (folio: string) => void;
  registros: RegistroExcel[];
  errores: ErrorValidacion[];
  onActualizarRegistro: (idFila: string, campo: string, valor: any) => void;
  modo: 'regular' | 'graduacion';
  onCambiarNombreEvento: (nombre: string) => void;
  onCambiarArticuloEvento: (articulo: ArticuloEvento | null) => void;
  filasPendientes: string[];
  actualizando: boolean;
  mensajeActualizacion: string | null;
  onActualizarCambios: () => void;
  correccion?: {
    folioEvento: string
    seleccionados: number[]
    guardando: boolean
    generando: boolean
    cambiosPendientes: number
    error: string | null
    resultado: {
      carpetaCorrecciones: string
      rutas: string[]
      errores: Array<{ folioInterno: string; detalle: string }>
      advertencias: string[]
    } | null
    onToggleSeleccion: (id: number, seleccionado: boolean) => void
    onGuardarSeleccionadas: () => void
    onGenerarSeleccionadas: () => void
  }
}

// Mapeo interno a nombres legibles
const mapaNombresCampos: Record<string, string> = {
  nombre: 'Nombre completo',
  rol: 'Participa como',
  correo: 'Correo electrónico',
  institucion: 'Institución de procedencia',
  horas: 'Horas acreditadas',
  nombreOriginal: 'Nombre (original del Excel)',
  gradoDetectado: 'Grado detectado',
  confianza: 'Confianza de normalización',
  esPersonalizado: 'Texto personalizado (sí/no)',
  universidadExterna: 'Universidad externa detectada',
  nombrePonencia: 'Ponencia',
  nombreEvento: 'Evento',
  fechaConstancia: 'Fecha',
  duracion: 'Duración',
  universidadOrigen: 'Universidad de origen',
  modalidad: 'Modalidad',
  categoria: 'Categoría',
  textoPersonalizado: 'Texto personalizado',
  textoGenerado: 'Texto de la constancia (vista previa)',
  generacion: 'Generación',
  carrera: 'Carrera',
};

// Columnas adicionales que se muestran en la tabla principal cuando el
// dato viene presente en al menos un registro cargado (varían según el
// modo: regular trae ponencia/evento/universidad/categoría, graduación
// trae generación/carrera). "truncar" son campos largos (texto de la
// constancia) que se acortan visualmente pero conservan el texto
// completo en el atributo title (tooltip al pasar el mouse).
const COLUMNAS_EXTRA: Array<{ key: string; label: string; truncar?: boolean }> = [
  { key: 'nombrePonencia', label: 'Ponencia' },
  { key: 'nombreEvento', label: 'Evento' },
  { key: 'fechaConstancia', label: 'Fecha' },
  { key: 'duracion', label: 'Duración' },
  { key: 'universidadOrigen', label: 'Universidad de origen' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'generacion', label: 'Generación' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'confianza', label: 'Confianza' },
  { key: 'textoPersonalizado', label: 'Texto personalizado', truncar: true },
  { key: 'textoGenerado', label: 'Texto de la constancia (vista previa)' },
];

const CAMPOS_TEXTO_LARGO = new Set(['textoPersonalizado', 'textoGenerado']);

// Campos internos que se muestran en la tabla pero no se editan a mano.
const CAMPOS_OCULTOS_EN_EDICION = new Set([
  'idFila',
  'confianza',
  'universidadExterna',
  'esPersonalizado',
  'gradoDetectado',
  'nombreOriginal',
]);

// Nombre del evento más frecuente entre las filas (y cuántos distintos hay).
const resumirEventos = (registros: RegistroExcel[]) => {
  const conteo = new Map<string, number>();
  for (const registro of registros) {
    const nombre = String(registro.nombreEvento ?? '').trim();
    if (nombre) conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  const ordenados = [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  return { principal: ordenados[0]?.[0] ?? '', distintos: ordenados.map(([nombre]) => nombre) };
};

const celdaTieneValor = (valor: unknown): boolean =>
  valor !== undefined && valor !== null && valor !== '';

const formatearCelda = (valor: unknown, truncar?: boolean, clase?: string) => {
  if (!celdaTieneValor(valor)) return <span className="celda-vacia">—</span>;
  const texto = String(valor);
  if (truncar) {
    return <span className="celda-truncada" title={texto}>{texto}</span>;
  }
  if (clase) {
    return <span className={clase}>{texto}</span>;
  }
  return texto;
};

const formatearConfianza = (valor: unknown) => {
  if (!celdaTieneValor(valor)) return <span className="celda-vacia">—</span>;

  const texto = String(valor).toLowerCase();
  const clase = texto === 'baja' ? 'confianza-baja' : texto === 'alta' ? 'confianza-alta' : 'confianza-neutral';

  return <span className={`confianza-badge ${clase}`}>{texto === 'baja' ? 'Baja' : texto === 'alta' ? 'Alta' : 'Sin dato'}</span>;
};

export const PantallaValidacion: React.FC<PantallaValidacionProps> = ({
  folioEvento,
  setFolioEvento,
  registros,
  errores,
  onActualizarRegistro,
  modo,
  onCambiarNombreEvento,
  onCambiarArticuloEvento,
  filasPendientes,
  actualizando,
  mensajeActualizacion,
  onActualizarCambios,
  correccion,
}) => {
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);
  const [folioSugerido, setFolioSugerido] = useState<string | null>(null);
  const [busquedaFolio, setBusquedaFolio] = useState('');

  // ¿Cómo sabe el programa el nombre del evento? Regular: viene de la
  // columna de evento del Excel (aquí se puede corregir para todo el lote).
  // Graduación: se arma con la generación.
  const resumenEventos = useMemo(() => resumirEventos(registros), [registros]);
  const nombreEvento = modo === 'regular'
    ? resumenEventos.principal
    : registros[0]?.generacion
      ? `Reconocimientos de graduación ${registros[0].generacion}`
      : '';
  const fechaEvento = String(registros[0]?.fechaConstancia ?? '');
  // El artículo ("del", "de la"…) es un dato del lote, igual que el nombre del evento.
  const articuloEvento: ArticuloEvento | '' =
    (registros.find((r) => r.articuloEvento)?.articuloEvento as ArticuloEvento | undefined) ?? '';

  // Vista previa del folio automático (no guarda nada).
  useEffect(() => {
    if (folioEvento.trim() || !nombreEvento.trim() || !fechaEvento.trim()) {
      setFolioSugerido(null);
      return;
    }
    let vigente = true;
    const temporizador = setTimeout(() => {
      window.electronAPI
        .previsualizarFolio({ nombreEvento, fecha: fechaEvento })
        .then((folio) => { if (vigente) setFolioSugerido(folio); })
        .catch(() => { if (vigente) setFolioSugerido(null); });
    }, 300);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [folioEvento, nombreEvento, fechaEvento]);

  // Solo se muestran las columnas extra que traigan dato en al menos un
  // registro — así la tabla de "regular" no muestra Generación/Carrera
  // vacías, ni la de "graduación" muestra Ponencia/Universidad vacías.
  const columnasVisibles = COLUMNAS_EXTRA.filter((columna) =>
    registros.some((registro) => celdaTieneValor(registro[columna.key])),
  );
  const filasVisibles = correccion
    ? registros.filter((registro) =>
        `${registro.folioInterno ?? ''} ${registro.nombre ?? ''} ${registro.rol ?? ''}`
          .toLocaleLowerCase('es-MX')
          .includes(busquedaFolio.trim().toLocaleLowerCase('es-MX')),
      )
    : registros;
  const idsVisibles = filasVisibles.map((registro) => Number(registro.idFila));
  const seleccionadosVisibles = idsVisibles.filter((id) => correccion?.seleccionados.includes(id)).length;
  const todasVisiblesSeleccionadas =
    idsVisibles.length > 0 && seleccionadosVisibles === idsVisibles.length;

  const toggleSeleccionVisibles = (seleccionar: boolean) => {
    if (!correccion) return;
    for (const registro of filasVisibles) {
      const id = Number(registro.idFila);
      if (correccion.seleccionados.includes(id) !== seleccionar) {
        correccion.onToggleSeleccion(id, seleccionar);
      }
    }
  };

  const erroresDeFila = (idFila: string) => errores.filter((e) => e.idFila === idFila);

  const toggleFila = (idFila: string) => {
    setFilaExpandida(filaExpandida === idFila ? null : idFila);
  };

  const enfocarError = (idFila: string) => {
    const elemento = document.getElementById(`fila-${idFila}`);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Efecto visual de destello
      elemento.style.transition = 'background-color 0.5s';
      elemento.style.backgroundColor = 'var(--color-acento-badge)';
      setTimeout(() => {
        elemento.style.backgroundColor = '';
      }, 1500);
      setFilaExpandida(idFila); // Auto-expandir la fila para corregir
    }
  };

  return (
    <div className="validacion-layout">
      {errores.length > 0 && (
        <aside className="panel-errores">
          <h3 className="panel-errores-titulo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Errores ({errores.length})
          </h3>

          <div className="panel-errores-lista">
            {errores.map((error, idx) => {
              const registro = registros.find(r => r.idFila === error.idFila);
              const numeroFila = registros.findIndex(r => r.idFila === error.idFila) + 1;
              const nombrePersona = String(registro?.nombre || registro?.nombreOriginal || '').trim() || '(sin nombre)';

              return (
                <div
                  key={idx}
                  className="error-item"
                  onClick={() => enfocarError(error.idFila)}
                  title="Clic para ir a la fila"
                >
                  <p>
                    Error en fila <strong>{numeroFila || '?'}</strong>
                    {error.campo === 'nombre'
                      ? <>: <strong>{nombrePersona}</strong></>
                      : <> en el apartado <strong>{mapaNombresCampos[error.campo] || error.campo}</strong></>}
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                    {error.mensaje}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Contenido Principal */}
      <div className="validacion-main">
        {!correccion && <div className="evento-info">
          <div className="evento-info-campo">
            <label htmlFor="nombre-evento" style={{ fontWeight: 600 }}>Nombre del evento:</label>
            {modo === 'regular' ? (
              <input
                id="nombre-evento"
                type="text"
                className="input-institucional"
                placeholder="Nombre del evento (se toma del Excel)"
                value={nombreEvento}
                onChange={(e) => onCambiarNombreEvento(e.target.value)}
              />
            ) : (
              <span className="evento-nombre-fijo">{nombreEvento || '—'}</span>
            )}
            <span className="evento-ayuda">
              {modo === 'regular'
                ? 'Se toma de la columna de evento del Excel. Si lo cambias aquí, se aplica a todas las filas.'
                : 'En graduación el nombre se arma con la generación del Excel.'}
            </span>
            {modo === 'regular' && (
              <>
                <label htmlFor="articulo-evento" style={{ fontWeight: 600 }}>Forma de nombrar el evento:</label>
                <select
                  id="articulo-evento"
                  className="input-institucional"
                  value={articuloEvento}
                  onChange={(e) => onCambiarArticuloEvento((e.target.value || null) as ArticuloEvento | null)}
                >
                  <option value="">— Elegir —</option>
                  {ARTICULOS_EVENTO.map((articulo) => (
                    <option key={articulo} value={articulo}>{articulo}</option>
                  ))}
                </select>
                <span className="evento-ayuda">
                  Organizador/a, colaborador/a y revisor/a de libro conservan «del/de la»; las demás redacciones usan «en el/en la» (o «en los/en las» en plural). La sede de la Facultad se mantiene también para participantes externos.
                  {!articuloEvento && ' Si no se propone una forma automáticamente, elige una y pulsa «Actualizar cambios».'}
                </span>
              </>
            )}
            {modo === 'regular' && resumenEventos.distintos.length > 1 && (
              <span className="evento-advertencia">
                ⚠ El Excel trae {resumenEventos.distintos.length} nombres de evento distintos ({resumenEventos.distintos.join(' / ')}).
                {' '}
                <button className="enlace-institucional" onClick={() => onCambiarNombreEvento(resumenEventos.principal)}>
                  Usar «{resumenEventos.principal}» en todas las filas
                </button>
              </span>
            )}
          </div>
        </div>}

        {correccion ? (
          <section className="validacion-correccion-tools" aria-label="Buscar y guardar correcciones">
            <div className="validacion-correccion-heading">
              <div>
                <h2>Corregir constancias · {correccion.folioEvento}</h2>
                <p>Busca por folio interno, selecciona solo los documentos observados y edítalos en esta misma tabla.</p>
              </div>
              <span>{filasVisibles.length} de {registros.length} documentos</span>
            </div>
            <div className="validacion-correccion-actions">
              <label className="field" htmlFor="buscar-folio-interno">
                Buscar folio interno, nombre o rol
                <input
                  id="buscar-folio-interno"
                  type="search"
                  value={busquedaFolio}
                  onChange={(evento) => setBusquedaFolio(evento.target.value)}
                  placeholder="Ej. EVT-2026-001-0003"
                  autoFocus
                />
              </label>
              <span className="validacion-correccion-seleccion">
                {correccion.seleccionados.length} seleccionada(s)
                {correccion.cambiosPendientes > 0 && ` · ${correccion.cambiosPendientes} con cambios sin guardar`}
              </span>
              <button
                className="btn-institucional"
                type="button"
                onClick={() => toggleSeleccionVisibles(!todasVisiblesSeleccionadas)}
                disabled={filasVisibles.length === 0 || correccion.guardando || correccion.generando}
              >
                {todasVisiblesSeleccionadas ? 'Quitar visibles' : 'Seleccionar visibles'}
              </button>
              <button
                className="btn-institucional"
                type="button"
                onClick={correccion.onGuardarSeleccionadas}
                disabled={
                  correccion.seleccionados.length === 0 ||
                  correccion.cambiosPendientes === 0 ||
                  correccion.guardando ||
                  correccion.generando
                }
              >
                {correccion.guardando ? 'Guardando...' : 'Guardar cambios seleccionados'}
              </button>
              <button
                className="btn-institucional"
                type="button"
                onClick={correccion.onGenerarSeleccionadas}
                disabled={
                  correccion.seleccionados.length === 0 ||
                  correccion.cambiosPendientes > 0 ||
                  correccion.guardando ||
                  correccion.generando
                }
              >
                {correccion.generando
                  ? 'Generando...'
                  : `Generar PDF con ${correccion.seleccionados.length} seleccionada(s)`}
              </button>
            </div>
            {correccion.cambiosPendientes > 0 && (
              <p className="validacion-correccion-nota" role="status">
                Guarda los cambios antes de generar el PDF. Los archivos originales no se reemplazan.
              </p>
            )}
            {correccion.error && <p className="status-message status-message--error" role="alert">{correccion.error}</p>}
            {correccion.resultado && (
              <div className="validacion-correccion-resultado" role="status">
                <strong>Carpeta de correcciones: {correccion.resultado.carpetaCorrecciones}</strong>
                {correccion.resultado.rutas.map((ruta) => <span key={ruta}>{ruta}</span>)}
                {correccion.resultado.errores.map((error) => (
                  <p className="status-message status-message--error" key={error.folioInterno}>
                    {error.folioInterno}: {error.detalle}
                  </p>
                ))}
                {correccion.resultado.advertencias.map((aviso, indice) => <p key={`${indice}-${aviso}`}>{aviso}</p>)}
              </div>
            )}
          </section>
        ) : <div className="folio-input-container">
          <label htmlFor="folio" style={{ fontWeight: 600 }}>Folio (opcional):</label>
          <input
            id="folio"
            type="text"
            className="input-institucional"
            placeholder="Vacío = se genera automáticamente"
            value={folioEvento}
            onChange={(e) => setFolioEvento(e.target.value)}
          />
          {!folioEvento.trim() && folioSugerido && (
            <span className="folio-sugerido">Se asignará: <strong>{folioSugerido}</strong></span>
          )}
          <div style={{ flex: 1 }}></div>
          {filasPendientes.length > 0 && (
            <span className="cambios-pendientes">{filasPendientes.length} fila(s) con cambios sin actualizar</span>
          )}
          <button
            className="btn-institucional"
            onClick={onActualizarCambios}
            disabled={actualizando || (filasPendientes.length === 0 && errores.length === 0)}
          >
            {actualizando ? 'Actualizando...' : 'Actualizar cambios'}
          </button>
        </div>}
        {mensajeActualizacion && <p className="mensaje-actualizacion">{mensajeActualizacion}</p>}

        <div className="tabla-container">
          <table className="data-table">
            <thead>
              <tr>
                {correccion && (
                  <>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las constancias visibles"
                        checked={todasVisiblesSeleccionadas}
                        onChange={(evento) => toggleSeleccionVisibles(evento.target.checked)}
                        disabled={correccion.guardando || correccion.generando}
                      />
                    </th>
                    <th>Folio interno</th>
                  </>
                )}
                <th>Errores</th>
                <th>Nombre</th>
                <th>Participa como</th>
                {columnasVisibles.map((columna) => (
                  <th key={columna.key}>{columna.label}</th>
                ))}
                <th style={{ width: '100px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((registro) => {
                const erroresFila = erroresDeFila(registro.idFila);
                const tieneError = erroresFila.length > 0;
                const constanciaId = Number(registro.idFila);
                
                return (
                  <React.Fragment key={registro.idFila}>
                    <tr 
                      id={`fila-${registro.idFila}`} 
                      className={`fila-dato ${tieneError ? 'con-error' : ''}`}
                    >
                      {correccion && (
                        <>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar ${registro.folioInterno}`}
                              checked={correccion.seleccionados.includes(constanciaId)}
                              onChange={(evento) => correccion.onToggleSeleccion(constanciaId, evento.target.checked)}
                              disabled={correccion.guardando || correccion.generando}
                            />
                          </td>
                          <td><strong>{registro.folioInterno}</strong></td>
                        </>
                      )}
                      <td>
                        {tieneError ? (
                          <span className="celda-error-badge" title={erroresFila.map((e) => e.mensaje).join(' | ')}>
                            {erroresFila.map((e) => e.mensaje).join(' | ')}
                          </span>
                        ) : (
                          <span className="celda-vacia">—</span>
                        )}
                      </td>
                      <td>{registro.nombre}</td>
                      <td>{registro.rol}</td>
                      {columnasVisibles.map((columna) => (
                        <td key={columna.key} className={columna.key === 'confianza' ? 'celda-confianza' : undefined}>
                          {columna.key === 'confianza'
                            ? formatearConfianza(registro[columna.key])
                            : formatearCelda(
                                registro[columna.key],
                                columna.truncar,
                                columna.key === 'textoGenerado' ? 'celda-texto-previsualizacion' : undefined,
                              )}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="enlace-institucional"
                          onClick={() => toggleFila(registro.idFila)}
                        >
                          {filaExpandida === registro.idFila ? 'Cerrar' : 'Editar'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Fila expandida (Modo Edición) */}
                    {filaExpandida === registro.idFila && (
                      <tr className="fila-expandida">
                        <td colSpan={(correccion ? 6 : 4) + columnasVisibles.length}>
                          <div className="editor-grid">
                            {Object.keys(registro)
                              .filter((key) => correccion
                                ? ['nombre', 'textoGenerado'].includes(key)
                                : !CAMPOS_OCULTOS_EN_EDICION.has(key))
                              .map(key => (
                              <div className={`editor-field ${key === 'nombre' ? 'editor-field--ancho' : ''}`} key={key}>
                                <label>{mapaNombresCampos[key] || key}</label>
                                {key === 'nombre' ? (
                                  <textarea
                                    className="input-institucional editor-textarea editor-textarea--nombre"
                                    rows={2}
                                    value={registro[key] ?? ''}
                                    onChange={(e) => onActualizarRegistro(registro.idFila, key, e.target.value)}
                                  />
                                ) : CAMPOS_TEXTO_LARGO.has(key) ? (
                                  <textarea
                                    className="input-institucional editor-textarea"
                                    value={registro[key] ?? ''}
                                    onChange={(e) => onActualizarRegistro(registro.idFila, key, e.target.value)}
                                  />
                                ) : (
                                  <input
                                    className="input-institucional"
                                    value={registro[key] ?? ''}
                                    onChange={(e) => onActualizarRegistro(registro.idFila, key, e.target.value)}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filasVisibles.length === 0 && (
                <tr>
                  <td colSpan={(correccion ? 6 : 4) + columnasVisibles.length} style={{ textAlign: 'center', padding: '40px' }}>
                    {correccion
                      ? 'No hay constancias que coincidan con la búsqueda.'
                      : 'No hay datos cargados. Regrese al paso anterior.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};