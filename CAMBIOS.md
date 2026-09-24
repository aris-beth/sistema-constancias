# Cambios: generación de PDFs, previsualización y plantilla

## Causas corregidas
- Paso 4 (`App.tsx`) era un placeholder: ahora usa `PantallaGenerar`, guarda el lote (`guardarLote` / `guardarGraduacion`) y genera los PDFs en la carpeta elegida.
- Previsualización: llamaba a un canal inexistente (`window.electronAPI.invoke`) y siempre mostraba un mockup. Ahora usa `previsualizarDocumento` (IPC `pdf:previsualizar`), que dibuja el mismo HTML que el PDF final.
- PDF: nueva plantilla (`electron/pdf/plantillaDocumento.ts`) basada en la imagen de la plantilla de graduación; fuentes e imágenes incrustadas; HTML temporal + `loadFile` en lugar de URL `data:`.

## Archivos
Nuevos: `electron/pdf/plantillaDocumento.ts`, `electron/pdf/recursos.ts`, `electron/business/calcularEncabezados.ts`, `src/utils/registros.ts`, `resources/` (fuente Source Sans + `logo-buap.png`), tests nuevos.
Modificados: `electron/pdf/generarPdf.ts`, `electron/ipc/pdf.handlers.ts`, `electron/preload.ts`, `shared/types/ipc.ts`, `src/App.tsx`, `src/pantallas/PantallaGenerar.tsx`, `src/pantallas/PantallaPrevisualizacion.tsx`, `src/types/electron-api.d.ts`.
Eliminado: `electron/pdf/generarPdf.test.ts` (reemplazado por `plantillaDocumento.test.ts`).

## Pendiente
- Reemplazar `resources/logo-buap.png` (recortado de la plantilla) por el SVG oficial: `resources/logo-buap.svg` tiene prioridad.
- Confirmar el diseño de la constancia regular (posición de QR, firma y sello es un supuesto).
