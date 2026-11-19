# Sistema de Constancias

Aplicación de escritorio para generar de forma automática las constancias y los reconocimientos en PDF de los eventos de la **Facultad de Ciencias de la Computación, BUAP**, a partir de un archivo de Excel.

Funciona 100 % en local: no necesita internet, no envía datos a ningún servidor y guarda su historial en una base de datos SQLite en el equipo del usuario.

> **¿Eres quien va a usar el programa, no quien lo desarrolla?** Lee el *Manual de usuario* y la *Guía rápida* (ver [Documentación](#documentación)). Este README está dirigido a quien instala, mantiene o modifica el proyecto.

---

## Contenido

- [Qué hace](#qué-hace)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Puesta en marcha para desarrollo](#puesta-en-marcha-para-desarrollo)
- [Scripts disponibles](#scripts-disponibles)
- [Generar el instalador para Windows](#generar-el-instalador-para-windows)
- [Instalación y configuración en el equipo del usuario](#instalación-y-configuración-en-el-equipo-del-usuario)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Cómo funciona por dentro](#cómo-funciona-por-dentro)
- [Dónde modificar cada regla](#dónde-modificar-cada-regla)
- [Datos y ubicaciones en disco](#datos-y-ubicaciones-en-disco)
- [Pruebas](#pruebas)
- [Problemas frecuentes de desarrollo](#problemas-frecuentes-de-desarrollo)
- [Notas de entrega y pendientes](#notas-de-entrega-y-pendientes)
- [Documentación](#documentación)
- [Licencias y créditos](#licencias-y-créditos)

---

## Qué hace

- Lee un Excel con los participantes de un evento y valida cada fila (columnas obligatorias, roles, fechas, modalidad, categoría, ponencia).
- Normaliza los nombres conservando el orden capturado, aplica mayúsculas y abrevia grados académicos (Dr., Mtro., Ing., Lic., etc.). Marca confianza baja ante abreviaturas puntadas desconocidas, nombres de una sola palabra, grados múltiples o grupos unidos por «y»; la longitud del nombre y conectores como «de/del» no la reducen.
- Redacta el texto de cada constancia según el rol (ponente, asistente, jurado, moderador, ganador, etc.) y la modalidad del evento. Admite texto personalizado por fila.
- Distingue **constancia** de **reconocimiento**: a partir de cierto número de constancias por persona en un mismo evento (6 de fábrica, configurable) el documento cambia de encabezado.
- Genera el folio del evento y un folio por documento.
- Permite revisar y corregir las filas antes de generar, y previsualizar cada documento.
- Genera los PDF (uno por rol) con el diseño institucional, ajustando el tamaño de letra de nombres y ponencias largos.
- Genera **reconocimientos de graduación** con su propio Excel, subtipos y firmantes.
- Guarda el historial para **reimprimir** un evento sin volver a cargar el Excel.
- Ofrece un catálogo de folios y un panel de métricas.

Lo que **no** hace: enviar correos, generar códigos QR ni exportar las estadísticas.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Escritorio | Electron 31 |
| Interfaz | React 18 + TypeScript, empaquetado con Vite 5 |
| Base de datos | SQLite mediante `better-sqlite3` (módulo nativo) |
| Lectura de Excel | `xlsx` (SheetJS) |
| Generación de PDF | Motor de Chromium de Electron (`printToPDF`) sobre HTML/CSS propio |
| Pruebas | Vitest |
| Instalador | electron-builder (Windows) |
| Tipografía | Source Sans 3 (incluida en `resources/fonts`) |

## Requisitos

**Para desarrollar o generar el instalador:**

- Windows 10/11 de 64 bits (el instalador se genera para Windows y `better-sqlite3` es un módulo nativo).
- Node.js 20 o superior, con npm.
- Conexión a internet solo durante `npm install` (descarga de dependencias y de los binarios de Electron).
- Si `better-sqlite3` no encuentra un binario ya compilado para tu versión, npm lo compilará y necesitará las *Visual Studio Build Tools* (carga de trabajo «Desarrollo para el escritorio con C++») y Python.

**Para usar el programa ya instalado:**

- Windows 10 de 64 bits o superior. No requiere internet.

## Puesta en marcha para desarrollo

```bash
# 1. Instalar dependencias (también recompila los módulos nativos para Electron)
npm install

# 2. (Opcional) crear tu archivo de variables locales
copy .env.example .env

# 3. Ejecutar en modo desarrollo
npm run dev
```

`npm run dev` levanta Vite y abre la ventana de Electron con recarga automática. En desarrollo la base de datos se guarda en la misma carpeta de datos de usuario que la versión instalada (ver [Datos y ubicaciones en disco](#datos-y-ubicaciones-en-disco)).

El archivo `.env.example` es solo una plantilla: hoy el sistema no usa claves ni credenciales.

## Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Modo desarrollo (Vite + Electron con recarga). |
| `npm run build` | Revisa los tipos con TypeScript y compila el renderer (`dist/`) y el proceso principal (`dist-electron/`). |
| `npm run preview` | Sirve la compilación del renderer con Vite. |
| `npm test` | Ejecuta todas las pruebas con Vitest. |
| `npm run package:win` | Compila y genera el instalador de Windows con electron-builder. |

## Generar el instalador para Windows

```bash
npm run package:win
```

- electron-builder toma la configuración de `build` en `package.json` y genera los artefactos en `release/`.
- Los instaladores se generan en `release/`, una carpeta separada de `dist/`, que Vite limpia durante la compilación.
- El icono de Windows se configura en `build.win.icon`; actualmente apunta a `iconsist.ico` en la raíz del proyecto. Sustituye ese archivo por tu propio `.ico` si quieres cambiarlo y vuelve a ejecutar `npm run package:win`.

## Instalación y configuración en el equipo del usuario

1. Ejecutar el instalador en la computadora de la persona que operará el programa.
2. Abrir **Sistema de Constancias** desde su acceso directo.
3. Ir a la pestaña **Edición de plantillas** y dejar configurado antes del primer uso:
   - **Sello**: cargar la imagen del sello (con firma o en blanco) y marcarla como activa. Se recomienda un PNG con fondo transparente.
   - **Persona firmante** y **Cargo** (obligatorios si se usa un sello en blanco).
   - **Máximo de constancias por persona en un evento** (de fábrica, 6).
   - **Firmantes de reconocimiento de graduación** (rectoría y dirección).
4. Presionar **Guardar cambios**.
5. Hacer una prueba con un Excel pequeño y revisar el PDF resultante.

La configuración es por equipo: cada computadora tiene su propio historial, folios y sellos.

## Estructura del proyecto

```text
sistema-constancias/
├── electron/                  Proceso principal de Electron (Node.js)
│   ├── main.ts                Ventana principal y arranque
│   ├── preload.ts             Puente seguro entre la interfaz y el proceso principal
│   ├── business/              Reglas de negocio (sin dependencia de la interfaz)
│   │   ├── catalogos/         Abreviaturas académicas y palabras que no son grado
│   │   ├── folio/             Generación de folios
│   │   ├── autoajuste/        Tamaño de letra y líneas para nombres y ponencias
│   │   ├── reglas/            Constancia o reconocimiento
│   │   ├── reglasRedaccion/   Textos de constancias y de graduación
│   │   ├── validacion/        Validación de filas de Excel
│   │   ├── normalizarNombre.ts
│   │   ├── separarParticipantes.ts
│   │   ├── procesarFilaExcel.ts
│   │   └── orquestarGuardadoLote.ts
│   ├── db/                    SQLite: esquema, conexión, migraciones y repositorios
│   ├── excel/                 Lectores de Excel (regulares y graduación)
│   ├── ipc/                   Manejadores IPC: lo que la interfaz puede pedir al sistema
│   └── pdf/                   Plantilla HTML/CSS, recursos y generación de PDF
├── src/                       Interfaz (React)
│   ├── App.tsx                Flujo principal y pestañas
│   ├── pantallas/             Carga, Validación, Previsualización, Generar, Catálogo de folios
│   ├── components/            Barra de navegación, botones y elementos comunes
│   ├── EditorConfiguracion.tsx  Pestaña «Edición de plantillas»
│   ├── PanelEstadisticas.tsx    Pestaña «Métricas constancias»
│   └── styles/                Sistema de diseño (CSS)
├── shared/types/              Tipos de TypeScript compartidos entre interfaz y proceso principal
├── resources/                 Logo institucional y fuentes (Source Sans 3)
├── index.html                 Punto de entrada de la interfaz
├── vite.config.ts             Configuración de Vite y del plugin de Electron
├── vitest.config.ts           Configuración de pruebas
└── package.json
```

## Cómo funciona por dentro

```text
Interfaz (React)  ──IPC──▶  Manejadores (electron/ipc)  ──▶  Reglas de negocio (electron/business)
                                      │                                  │
                                      ├──▶ Excel (electron/excel)        │
                                      ├──▶ SQLite (electron/db)  ◀───────┘
                                      └──▶ PDF (electron/pdf)
```

1. **Carga.** El manejador de Excel lee la primera hoja, valida los encabezados y devuelve las filas ya procesadas (nombre normalizado, texto de la constancia, errores).
2. **Validación.** La interfaz muestra la tabla; las correcciones se envían a revalidar solo las filas afectadas.
3. **Previsualización.** El proceso principal genera el HTML del documento y la interfaz lo muestra en un `iframe`.
4. **Generar.** Se guarda el lote en SQLite (evento, participantes, constancias y folios) y se generan los PDF. El HTML se escribe en un archivo temporal, se carga en una ventana oculta de Chromium y se imprime a PDF en tamaño carta horizontal. Hay un PDF por rol.
5. **Reimpresión.** Lee el lote guardado en SQLite y repite la generación de PDF con la configuración actual.

La interfaz no accede directamente a Node ni al disco: todo pasa por los canales IPC que expone `preload.ts`.

## Dónde modificar cada regla

| Qué quieres cambiar | Archivo |
| --- | --- |
| Texto de cada rol de constancia | `electron/business/reglasRedaccion/generarTextoConstancia.ts` |
| Texto de reconocimientos de graduación | `electron/business/reglasRedaccion/generarTextoReconocimientoGraduacion.ts` |
| Cómo se escribe el nombre del evento («del», «de la»…) | `electron/business/reglasRedaccion/articuloEvento.ts` |
| Validaciones de columnas, fechas, modalidad y categoría | `electron/business/validacion/validarFilaExcel.ts` (y `validarFilaExcelGraduacion.ts`) |
| Encabezados de Excel que se aceptan | `electron/excel/lectorExcel.ts` y `lectorExcelGraduacion.ts` |
| Acomodo de nombres y nivel de confianza | `electron/business/normalizarNombre.ts` |
| Grados académicos y palabras que se descartan | `electron/business/catalogos/` |
| Instituciones que se consideran internas (BUAP) | `electron/business/instituciones.ts` |
| Separar varias personas en una celda | `electron/business/separarParticipantes.ts` |
| Formato del folio | `electron/business/folio/generarFolio.ts` |
| Cuándo una constancia pasa a ser reconocimiento | `electron/business/reglas/determinarTipoDocumento.ts` (el máximo se cambia desde la pantalla de plantillas) |
| Tamaños de letra y líneas de nombres y ponencias | `electron/business/autoajuste/autoajustarTexto.ts` |
| Diseño del documento (HTML/CSS) | `electron/pdf/plantillaDocumento.ts` |
| Impresión a PDF, carpetas y nombres de archivo | `electron/pdf/generarPdf.ts` |
| Carga de logo, fuentes y sellos | `electron/pdf/recursos.ts` |
| Tablas de la base de datos | `electron/db/schema.sql` |
| Migraciones de bases de datos antiguas | `electron/db/connection.ts` |

Si cambias el esquema de la base de datos, recuerda que `CREATE TABLE IF NOT EXISTS` no agrega columnas a tablas que ya existen: añade la migración correspondiente en `connection.ts`, que se ejecuta en cada arranque.

## Datos y ubicaciones en disco

| Qué | Dónde |
| --- | --- |
| Base de datos (historial, folios, configuración) | `%APPDATA%\sistema-constancias\constancias.db` |
| Imágenes de sellos cargados | `%APPDATA%\sistema-constancias\sellos\` (la aplicación guarda ahí una copia de cada imagen elegida) |
| PDF generados | En la carpeta que elige el usuario al generar: `<carpeta elegida>\<folio>_<nombre del evento>\PDFs\<rol>.pdf` |
| Archivo temporal de impresión | Carpeta temporal del sistema; se borra al terminar cada impresión |

El Excel original **no** se copia ni se modifica.

**Respaldo:** con el programa cerrado, copiar `constancias.db` y la carpeta `sellos`. Para restaurar en otro equipo, copiarlos a la misma ruta antes de abrir el programa.

## Pruebas

```bash
npm test
```

Hay pruebas unitarias con Vitest junto al código que prueban (`*.test.ts`) para: normalización de nombres, procesamiento y validación de filas, generación de folios, cálculo de encabezados, guardado de lotes, autoajuste, plantilla del documento, recursos y generación de PDF.

Corre las pruebas antes de entregar cualquier cambio en `electron/business` o `electron/pdf`.

## Problemas frecuentes de desarrollo

- **Error de versión de módulo nativo** (`NODE_MODULE_VERSION`, `better_sqlite3.node`): el módulo se compiló para otra versión de Node/Electron. Ejecuta `npx electron-builder install-app-deps` para recompilarlo para Electron.
- **`npm install` falla al compilar `better-sqlite3`:** instala las *Visual Studio Build Tools* con la carga de trabajo de C++ y Python, y vuelve a intentarlo.
- **La ventana de desarrollo no abre o queda en blanco:** cierra procesos de Electron anteriores y vuelve a ejecutar `npm run dev`.
- **El PDF no refleja un cambio de sello o de firmantes:** esos cambios solo afectan a los PDF nuevos. Para los eventos anteriores usa **Reimprimir lote guardado**.
- **Un cambio de esquema no se ve en una base ya creada:** falta la migración en `electron/db/connection.ts` (ver arriba).

## Notas de entrega y pendientes

- **Documentos de diseño desactualizados.** El *Documento de diseño técnico* y los *Requerimientos* incluidos en el proyecto no reflejan por completo el programa actual. Por ejemplo, el QR ya no existe, y el sistema no deja avanzar mientras haya filas con error (no las omite). Ante cualquier diferencia, **manda el código**; el *Manual de usuario* sí está al día.
- **Archivo `constancias.db` en la raíz del proyecto.** Está vacío (0 bytes) y no lo usa el programa, que guarda su base en la carpeta de datos del usuario. Puede eliminarse. Si alguna vez contiene datos reales, no debe entregarse ni subirse a un repositorio: `.gitignore` no lo excluye.
- **Configuración del instalador.** Revisa la sección `build` de `package.json` y [Generar el instalador para Windows](#generar-el-instalador-para-windows).
- **Sello con fondo opaco.** En el pie de las constancias regulares, la imagen del sello se dibuja encima de la frase institucional y la fecha, sin `z-index`. Con un sello de fondo transparente se ve bien, pero algunos visores de PDF o imágenes con fondo opaco pueden ocultar ese texto. Si ocurre, agrega `z-index` al texto en `plantillaDocumento.ts`, o usa un PNG con fondo transparente.
- **Acentos en los nombres.** La normalización de nombres puede quitar los acentos. Si la Facultad los requiere, hay que revisarlos y corregirlos en la pantalla de Validación, o ajustar `normalizarNombre.ts`.
- **Sin firma digital del instalador.** El instalador no está firmado, por lo que Windows puede mostrar una advertencia de SmartScreen la primera vez.

## Documentación

| Documento | Para quién | Contenido |
| --- | --- | --- |
| Manual de usuario | Quien opera el programa | Uso completo, preparación del Excel, catálogos de textos, solución de problemas. |
| Guía rápida | Personas con poco conocimiento de computadoras | Pasos mínimos para generar constancias y reconocimientos. |
| Requerimientos del sistema | Desarrollo | Alcance original del proyecto (parcialmente desactualizado). |
| Documento de diseño técnico | Desarrollo | Arquitectura y decisiones de diseño (parcialmente desactualizado). |

## Licencias y créditos

- Proyecto de uso interno de la Facultad de Ciencias de la Computación, BUAP. No se publica bajo una licencia de código abierto.
- Tipografía **Source Sans 3**, distribuida bajo su propia licencia (consulta `resources/fonts/LICENSE-SourceSans3.txt`).
- El logo institucional y los sellos pertenecen a la Benemérita Universidad Autónoma de Puebla.
