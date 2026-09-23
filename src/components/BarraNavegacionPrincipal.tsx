import React from 'react';
import '../styles/design-system.css';

export type VistaActiva = 'constancias' | 'plantillas' | 'metricas' | 'qrs';

interface BarraNavegacionProps {
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
}

export const BarraNavegacionPrincipal: React.FC<BarraNavegacionProps> = ({ 
  vistaActiva, 
  onCambiarVista 
}) => {
  const tabs: { id: VistaActiva; label: string }[] = [
    { id: 'constancias', label: 'Carga de archivos' },
    { id: 'plantillas', label: 'Edición de plantillas' },
    { id: 'metricas', label: 'Métricas constancias' }
  ];

  return (
    <nav aria-label="Navegación principal del sistema">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${vistaActiva === tab.id ? 'active' : ''}`}
            onClick={() => onCambiarVista(tab.id)}
            aria-current={vistaActiva === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};