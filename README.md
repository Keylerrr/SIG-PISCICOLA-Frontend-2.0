# SIG-Piscicola (Póngase Trucha)

## Propósito del Proyecto

SIG-Piscicola (Sistema de Información Gerencial Piscícola) es una plataforma desarrollada para el proyecto Póngase Trucha. Su objetivo principal es proporcionar herramientas de gestión, monitoreo y visualización de información para la industria piscícola, facilitando el control y manejo eficiente de granjas, estanques, ciclos productivos, alimentación y recursos asociados a la producción de truchas.

---

## Tecnologías Utilizadas

- Next.js 16
- React 19
- TailwindCSS 4
- PNPM
- Docker
- ESLint

---

## Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- Node.js 20 o superior
- PNPM
- Docker (opcional)

---

## Instalación de PNPM

### Linux

#### Arch Linux / CachyOS / Manjaro

```bash
sudo pacman -S pnpm
```

#### Debian / Ubuntu

Primero instala Node.js y npm:

```bash
sudo apt update
sudo apt install nodejs npm
```

Luego instala pnpm globalmente:

```bash
sudo npm install -g pnpm
```

#### Fedora

```bash
sudo dnf install pnpm
```

### Windows

**Opción recomendada (winget):**

```powershell
winget install pnpm.pnpm
```

**Alternativa usando npm:**

Primero instala Node.js desde https://nodejs.org/, luego ejecuta:

```powershell
npm install -g pnpm
```

**Alternativa usando PowerShell Script:**

```powershell
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
```

### Verificar instalación

```bash
pnpm --version
```

---

## Migración desde NPM (IMPORTANTE)

Este proyecto fue migrado de `npm` a `pnpm`. Antes de instalar dependencias, todos los integrantes del equipo deben eliminar los archivos y carpetas generados por npm.

**Linux / macOS:**

```bash
rm -rf node_modules package-lock.json
```

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
```

Si aparece un archivo `package-lock.json` en cualquier momento, debe eliminarse.

---

## Cómo Ejecutar el Proyecto

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd SIG-Piscicola
```

### 2. Instalar dependencias

Este proyecto utiliza `pnpm` como gestor de paquetes. Para garantizar versiones exactas y evitar modificaciones accidentales del lockfile, utiliza:

```bash
pnpm install --frozen-lockfile
```

No utilices `npm install`.

### 3. Ejecutar el entorno de desarrollo

```bash
pnpm dev
```

### 4. Acceder a la aplicación

```
http://localhost:3000
```

---

## Scripts Disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Ejecutar en modo desarrollo |
| `pnpm build` | Generar build de producción |
| `pnpm start` | Ejecutar build de producción |
| `pnpm lint` | Ejecutar linter |

---

## Ejecución con Docker

**Construir la imagen:**

```bash
docker build -t sig-piscicola .
```

**Ejecutar el contenedor:**

```bash
docker run -p 3000:3000 sig-piscicola
```

La aplicación estará disponible en `http://localhost:3000`.

---

## Reglas del Proyecto

**Comandos permitidos:**

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm start
```

**Comandos NO permitidos:**

```bash
npm install
npm ci
npm run dev
```

Estos comandos pueden modificar dependencias y generar inconsistencias entre entornos de desarrollo.

---

## Instalación de nuevas dependencias

Para agregar dependencias al proyecto, usa siempre `pnpm`:

```bash
# Dependencia de producción
pnpm add <paquete>

# Dependencia de desarrollo
pnpm add -D <paquete>
```

---

## Estructura General del Proyecto

```
SIG-Piscicola/
├── src/
├── public/
├── package.json
├── pnpm-lock.yaml
├── next.config.mjs
├── postcss.config.mjs
├── Dockerfile
└── README.md
```

El proyecto utiliza `pnpm-lock.yaml` para asegurar instalaciones consistentes entre todos los miembros del equipo. El directorio `node_modules/` no debe subirse al repositorio.

---

Proyecto desarrollado para el sistema académico y de gestión piscícola Póngase Trucha.
