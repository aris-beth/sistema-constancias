// src/pantallas/PantallaCarga.tsx
import React from 'react';
import '../styles/design-system.css';

export type ModoConstancia = 'regular' | 'graduacion';

interface PantallaCargaProps {
  modo: ModoConstancia;
  onCambiarModo: (modo: ModoConstancia) => void;
  // Estos métodos ya llaman a window.electronAPI.cargarExcel/cargarGraduacion,
  // que abren el diálogo nativo de Electron y devuelven las filas procesadas.
  // No reciben un File: el diálogo nativo elige el archivo por su ruta en disco.
  manejarCargarExcel: () => void;
  manejarCargarGraduacion: () => void;
  cargando?: boolean;
}

export const PantallaCarga: React.FC<PantallaCargaProps> = ({
  modo,
  onCambiarModo,
  manejarCargarExcel,
  manejarCargarGraduacion,
  cargando = false,
}) => {
  const titulo = modo === 'graduacion' 
    ? 'SISTEMA DE RECONOCIMIENTOS GRADUACIÓN' 
    : 'SISTEMA DE CONSTANCIAS';

  const handleCardClick = () => {
    if (cargando) return;
    if (modo === 'graduacion') {
      manejarCargarGraduacion();
    } else {
      manejarCargarExcel();
    }
  };

  return (
    <div className="carga-container">
      <h1 className="carga-titulo">{titulo}</h1>

      <div
        className="upload-card"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-disabled={cargando}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
      >
        <svg className="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span className="upload-text-main">{cargando ? 'Cargando…' : 'Upload file'}</span>
        <span className="upload-text-sub">
          {cargando ? 'Procesando el archivo, un momento' : 'Haz clic para elegir tu archivo de Excel'}
        </span>
      </div>

      <div className="carga-enlaces">
        {modo === 'regular' ? (
          <button className="enlace-institucional" onClick={() => onCambiarModo('graduacion')}>
            Cargar plantilla para RECONOCIMIENTO GRADUACIÓN
          </button>
        ) : (
          <button className="enlace-institucional" onClick={() => onCambiarModo('regular')}>
            Cargar plantilla para CONSTANCIAS REGULARES
          </button>
        )}
      </div>
    </div>
  );
};