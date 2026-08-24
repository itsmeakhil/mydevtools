<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="Logo de MyDevTools" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>La estación de trabajo offline para desarrolladores</strong>
</p>

<p align="center">
  Más de 80 herramientas para desarrolladores, un cliente de API, clientes SQL / MongoDB / Redis, cifrado<br />
  y utilidades de productividad, todo ejecutándose localmente en tu máquina.
</p>

<p align="center">
  <strong>Gratis · Código abierto · Offline · Sin cuenta · Sin anuncios</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="Última versión" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="Descargas" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="Licencia AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="Estrellas en GitHub" /></a>
</p>

<p align="center">
  <a href="../../README.md">English</a>
  | <a href="readme_zh.md">简体中文</a>
  | <a href="readme_ja.md">日本語</a>
  | <a href="readme_ko.md">한국어</a>
  | <a href="readme_es.md">Español</a>
  | <a href="readme_pt-BR.md">Português (BR)</a>
  | <a href="readme_de.md">Deutsch</a>
  | <a href="readme_fr.md">Français</a>
  | <a href="readme_hi.md">हिन्दी</a>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ Descargar</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 Sitio web</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 Documentación</strong></a> •
  <a href="../../CHANGELOG.md">📋 Registro de cambios</a> •
  <a href="../../ROADMAP.md">🗺️ Hoja de ruta</a> •
  <a href="../../CONTRIBUTING.md">🤝 Contribuir</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 Discusiones</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="Aplicación de escritorio MyDevTools — tablero (oscuro)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="Aplicación de escritorio MyDevTools — tablero (claro)" width="900" />
</p>
-->

> Esta es una traducción del [README en inglés](../../README.md), que es la
> versión canónica y puede estar más actualizada. Se agradecen las correcciones:
> consulta [Traducciones](../../CONTRIBUTING.md#translations).

---

## ¿Qué es MyDevTools?

MyDevTools es una **aplicación de escritorio** que reemplaza la pila de pestañas,
sitios sueltos y apps de un solo uso que un desarrollador abre cada día.
Formateadores, conversores, generadores, utilidades de criptografía, un cliente de
API, clientes SQL / MongoDB / Redis, notas, fragmentos de código y una bóveda de
credenciales: una sola app, un solo buscador, un solo atajo de teclado.

Se ejecuta en tu máquina. No hay servidor de MyDevTools, ni cuenta, ni sincronización.

| El montaje habitual | MyDevTools |
|---|---|
| Una docena de pestañas con sitios de herramientas de un solo uso | Una app de escritorio, `⌘K` para saltar a donde sea |
| Herramientas que suben tus datos a un servidor para formatearlos | El procesamiento ocurre en tu máquina |
| Muros de registro y claves de licencia | Sin cuenta, sin inicio de sesión, sin activación |
| Apps separadas para SQL, MongoDB y Redis | SQL + MongoDB + Redis + S3 en un solo lugar |
| Planes de pago para utilidades básicas | Gratis: todas las herramientas, todas las funciones |
| Herramientas de código cerrado que no puedes auditar | AGPL-3.0, toda la app está en este repositorio |

---

## 📦 Instalación

| Plataforma | Cómo |
|---|---|
| **macOS** (Apple Silicon + Intel) | [Descarga el `.dmg` más reciente](https://github.com/mydevtools-tech/mydevtools/releases/latest): compilación universal, firmada y notarizada, se actualiza sola desde la app |
| **Linux** (x86_64) | [Descarga el `.deb`](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-amd64.deb) (Debian / Ubuntu 22.04+) o el [AppImage](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-x86_64.AppImage) (funciona en cualquier distro, sin instalar): misma versión y mismo lanzamiento que macOS. Aún sin actualización automática en la app; consulta la [guía de instalación en Linux](https://mydevtools.tech/linux-builds) |
| **Windows** | Sin compilación por ahora. El contenedor Tauri compila en Windows: consulta [Compilar desde el código fuente](../../README.md#%EF%B8%8F-building-from-source) y la [hoja de ruta](../../ROADMAP.md) |

Ábrela y ponte a trabajar: sin registro, sin configuración, sin claves de API.

---

## 🧰 Herramientas

Más de 80 herramientas, agrupadas como las agrupa la barra lateral. La lista
completa con descripciones está en el [README en inglés](../../README.md#-tools).

| Categoría | Ejemplos |
|---|---|
| 📝 **Formateadores y validadores** | Formateador JSON, JSON Visualizer, Diff JSON, Generador de esquema JSON, JSON to Code, Formateador YAML, Conversor de formatos (JSON / YAML / TOML / XML), Formateador SQL, Formateador GraphQL, Vista previa Markdown, Comparador de diferencias, Probador de expresiones regulares |
| 🌐 **Red y API** | Cliente API (colecciones, entornos, autenticación, gRPC, servidor mock, sin límites de CORS del navegador), cURL to Code, Probador de webhooks, Probador de WebSocket, Búsqueda DNS, Consulta Whois, Calculadora IP / subred, Códigos de estado HTTP, User-Agent Parser |
| 🗄️ **Clientes de bases de datos y almacenamiento** | SQL Client (PostgreSQL, MySQL, MariaDB), Explorador de bases de datos (MongoDB), Redis Commander, S3 Drive (AWS S3, DigitalOcean Spaces): drivers nativos en Rust, directo de tu máquina a tu base de datos |
| 🔐 **Seguridad y criptografía** | Gestor de contraseñas, Cifrado (prácticas, AES-GCM), Decodificador JWT, Generador de hash, Generador HMAC, Bcrypt, Código TOTP / 2FA, Generador de claves SSH / RSA, Decodificador de certificados / PEM, Gestor de entornos, Secreto / clave API |
| 🔄 **Conversores** | Base64, Imagen a Base64, Codificador / analizador de URL, Escape / Encode, String Case Converter, String Inspector, Line Sort & Dedupe, CSV / Excel ↔ JSON, Conversor de base, Conversor de marcas de tiempo / zonas horarias, Convertidor de unidades, Calculadora Chmod, Contador de tokens LLM |
| ⚙️ **Generadores** | UUID / ULID, Generador de datos de prueba, Constructor Cron, Generador Docker Compose, Generador .gitignore, Generador de códigos QR, Tabla Markdown, Lorem Ipsum |
| 🎨 **Medios y diseño** | Selector de color, Comprobador de contraste, Generador de degradado CSS, Generadores CSS, Compresor de imágenes, Optimizador SVG, Visor EXIF y eliminador, Generador de favicon, Captura de código, Inspector de keycode |
| 📱 **Productividad** | Notas, Fragmentos de código, Tareas, Marcadores, Claves API, Sala de descanso (2048, Sudoku, Snake, Buscaminas, Tetris) |

Todo se busca desde una única paleta de comandos, en modo oscuro o claro, en 27
idiomas.

---

## 🔒 Privacidad por diseño

- **Sin servidor de MyDevTools.** No hay backend al que iniciar sesión, ni servicio
  de sincronización, ni sistema de cuentas. Lo que escribes en las herramientas,
  las notas, los fragmentos, las tareas y los marcadores se guardan en una base de
  datos SQLCipher local, cifrada con una clave almacenada en el llavero del sistema.
- **Las credenciales se cifran en la bóveda.** Las contraseñas de bases de datos,
  las claves de API y las entradas del gestor de contraseñas se cifran localmente
  con una contraseña maestra que solo tú conoces.
- **Tú decides cada conexión saliente.** La app en sí no necesita red, pero algunas
  herramientas existen para hablar con *tus* destinos: el cliente de API envía las
  peticiones que escribes, los clientes de bases de datos se conectan a los hosts
  que configuras, las consultas DNS / WHOIS interrogan registros públicos y el
  actualizador consulta las releases de GitHub. Nada más sale.
- **Estadísticas de uso opcionales y anónimas.** Desactivadas salvo que las
  actives. Cuando están activas se envían dos eventos (`app_started`,
  `tool_opened`) con un id de sesión rotativo, la versión de la app y el idioma.
  Sin id de dispositivo, sin rutas, sin nada de lo que escribas en una herramienta.
- **Auditable.** AGPL-3.0. Todo lo anterior está en este repositorio: compruébalo.

---

## 🏗️ Arquitectura

Una interfaz Next.js 16 / React 19 (`apps/desktop-ui`) dentro de un contenedor
Tauri v2 (`apps/desktop`, Rust). El almacenamiento es SQLCipher con clave del
llavero del sistema; los drivers de bases de datos, HTTP / gRPC y el servidor mock
son nativos en Rust. El sitio web (`apps/web`) es solo marketing: las herramientas
no se ejecutan ahí.
Detalles: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 🛠️ Compilar desde el código fuente

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Requiere Node.js ≥ 22, pnpm ≥ 9 y Rust estable. Sin paso de configuración: sin
claves de API, sin cuentas, sin servicios.

---

## Hasta dónde llega MyDevTools

- **Solo macOS** en las compilaciones publicadas hoy.
- **Los clientes de bases de datos son para el trabajo del día a día**, no un
  reemplazo de una suite completa de DBA: sin diseñador visual de esquemas, sin
  herramientas de migración.
- **Sin funciones de equipo.** Sin espacios de trabajo compartidos, sin
  sincronización, sin colaboración.
- **Algunas herramientas necesitan la red por definición**: DNS, WHOIS, webhooks,
  peticiones de API, conexiones a bases de datos.

---

## 🤝 Contribuir

Las contribuciones son bienvenidas: correcciones de errores, herramientas nuevas,
mejoras de UI, traducciones y documentación cuentan todas. Empieza por
[CONTRIBUTING.md](../../CONTRIBUTING.md); los issues con la etiqueta [`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
están acotados para quienes empiezan.

Mejorar esta traducción, o un archivo de idioma en `apps/desktop-ui/messages/`,
no requiere Rust ni compilar nada.

| | |
|---|---|
| 🐛 Reportar un error · ✨ Pedir una función | [Plantillas de issues](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 Hacer una pregunta | [Discusiones](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 Reportar una vulnerabilidad | [SECURITY.md](../../SECURITY.md), en privado, nunca en un issue público |
| 🗺️ Ver qué está planeado | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 Normas de la comunidad | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ Apoya el proyecto

MyDevTools es gratis, no tiene plan de pago y nunca lo tendrá. Si te ahorra
tiempo, dale una estrella al repositorio, [patrocina en GitHub](https://github.com/sponsors/itsmeakhil)
o cuéntaselo a alguien de tu equipo.

---

## 📄 Licencia

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html), consulta [LICENSE](../../LICENSE).

<p align="center">
  Hecho con ❤️ por <a href="https://github.com/itsmeakhil">Akhil</a> y <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">colaboradores</a>
</p>
