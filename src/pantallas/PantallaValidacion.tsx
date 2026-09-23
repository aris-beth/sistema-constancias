// src/pantallas/PantallaValidacion.tsx
import React, { useState } from 'react';
import '../styles/design-system.css';

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
  { key: 'universidadOrigen', label: 'Universidad de origen' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'generacion', label: 'Generación' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'confianza', label: 'Confianza' },
  { key: 'textoPersonalizado', label: 'Texto personalizado', truncar: true },
  { key: 'textoGenerado', label: 'Texto de la constancia (vista previa)' },
];

const CAMPOS_TEXTO_LARGO = new Set(['textoPersonalizado', 'textoGenerado']);

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
  onActualizarRegistro
}) => {
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  // Solo se muestran las columnas extra que traigan dato en al menos un
  // registro — así la tabla de "regular" no muestra Generación/Carrera
  // vacías, ni la de "graduación" muestra Ponencia/Universidad vacías.
  const columnasVisibles = COLUMNAS_EXTRA.filter((columna) =>
    registros.some((registro) => celdaTieneValor(registro[columna.key])),
  );

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

  const manejarGuardar = () => {
    // Al guardar, normalmente se actualiza el estado hacia el backend.
    // Como los cambios se reflejan on-fly en onActualizarRegistro, aquí solo damos feedback.
    alert('Cambios guardados localmente. Revise si aún quedan errores antes de continuar.');
  };

  return (
    <div className="validacion-layout">
      
      {/* Contenido Principal */}
      <div className="validacion-main">
        <div className="folio-input-container">
          <label htmlFor="folio" style={{ fontWeight: 600 }}>Ingresar folio:</label>
          <input
            id="folio"
            type="text"
            className="input-institucional"
            placeholder="Ej. BUAP-2026-001"
            value={folioEvento}
            onChange={(e) => setFolioEvento(e.target.value)}
          />
          <div style={{ flex: 1 }}></div>
          <button className="btn-institucional" onClick={manejarGuardar}>
            Guardar cambios
          </button>
        </div>

        <div className="tabla-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Participa como</th>
                {columnasVisibles.map((columna) => (
                  <th key={columna.key}>{columna.label}</th>
                ))}
                <th>Errores</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => {
                const erroresFila = erroresDeFila(registro.idFila);
                const tieneError = erroresFila.length > 0;
                
                return (
                  <React.Fragment key={registro.idFila}>
                    <tr 
                      id={`fila-${registro.idFila}`} 
                      className={`fila-dato ${tieneError ? 'con-error' : ''}`}
                    >
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
                      <td>
                        {tieneError ? (
                          <span className="celda-error-badge" title={erroresFila.map((e) => e.mensaje).join(' | ')}>
                            {erroresFila.map((e) => e.mensaje).join(' | ')}
                          </span>
                        ) : (
                          <span className="celda-vacia">—</span>
                        )}
                      </td>
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
                        <td colSpan={4 + columnasVisibles.length}>
                          <div className="editor-grid">
                            {Object.keys(registro).filter(k => k !== 'idFila').map(key => (
                              <div className="editor-field" key={key}>
                                <label>{mapaNombresCampos[key] || key}</label>
                                {CAMPOS_TEXTO_LARGO.has(key) ? (
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
              {registros.length === 0 && (
                <tr>
                  <td colSpan={4 + columnasVisibles.length} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay datos cargados. Regrese al paso anterior.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Lateral de Errores */}
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
          
          {errores.map((error, idx) => {
            const numeroFila = registros.findIndex(r => r.idFila === error.idFila) + 1;
            const etiquetaLegible = mapaNombresCampos[error.campo] || error.campo;
            
            return (
              <div 
                key={idx} 
                className="error-item" 
                onClick={() => enfocarError(error.idFila)}
                title="Clic para ir a la fila"
              >
                <p>
                  Error en fila <strong>{numeroFila || '?'}</strong> en el apartado <strong>{etiquetaLegible}</strong>
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                  {error.mensaje}
                </span>
              </div>
            );
          })}
        </aside>
      )}
    </div>
  );
};