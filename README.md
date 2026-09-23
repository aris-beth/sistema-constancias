# Sistema de Constancias — FCC BUAP

## Requisitos previos
- Node.js LTS instalado (incluye npm). Verifica con `node -v` y `npm -v`.

## Cómo levantar el proyecto por primera vez

1. Descomprime este proyecto en una carpeta, por ejemplo `sistema-constancias/`.
2. Abre una terminal DENTRO de esa carpeta.
3. Instala las dependencias (descarga todas las librerías necesarias):
   ```
   npm install
   ```
   Esto puede tardar uno o dos minutos la primera vez. Se creará una carpeta
   `node_modules/` (no la edites ni la subas a git).
4. Levanta el proyecto en modo desarrollo:
   ```
   npm run dev
   ```
5. Debería abrirse una ventana de escritorio con el título
   "Sistema de Constancias — FCC BUAP". Si la ves, el esqueleto base
   (Electron + React + TypeScript) está funcionando correctamente.

Para detener la app, cierra la ventana o presiona `Ctrl + C` en la terminal.

## Siguiente paso
Una vez que confirmes que esto funciona en tu máquina, seguimos con:
- El esquema de la base de datos SQLite (tablas de evento, participante, rol, constancia).
- El lector de Excel (SheetJS).
- El motor de reglas de redacción y el normalizador de nombres.
