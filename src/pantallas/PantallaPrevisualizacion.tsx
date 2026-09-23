import React, { useState, useEffect, useMemo } from 'react';
import { RegistroExcel } from './PantallaValidacion';
import '../styles/design-system.css';

interface PantallaPrevisualizacionProps {
  registros: RegistroExcel[];
  folioEvento: string;
}

export const PantallaPrevisualizacion: React.FC<PantallaPrevisualizacionProps> = ({
  registros,
  folioEvento
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

  useEffect(() => {
    const fetchPrevisualizacion = async () => {
      if (!registroActual) return;

      setCargando(true);
      try {
        const apiConPrevisualizacion = window.electronAPI as typeof window.electronAPI & { invoke?: (canal: string, entrada: unknown) => Promise<string> }
        if (apiConPrevisualizacion.invoke) {
          const html = await apiConPrevisualizacion.invoke('pdf:previsualizarHtml', {
            idFila: registroActual.idFila,
            folio: folioEvento
          });
          setHtmlContent(
            `<html>
              <head>
                <style>
                  body { font-size: 18px; line-height: 1.55; }
                  p, div, span, td, h1, h2, h3, h4 { font-size: 1.05em; }
                  .constancia-texto, .documento, .contenido, main, section { font-size: 1.1em; }
                </style>
              </head>
              <body>${html}</body>
            </html>`
          );
        } else {
          const mockupHtml = `
            <html>
              <head>
                <style>
                  body { display:flex; align-items:center; justify-content:center; margin:0; height:100vh; font-family:sans-serif; color:#333; font-size:18px; }
                  .constancia-card { text-align:center; border:2px solid #003B5C; padding:40px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
                  h1 { color:#003B5C; margin-bottom:8px; font-size:2.1rem; }
                  h2 { color:#666; font-weight:400; margin-top:0; font-size:1.5rem; }
                  p { margin:32px 0; font-size:1.7rem; }
                  .folio { color:#888; font-size:1rem; }
                </style>
              </head>
              <body>
                <div class="constancia-card">
                  <h1>Constancia BUAP</h1>
                  <h2>Rol: ${rolActual}</h2>
                  <p>Otorgada a: <b>${registroActual.nombre}</b></p>
                  <p class="folio">Folio: ${folioEvento || 'Sin folio'}</p>
                </div>
              </body>
            </html>
          `;
          setTimeout(() => setHtmlContent(mockupHtml), 400);
        }
      } catch (error) {
        console.error("Error al cargar HTML de previsualización:", error);
        setHtmlContent('<html><body><h3 style="color:#DC2626;text-align:center; font-size:2rem;">Error al procesar la previsualización del documento.</h3></body></html>');
      } finally {
        setCargando(false);
      }
    };

    fetchPrevisualizacion();
  }, [registroActual, folioEvento]);

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