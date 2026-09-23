// src/App.tsx
import React, { useState } from 'react';
import { BarraNavegacionPrincipal, VistaActiva } from './components/BarraNavegacionPrincipal';
import { BotonCircular } from './components/BotonCircular';
import EditorConfiguracion from './EditorConfiguracion';
import PanelEstadisticas from './PanelEstadisticas';
import VistaPreviaCodigosQr from './pantallas/VistaPreviaCodigosQr';
import { PantallaCarga, ModoConstancia } from './pantallas/PantallaCarga';
import { PantallaValidacion, RegistroExcel, ErrorValidacion } from './pantallas/PantallaValidacion';
import { PantallaPrevisualizacion } from './pantallas/PantallaPrevisualizacion';
import type { FilaProcesada, FilaProcesadaGraduacion } from '../shared/types/ipc';
import './styles/design-system.css';

type PasoConstancias = 'carga' | 'validacion' | 'previsualizacion' | 'generar';

const App: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('constancias');
  const [volverDesdeQr, setVolverDesdeQr] = useState<VistaActiva>('plantillas');
  const [pasoConstancias, setPasoConstancias] = useState<PasoConstancias>('carga');

  // Estados de datos (Preservados en memoria al cambiar de vistas)
  const [modoConstancia, setModoConstancia] = useState<ModoConstancia>('regular');
  const [folioEvento, setFolioEvento] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroExcel[]>([]);
  const [errores, setErrores] = useState<ErrorValidacion[]>([]);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Función de bloqueo de navegación
  const tieneErroresBloqueantes = pasoConstancias === 'validacion' && errores.length > 0;

  const manejarSiguiente = () => {
    if (tieneErroresBloqueantes) return; // Validación funcional: Bloquear si hay errores

    switch (pasoConstancias) {
      case 'carga': setPasoConstancias('validacion'); break;
      case 'validacion': setPasoConstancias('previsualizacion'); break;
      case 'previsualizacion': setPasoConstancias('generar'); break;
      default: break;
    }
  };

  const manejarRegresar = () => {
    switch (pasoConstancias) {
      case 'generar': setPasoConstancias('previsualizacion'); break;
      case 'previsualizacion': setPasoConstancias('validacion'); break;
      case 'validacion': setPasoConstancias('carga'); break;
      default: break;
    }
  };

  // --- MÉTODOS DE INTEGRACIÓN DE LECTURA (Carga) ---
  // Convierte una fila procesada por el backend (Electron) en el formato
  // genérico que ya consumen PantallaValidacion / PantallaPrevisualizacion.
  const filaARegistro = (fila: FilaProcesada): RegistroExcel => ({
    idFila: String(fila.numeroFila),
    nombre: fila.nombreNormalizado ?? fila.nombreOriginal,
    rol: fila.participaComo,
    nombreOriginal: fila.nombreOriginal,
    gradoDetectado: fila.gradoDetectado,
    textoGenerado: fila.textoGenerado,
    textoPersonalizado: fila.textoPersonalizado,
    esPersonalizado: fila.esPersonalizado,
    universidadExterna: fila.universidadExterna,
    confianza: fila.confianza,
    nombrePonencia: fila.nombrePonencia,
    nombreEvento: fila.nombreEvento,
    fechaConstancia: fila.fechaConstancia,
    universidadOrigen: fila.universidadOrigen,
    modalidad: fila.modalidad,
    categoria: fila.categoria,
  });

  const filaGraduacionARegistro = (fila: FilaProcesadaGraduacion): RegistroExcel => ({
    idFila: String(fila.numeroFila),
    nombre: fila.nombreNormalizado ?? fila.nombreOriginal,
    rol: fila.subtipo,
    nombreOriginal: fila.nombreOriginal,
    textoGenerado: fila.textoGenerado,
    confianza: fila.confianza,
    generacion: fila.generacion,
    carrera: fila.carrera,
    // Mismo nombre de campo que en el modo regular (fechaConstancia) para
    // que la tabla de validación pueda mostrar una sola columna "Fecha"
    // sin importar el modo de carga.
    fechaConstancia: fila.fecha,
  });

  // Las filas que el backend marcó con error (nombre vacío, rol no
  // reconocido, etc.) se convierten en errores de validación bloqueantes,
  // igual que hacía la versión anterior de la app.
  const erroresDeFilas = (
    filas: Array<{ numeroFila: number; error: string | null }>,
  ): ErrorValidacion[] =>
    filas
      .filter((fila) => fila.error)
      .map((fila) => ({
        idFila: String(fila.numeroFila),
        campo: 'nombre',
        mensaje: fila.error as string,
      }));

  const manejarCargarExcel = async () => {
    if (cargandoArchivo) return;
    setCargandoArchivo(true);
    setErrorCarga(null);
    try {
      const resultado = await window.electronAPI.cargarExcel();
      if (!resultado) return; // el usuario canceló el diálogo nativo
      setRegistros(resultado.filas.map(filaARegistro));
      setErrores(erroresDeFilas(resultado.filas));
      setPasoConstancias('validacion');
    } catch (error) {
      console.error('Error al cargar el Excel:', error);
      setErrorCarga(error instanceof Error ? error.message : String(error));
    } finally {
      setCargandoArchivo(false);
    }
  };

  const manejarCargarGraduacion = async () => {
    if (cargandoArchivo) return;
    setCargandoArchivo(true);
    setErrorCarga(null);
    try {
      const resultado = await window.electronAPI.cargarGraduacion();
      if (!resultado) return; // el usuario canceló el diálogo nativo
      setRegistros(resultado.filas.map(filaGraduacionARegistro));
      setErrores(erroresDeFilas(resultado.filas));
      setPasoConstancias('validacion');
    } catch (error) {
      console.error('Error al cargar el Excel de graduación:', error);
      setErrorCarga(error instanceof Error ? error.message : String(error));
    } finally {
      setCargandoArchivo(false);
    }
  };

  // --- MÉTODOS DE INTEGRACIÓN DE EDICIÓN (Validación) ---
  const manejarActualizarRegistro = (idFila: string, campo: string, valor: any) => {
    setRegistros(prev => prev.map(r => r.idFila === idFila ? { ...r, [campo]: valor } : r));
    // Opcional: Revalidar el error en tiempo real (Ej. Si llenó el nombre, quitar error)
    if (campo === 'nombre' && valor.trim() !== '') {
      setErrores(prev => prev.filter(e => !(e.idFila === idFila && e.campo === 'nombre')));
    }
  };

  const manejarVolverDesdeConfiguracion = () => {
    setVistaActiva('constancias');
    setPasoConstancias('carga');
  };

  const renderizarFlujoConstancias = () => {
    switch (pasoConstancias) {
      case 'carga':
        return (
          <>
            <PantallaCarga 
              modo={modoConstancia}
              onCambiarModo={setModoConstancia}
              manejarCargarExcel={manejarCargarExcel}
              manejarCargarGraduacion={manejarCargarGraduacion}
              cargando={cargandoArchivo}
            />
            {errorCarga && <p className="mensaje-error-carga">{errorCarga}</p>}
          </>
        );
      case 'validacion':
        return (
          <PantallaValidacion 
            folioEvento={folioEvento}
            setFolioEvento={setFolioEvento}
            registros={registros}
            errores={errores}
            onActualizarRegistro={manejarActualizarRegistro}
          />
        );
      case 'previsualizacion':
        return (
          <PantallaPrevisualizacion 
            registros={registros}
            folioEvento={folioEvento}
          />
        );
      case 'generar':
        return <div><h2>4. Generación y Códigos QR</h2><p>Constancias generadas exitosamente.</p></div>;
      default:
        return null;
    }
  };

  const renderizarContenidoPrincipal = () => {
    switch (vistaActiva) {
      case 'plantillas':
        return <EditorConfiguracion onVolver={manejarVolverDesdeConfiguracion} onAbrirQrs={() => { setVolverDesdeQr('plantillas'); setVistaActiva('qrs'); }} />;
      case 'metricas':
        return <PanelEstadisticas onVolver={manejarVolverDesdeConfiguracion} />;
      case 'qrs':
        return <VistaPreviaCodigosQr onVolver={() => setVistaActiva(volverDesdeQr)} />;
      case 'constancias':
      default:
        return renderizarFlujoConstancias();
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <BarraNavegacionPrincipal 
          vistaActiva={vistaActiva} 
          onCambiarVista={setVistaActiva} 
        />
      </header>

      <main className="app-main">
        {/* Navegación Izquierda */}
        <aside className="nav-lateral">
          {vistaActiva === 'constancias' && pasoConstancias !== 'carga' && (
            <BotonCircular 
              direccion="izquierda" 
              etiqueta="REGRESAR" 
              onClick={manejarRegresar} 
            />
          )}
        </aside>

        {/* Contenedor Central */}
        <section className="content-area">
          {renderizarContenidoPrincipal()}
        </section>

        {/* Navegación Derecha */}
        <aside className="nav-lateral">
          {vistaActiva === 'constancias' && pasoConstancias !== 'generar' && (
            <BotonCircular 
              direccion="derecha" 
              etiqueta="SIGUIENTE" 
              onClick={manejarSiguiente} 
              disabled={tieneErroresBloqueantes}
            />
          )}
        </aside>
      </main>
    </div>
  );
};

export default App;