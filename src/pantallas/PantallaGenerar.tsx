import React from 'react';
import '../styles/design-system.css';

export interface ResumenGeneracion {
  rolesExitosos: { rol: string; cantidad: number }[];
  errores: { constanciaId: string; cantidad: number; detalle: string }[];
  totalGenerados: number;
  rutaFinal: string;
  advertencias?: string[];
}

interface PantallaGenerarProps {
  rutaSalida: string;
  isGenerando: boolean;
  resultados: ResumenGeneracion | null;
  onExaminarCarpeta: () => void;
  onGenerar: () => void;
}

export const PantallaGenerar: React.FC<PantallaGenerarProps> = ({
  rutaSalida,
  isGenerando,
  resultados,
  onExaminarCarpeta,
  onGenerar
}) => {
  return (
    <div className="generar-container">
      {/* Selector de Carpeta */}
      <div className="carpeta-box">
        <label>Carpeta donde se guardará(n) el(los) archivo(s) final:</label>
        <div className="carpeta-controles">
          <div className="ruta-display" title={rutaSalida || 'Ninguna carpeta seleccionada'}>
            {rutaSalida || 'Ninguna carpeta seleccionada...'}
          </div>
          <button 
            className="btn-institucional" 
            onClick={onExaminarCarpeta}
            disabled={isGenerando}
          >
            EXAMINAR CARPETA
          </button>
        </div>
      </div>

      {/* Botón Principal Generar */}
      <button 
        className="btn-generar-principal"
        onClick={onGenerar}
        disabled={!rutaSalida || isGenerando}
      >
        {isGenerando ? (
          <>
            <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            GENERANDO...
          </>
        ) : (
          'GENERAR'
        )}
      </button>

      {/* Bitácora de Resultados */}
      {resultados && (
        <div className="bitacora-card">
          <h3 className="bitacora-titulo">Bitácora de Generación</h3>
          <ul className="bitacora-lista">
            
            {/* Éxitos por Rol */}
            {resultados.rolesExitosos.map((res, idx) => (
              <li key={`exito-${idx}`} className="bitacora-item">
                <span className="badge badge-exito">Éxito</span>
                <span>
                  <strong>{res.cantidad}</strong> constancias para <strong>{res.rol}</strong> generadas satisfactoriamente
                </span>
              </li>
            ))}

            {/* Errores */}
            {resultados.errores.map((err, idx) => (
              <li key={`error-${idx}`} className="bitacora-item">
                <span className="badge badge-error">Error</span>
                <span>
                  <strong>{err.cantidad}</strong> error(es) en <strong>{err.constanciaId}</strong>
                  <br/>
                  <small style={{ color: 'var(--color-texto-secundario)' }}>Detalle: {err.detalle}</small>
                </span>
              </li>
            ))}

            {/* Advertencias (firma faltante, recursos, etc.) */}
            {(resultados.advertencias ?? []).map((aviso, idx) => (
              <li key={`aviso-${idx}`} className="bitacora-item">
                <span className="badge badge-info">Aviso</span>
                <span>{aviso}</span>
              </li>
            ))}

            {/* Ubicación Final */}
            {resultados.totalGenerados > 0 && (
            <li className="bitacora-item" style={{ marginTop: '8px' }}>
              <span className="badge badge-info">Ubicación</span>
              <span>
                <strong>{resultados.totalGenerados}</strong> documento(s) generado(s) guardado(s) en:
                <br/>
                <strong style={{ wordBreak: 'break-all', color: 'var(--color-institucional)' }}>{resultados.rutaFinal}</strong>
              </span>
            </li>
            )}
            
          </ul>
        </div>
      )}
      
      {/* Estilo local para el spinner del botón */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};