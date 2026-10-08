// src/App.tsx
import React, { useRef, useState } from 'react';
import { BarraNavegacionPrincipal, VistaActiva } from './components/BarraNavegacionPrincipal';
import { BotonCircular } from './components/BotonCircular';
import EditorConfiguracion from './EditorConfiguracion';
import PanelEstadisticas from './PanelEstadisticas';
import CatalogoFolios from './pantallas/CatalogoFolios';
import { PantallaCarga, ModoConstancia } from './pantallas/PantallaCarga';
import { PantallaValidacion, RegistroExcel, ErrorValidacion } from './pantallas/PantallaValidacion';
import { PantallaPrevisualizacion } from './pantallas/PantallaPrevisualizacion';
import { PantallaGenerar, ResumenGeneracion } from './pantallas/PantallaGenerar';
import {
  actualizarNombreRegistro,
  registroAFila,
  registroAFilaGraduacion,
  registroAFilaCruda,
  registroAFilaCrudaGraduacion,
} from './utils/registros';
import type { FilaProcesada, FilaProcesadaGraduacion } from '../shared/types/ipc';
import type { Evento } from '../shared/types/evento';
import './styles/design-system.css';

type PasoConstancias = 'carga' | 'validacion' | 'previsualizacion' | 'generar';

const App: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('constancias');
  const [volverDesdeFolios, setVolverDesdeFolios] = useState<VistaActiva>('plantillas');
  const [pasoConstancias, setPasoConstancias] = useState<PasoConstancias>('carga');

  // Estados de datos (Preservados en memoria al cambiar de vistas)
  const [modoConstancia, setModoConstancia] = useState<ModoConstancia>('regular');
  const [folioEvento, setFolioEvento] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroExcel[]>([]);
  const [errores, setErrores] = useState<ErrorValidacion[]>([]);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  // Filas editadas que todavía no se han revalidado con "Actualizar cambios".
  const [filasPendientes, setFilasPendientes] = useState<string[]>([]);
  const [actualizando, setActualizando] = useState(false);
  const [mensajeActualizacion, setMensajeActualizacion] = useState<string | null>(null);
  // Campos que la persona escribió a mano: una revalidación no debe pisarlos.
  const camposManuales = useRef<Map<string, Set<string>>>(new Map());

  // Estado de la pantalla 4 (Generación)
  const [rutaSalida, setRutaSalida] = useState<string>('');
  const [generando, setGenerando] = useState(false);
  const [resultadoGeneracion, setResultadoGeneracion] = useState<ResumenGeneracion | null>(null);
  // Folio con el que el lote ya quedó guardado en la base. Sirve para que un
  // reintento (p. ej. si falló solo el PDF) no vuelva a reemplazar el lote.
  const [folioPersistido, setFolioPersistido] = useState<string | null>(null);
  const [esReimpresion, setEsReimpresion] = useState(false);

  // Función de bloqueo de navegación
  const tieneErroresBloqueantes =
    pasoConstancias === 'validacion' && (errores.length > 0 || filasPendientes.length > 0);

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
      case 'generar':
        if (esReimpresion) {
          setEsReimpresion(false);
          setFolioPersistido(null);
          setFolioEvento('');
          setPasoConstancias('carga');
        } else {
          setPasoConstancias('previsualizacion');
        }
        break;
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

  const reiniciarEdicion = () => {
    camposManuales.current = new Map();
    setFilasPendientes([]);
    setMensajeActualizacion(null);
  };

  const manejarCargarExcel = async () => {
    if (cargandoArchivo) return;
    setCargandoArchivo(true);
    setErrorCarga(null);
    try {
      const resultado = await window.electronAPI.cargarExcel();
      if (!resultado) return; // el usuario canceló el diálogo nativo
      reiniciarEdicion();
      setFolioPersistido(null);
      setFolioEvento('');
      setEsReimpresion(false);
      setResultadoGeneracion(null);
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
      reiniciarEdicion();
      setFolioPersistido(null);
      setFolioEvento('');
      setEsReimpresion(false);
      setResultadoGeneracion(null);
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
  const marcarPendientes = (ids: string[]) => {
    setFilasPendientes((prev) => Array.from(new Set([...prev, ...ids])));
    setMensajeActualizacion(null);
  };

  const manejarActualizarRegistro = (idFila: string, campo: string, valor: any) => {
    // Si se edita algo después de guardar, el lote guardado ya no coincide.
    setFolioPersistido(null);
    const manuales = camposManuales.current.get(idFila) ?? new Set<string>();
    manuales.add(campo);
    camposManuales.current.set(idFila, manuales);
    marcarPendientes([idFila]);
    setRegistros(prev => prev.map(r => {
      if (r.idFila !== idFila) return r;
      if (campo === 'nombre') return actualizarNombreRegistro(r, String(valor));
      return { ...r, [campo]: valor };
    }));
  };

  // El nombre del evento es un solo dato por lote: se aplica a todas las filas.
  const manejarCambiarNombreEvento = (nombre: string) => {
    if (modoConstancia !== 'regular') return;
    setFolioPersistido(null);
    setRegistros(prev => prev.map(r => ({ ...r, nombreEvento: nombre })));
    marcarPendientes(registros.map(r => r.idFila));
  };

  // Botón "Actualizar cambios": vuelve a validar en el backend las filas
  // editadas (y las que tenían error) y refresca errores, textos y estado.
  const manejarActualizarCambios = async () => {
    if (actualizando) return;
    const conError = new Set(errores.map(e => e.idFila));
    const ids = new Set([...filasPendientes, ...conError]);
    const aRevalidar = registros.filter(r => ids.has(r.idFila));
    if (aRevalidar.length === 0) return;

    setActualizando(true);
    setMensajeActualizacion(null);
    try {
      const filas = modoConstancia === 'regular'
        ? await window.electronAPI.revalidarFilas(aRevalidar.map(registroAFilaCruda))
        : await window.electronAPI.revalidarFilasGraduacion(aRevalidar.map(registroAFilaCrudaGraduacion));
      const porId = new Map<string, any>(filas.map((fila) => [String(fila.numeroFila), fila]));

      setRegistros(prev => prev.map(r => {
        const nueva = porId.get(r.idFila);
        if (!nueva || nueva.error) return r;
        const manuales = camposManuales.current.get(r.idFila) ?? new Set<string>();
        const actualizado: RegistroExcel = { ...r };
        if (!manuales.has('nombre')) actualizado.nombre = nueva.nombreNormalizado ?? r.nombre;
        if (!manuales.has('textoGenerado')) actualizado.textoGenerado = nueva.textoGenerado;
        actualizado.confianza = nueva.confianza;
        if (modoConstancia === 'regular') {
          actualizado.gradoDetectado = nueva.gradoDetectado;
          actualizado.esPersonalizado = nueva.esPersonalizado;
          actualizado.universidadExterna = nueva.universidadExterna;
          actualizado.fechaConstancia = nueva.fechaConstancia;
        }
        return actualizado;
      }));

      const nuevosErrores = erroresDeFilas(filas);
      setErrores(prev => [...prev.filter(e => !porId.has(e.idFila)), ...nuevosErrores]);
      setFilasPendientes([]);
      setFolioPersistido(null);
      setMensajeActualizacion(
        nuevosErrores.length === 0
          ? 'Cambios actualizados: ya no hay errores.'
          : `Cambios actualizados: aún quedan ${nuevosErrores.length} fila(s) con error.`,
      );
    } catch (error) {
      setMensajeActualizacion(`No se pudieron actualizar los cambios: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActualizando(false);
    }
  };

  // --- MÉTODOS DE INTEGRACIÓN DE GENERACIÓN (Pantalla 4) ---
  const manejarExaminarCarpeta = async () => {
    try {
      const carpeta = await window.electronAPI.seleccionarCarpetaDestino();
      if (carpeta) setRutaSalida(carpeta);
    } catch (error) {
      console.error('Error al elegir la carpeta:', error);
    }
  };

  const listarEventosParaReimpresion = async (): Promise<Evento[]> =>
    window.electronAPI.listarEventosReimprimibles({ tipoPlantilla: modoConstancia });

  const manejarReimprimirEvento = (folio: string) => {
    setFolioEvento(folio);
    setFolioPersistido(folio);
    setEsReimpresion(true);
    setResultadoGeneracion(null);
    setPasoConstancias('generar');
  };

  const manejarGenerar = async () => {
    if (generando || !rutaSalida) return;
    setGenerando(true);
    setResultadoGeneracion(null);

    try {
      // 1) Guardar el lote. Un folio ya existente reemplaza sus constancias
      // para permitir volver a generar el evento después de editar el Excel.
      let folio = folioEvento.trim();
      const guardarLote = async (): Promise<string> => {
        const guardado = modoConstancia === 'regular'
          ? await window.electronAPI.guardarLote({
              folioEvento: folio || null,
              filas: registros.map((r) => registroAFila(r, errores)),
            })
          : await window.electronAPI.guardarGraduacion({
              folioEvento: folio || null,
              filas: registros.map((r) => registroAFilaGraduacion(r, errores)),
            });
        return guardado.folioEvento;
      };
      if (folioPersistido === null || (modoConstancia === 'regular' && folioPersistido !== folio)) {
        folio = await guardarLote();
        setFolioPersistido(folio);
        setFolioEvento(folio); // refleja en pantalla el folio autogenerado
      } else {
        folio = folioPersistido;
      }

      // 2) Generar los PDFs en la carpeta elegida.
      const pdfs = await window.electronAPI.generarPdfs({ folioEvento: folio, carpetaDestino: rutaSalida });
      setResultadoGeneracion({
        rolesExitosos: pdfs.roles.map((r) => ({ rol: r.rol, cantidad: r.cantidad })),
        errores: pdfs.errores.map((e) => ({
          constanciaId: `el archivo de ${e.rol}`,
          cantidad: e.cantidad,
          detalle: e.detalle,
        })),
        totalGenerados: pdfs.roles.reduce((total, r) => total + r.cantidad, 0),
        rutaFinal: pdfs.carpetaEvento,
        advertencias: pdfs.advertencias,
      });
    } catch (error) {
      console.error('Error al generar los documentos:', error);
      setResultadoGeneracion({
        rolesExitosos: [],
        errores: [
          {
            constanciaId: 'la generación',
            cantidad: 1,
            detalle: error instanceof Error ? error.message : String(error),
          },
        ],
        totalGenerados: 0,
        rutaFinal: rutaSalida,
      });
    } finally {
      setGenerando(false);
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
              listarEventosReimprimibles={listarEventosParaReimpresion}
              onReimprimir={manejarReimprimirEvento}
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
            modo={modoConstancia}
            onCambiarNombreEvento={manejarCambiarNombreEvento}
            filasPendientes={filasPendientes}
            actualizando={actualizando}
            mensajeActualizacion={mensajeActualizacion}
            onActualizarCambios={manejarActualizarCambios}
          />
        );
      case 'previsualizacion':
        return (
          <PantallaPrevisualizacion 
            registros={registros}
            errores={errores}
            folioEvento={folioEvento}
            modo={modoConstancia}
          />
        );
      case 'generar':
        return (
          <PantallaGenerar
            rutaSalida={rutaSalida}
            isGenerando={generando}
            resultados={resultadoGeneracion}
            onExaminarCarpeta={manejarExaminarCarpeta}
            onGenerar={manejarGenerar}
          />
        );
      default:
        return null;
    }
  };

  const renderizarContenidoPrincipal = () => {
    switch (vistaActiva) {
      case 'plantillas':
        return <EditorConfiguracion onVolver={manejarVolverDesdeConfiguracion} onAbrirFolios={() => { setVolverDesdeFolios('plantillas'); setVistaActiva('folios'); }} />;
      case 'metricas':
        return <PanelEstadisticas onVolver={manejarVolverDesdeConfiguracion} />;
      case 'folios':
        return <CatalogoFolios onVolver={() => setVistaActiva(volverDesdeFolios)} />;
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