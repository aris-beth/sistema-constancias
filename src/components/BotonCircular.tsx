import React from 'react';
import '../styles/design-system.css';

interface BotonCircularProps {
  direccion: 'izquierda' | 'derecha';
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
}

export const BotonCircular: React.FC<BotonCircularProps> = ({ 
  direccion, 
  etiqueta, 
  onClick, 
  disabled = false 
}) => {
  const esIzquierda = direccion === 'izquierda';

  return (
    <button 
      className="boton-circular-wrapper" 
      onClick={onClick} 
      disabled={disabled}
      aria-label={etiqueta}
    >
      <div className="circulo-icono">
        {esIzquierda ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        )}
      </div>
      <span className="etiqueta-boton">{etiqueta}</span>
    </button>
  );
};