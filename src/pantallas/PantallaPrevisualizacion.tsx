import React, { useState, useEffect, useMemo } from 'react';
import { RegistroExcel, ErrorValidacion } from './PantallaValidacion';
import type { ModoConstancia } from './PantallaCarga';
import { registroAFila, registroAFilaGraduacion } from '../utils/registros';
import '../styles/design-system.css';

interface PantallaPrevisualizacionProps {
  registros: RegistroExcel[];
  errores: ErrorValidacion[];
  folioEvento: string;
  modo: ModoConstancia;
}

export const PantallaPrevisualizacion: React.FC<PantallaPrevisualizacionProps> = ({
  registros,
  errores,
  folioEvento,
  modo
}) => {
  // Agrupar los registros por Rol para facilitar la navegación
  const rolesMap = useMemo(() => {
    const map = new Map<string, RegistroExcel[]>();
    registros.forEach(r => {
      const current = map.get(r.rol) || [];
      current.push(r);
      map.set(r.rol, current);
    });
    return map;
  }, [registros]);

  const roles = Array.from(rolesMap.keys());
  
  const [rolActualIndex, setRolActualIndex] = useState(0);
  const [docActualIndex, setDocActualIndex] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);

  const rolActual = roles[rolActualIndex];
  const registrosDelRol = rolesMap.get(rolActual) || [];
  const registroActual = registrosDelRol[docActualIndex];

  // Todas las filas del lote se mandan al proceso main: el encabezado
  // (CONSTANCIA/RECONOCIMIENTO) depende del conteo por persona.
  const entradaBase = useMemo(
    () =>
      modo === 'graduacion'
        ? { filasGraduacion: registros.map((r) => registroAFilaGraduacion(r, errores)) }
        : { filasRegular: registros.map((r) => registroAFila(r, errores)) },
    [registros, errores, modo],
  );

  useEffect(() => {
    if (!registroActual) return;
    let cancelado = false;

    const cargarPrevisualizacion = async () => {
      setCargando(true);
      try {
        const html = await window.electronAPI.previsualizarDocumento({
          modo,
          folioEvento,
          numeroFila: Number(registroActual.idFila),
          ...entradaBase,
        });
        if (!cancelado) setHtmlContent(html);
      } catch (error) {
        console.error('Error al cargar HTML de previsualización:', error);
        if (!cancelado) {
          const mensaje = error instanceof Error ? error.message : String(error);
          setHtmlContent(
            `<html><body style="font-family:sans-serif;color:#DC2626;text-align:center;padding:32px">` +
              `<h3>No se pudo generar la previsualización</h3><p>${mensaje.replace(/</g, '&lt;')}</p></body></html>`,
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargarPrevisualizacion();
    // Si el usuario navega rápido, la respuesta vieja se descarta.
    return () => {
      cancelado = true;
    };
  }, [registroActual, folioEvento, modo, entradaBase]);

  const manejarSiguienteRol = () => {
    setRolActualIndex((prev) => (prev + 1) % roles.length);
    setDocActualIndex(0); // Reiniciar al primer documento del nuevo rol
  };

  const manejarAnteriorDoc = () => setDocActualIndex(prev => Math.max(0, prev - 1));
  const manejarSiguienteDoc = () => setDocActualIndex(prev => Math.min(registrosDelRol.length - 1, prev + 1));

  if (registros.length === 0) {
    return <div className="previsualizacion-layout"><p>No hay registros para previsualizar.</p></div>;
  }

  return (
    <div className="previsualizacion-layout">
      <div className="prev-header">
        <h2>PREVISUALIZACIÓN</h2>
        <div className="prev-rol-info">
          <span className="prev-rol-badge">{rolActual}</span>
          {roles.length > 1 && (
            <button className="btn-institucional" onClick={manejarSiguienteRol}>
              Siguiente archivo de rol
            </button>
          )}
        </div>
      </div>

      <div className="prev-viewer-container">
        {/* Flecha Izquierda */}
        <button 
          className="btn-flecha-prev" 
          onClick={manejarAnteriorDoc} 
          disabled={docActualIndex === 0 || cargando}
          aria-label="Documento anterior"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Visor PDF en HTML (iframe) */}
        <div className="iframe-wrapper">
          {cargando && <div className="iframe-loading">Generando previsualización...</div>}
          <iframe 
            srcDoc={htmlContent} 
            title={`Previsualización - ${registroActual?.nombre}`} 
          />
        </div>

        {/* Flecha Derecha */}
        <button 
          className="btn-flecha-prev" 
          onClick={manejarSiguienteDoc} 
          disabled={docActualIndex === registrosDelRol.length - 1 || cargando}
          aria-label="Documento siguiente"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <span className="prev-contador">
        Documento {docActualIndex + 1} de {registrosDelRol.length}
      </span>
    </div>
  );
};