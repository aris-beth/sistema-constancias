// src/pantallas/PantallaCarga.tsx
import React, { useState } from 'react';
import type { Evento } from '../../shared/types/evento';
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
  listarEventosReimprimibles: () => Promise<Evento[]>;
  onReimprimir: (folio: string) => void;
  cargando?: boolean;
}

export const PantallaCarga: React.FC<PantallaCargaProps> = ({
  modo,
  onCambiarModo,
  manejarCargarExcel,
  manejarCargarGraduacion,
  listarEventosReimprimibles,
  onReimprimir,
  cargando = false,
}) => {
  const [eventosGuardados, setEventosGuardados] = useState<Evento[] | null>(null);
  const [folioSeleccionado, setFolioSeleccionado] = useState('');
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [errorReimpresion, setErrorReimpresion] = useState<string | null>(null);
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

  const handleMostrarEventos = async () => {
    setCargandoEventos(true);
    setErrorReimpresion(null);
    setEventosGuardados(null);
    setFolioSeleccionado('');
    try {
      setEventosGuardados(await listarEventosReimprimibles());
    } catch (error) {
      setErrorReimpresion(error instanceof Error ? error.message : String(error));
    } finally {
      setCargandoEventos(false);
    }
  };

  const handleCambiarModo = (nuevoModo: ModoConstancia) => {
    setEventosGuardados(null);
    setFolioSeleccionado('');
    setErrorReimpresion(null);
    onCambiarModo(nuevoModo);
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
          <button className="enlace-institucional" onClick={() => handleCambiarModo('graduacion')}>
            Cargar plantilla para RECONOCIMIENTO GRADUACIÓN
          </button>
        ) : (
          <button className="enlace-institucional" onClick={() => handleCambiarModo('regular')}>
            Cargar plantilla para CONSTANCIAS REGULARES
          </button>
        )}
      </div>

      <section className="reimpresion-panel" aria-label="Reimpresión de lotes guardados">
        <button
          className="enlace-institucional"
          onClick={handleMostrarEventos}
          disabled={cargando || cargandoEventos}
        >
          {cargandoEventos ? 'Buscando eventos…' : 'Reimprimir lote guardado'}
        </button>
        {errorReimpresion && <p className="mensaje-error-carga" role="alert">{errorReimpresion}</p>}
        {eventosGuardados !== null && (
          eventosGuardados.length === 0 ? (
            <p>No hay eventos guardados disponibles para reimprimir.</p>
          ) : (
            <div className="reimpresion-controles">
              <label htmlFor="evento-reimpresion">Selecciona el evento que deseas reimprimir:</label>
              <select
                id="evento-reimpresion"
                value={folioSeleccionado}
                onChange={(evento) => setFolioSeleccionado(evento.target.value)}
              >
                <option value="">Selecciona un evento</option>
                {eventosGuardados.map((evento) => (
                  <option key={evento.id} value={evento.folio}>
                    {evento.folio} — {evento.nombreEvento} ({evento.fechaConstancia})
                  </option>
                ))}
              </select>
              <button
                className="btn-institucional"
                onClick={() => onReimprimir(folioSeleccionado)}
                disabled={!folioSeleccionado}
              >
                CONTINUAR A REIMPRESIÓN
              </button>
            </div>
          )
        )}
      </section>
    </div>
  );
};