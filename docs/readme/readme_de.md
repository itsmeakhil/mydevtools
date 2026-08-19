<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="MyDevTools Logo" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>Die Offline-Workstation für Entwickler</strong>
</p>

<p align="center">
  80+ Entwickler-Tools, ein API-Client, SQL- / MongoDB- / Redis-Clients, Verschlüsselung<br />
  und Produktivitäts-Helfer — alles läuft lokal auf deinem Rechner.
</p>

<p align="center">
  <strong>Kostenlos · Open Source · Offline · Kein Account · Keine Werbung</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="Neuestes Release" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="Downloads" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="Lizenz AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="GitHub-Stars" /></a>
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
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ Download</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 Website</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 Doku</strong></a> •
  <a href="../../CHANGELOG.md">📋 Changelog</a> •
  <a href="../../ROADMAP.md">🗺️ Roadmap</a> •
  <a href="../../CONTRIBUTING.md">🤝 Mitmachen</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 Diskussionen</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="MyDevTools Desktop-App — Dashboard (dunkel)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="MyDevTools Desktop-App — Dashboard (hell)" width="900" />
</p>
-->

> Dies ist eine Übersetzung des [englischen README](../../README.md), das die
> maßgebliche Fassung ist und aktueller sein kann. Korrekturen sind willkommen — siehe
> [Übersetzungen](../../CONTRIBUTING.md#translations).

---

## Was ist MyDevTools?

MyDevTools ist eine **Desktop-Anwendung**, die den Stapel aus Tabs, Wegwerf-Websites
und Ein-Zweck-Apps ersetzt, den man als Entwickler jeden Tag öffnet. Formatierer,
Konverter, Generatoren, Krypto-Werkzeuge, ein API-Client, SQL- / MongoDB- /
Redis-Clients, Notizen, Snippets und ein Tresor für Zugangsdaten — eine App, ein
Suchfeld, ein Tastenkürzel.

Alles läuft auf deinem Rechner. Es gibt keinen MyDevTools-Server, keinen Account und keine Synchronisierung.

| Der übliche Aufbau | MyDevTools |
|---|---|
| Ein Dutzend Tabs mit Ein-Zweck-Tool-Websites | Eine Desktop-App, `⌘K` bringt dich überallhin |
| Tools, die deine Daten zum Formatieren auf einen Server laden | Die Verarbeitung passiert auf deinem Rechner |
| Registrierungshürden und Lizenzschlüssel | Kein Account, kein Login, keine Aktivierung |
| Getrennte Apps für SQL, MongoDB und Redis | SQL + MongoDB + Redis + S3 an einem Ort |
| Bezahltarife für einfache Werkzeuge | Kostenlos — jedes Tool, jede Funktion |
| Closed-Source-Werkzeuge, die du nicht prüfen kannst | AGPL-3.0, die komplette App liegt in diesem Repo |

---

## 📦 Installation

| Plattform | Wie |
|---|---|
| **macOS** (Apple Silicon + Intel) | [Neuestes `.dmg` herunterladen](https://github.com/mydevtools-tech/mydevtools/releases/latest) — Universal Build, signiert und notarisiert, aktualisiert sich in der App |
| **Windows / Linux** | Noch nicht veröffentlicht. Die Tauri-Shell baut auf beiden — siehe [Aus dem Quellcode bauen](../../README.md#%EF%B8%8F-building-from-source) und die [Roadmap](../../ROADMAP.md). Tests auf diesen Plattformen sind ein hervorragender erster Beitrag |

Öffnen und loslegen: keine Registrierung, keine Konfiguration, keine API-Schlüssel.

---

## 🧰 Tools

80+ Tools, gruppiert wie in der Seitenleiste. Die vollständige Liste mit
Beschreibungen steht im [englischen README](../../README.md#-tools).

| Kategorie | Beispiele |
|---|---|
| 📝 **Formatierer & Validatoren** | JSON-Formatierer, JSON Visualizer, JSON-Diff, JSON-Schema-Generator, JSON to Code, YAML-Formatierer, Format-Konverter (JSON / YAML / TOML / XML), SQL-Formatierer, GraphQL-Formatierer, Markdown-Vorschau, Textvergleich, Regex-Tester |
| 🌐 **Netzwerk & API** | API-Client (Collections, Umgebungen, Auth, gRPC, Mock-Server — ohne CORS-Grenzen des Browsers), cURL to Code, Webhook-Tester, WebSocket-Tester, DNS-Abfrage, Whois-Abfrage, IP-/Subnetz-Rechner, HTTP-Statuscodes, User-Agent Parser |
| 🗄️ **Datenbank- & Storage-Clients** | SQL Client (PostgreSQL, MySQL, MariaDB), Datenbank-Explorer (MongoDB), Redis Commander, S3 Drive (AWS S3, DigitalOcean Spaces) — native Rust-Treiber, direkt von deinem Rechner zu deiner Datenbank |
| 🔐 **Sicherheit & Krypto** | Passwort-Manager, Verschlüsselungs-Spielplatz (AES-GCM), JWT-Decoder, Hash-Generator, HMAC-Generator, Bcrypt, TOTP / 2FA-Code, SSH / RSA-Schlüsselgenerator, Zertifikat- / PEM-Decoder, Umgebungs-Manager, Geheimnis / API-Schlüssel |
| 🔄 **Konverter** | Base64-Kodierung, Bild zu Base64, URL-Kodierung / URL-Parser, Escape / Encode, String Case Converter, String Inspector, Line Sort & Dedupe, CSV / Excel ↔ JSON, Basiskonverter, Zeitstempel- / Zeitzonen-Konverter, Einheitenrechner, Chmod-Rechner, LLM-Token-Zähler |
| ⚙️ **Generatoren** | UUID / ULID, Mock-Datengenerator, Cron-Editor, Docker-Compose-Generator, .gitignore-Generator, QR-Code-Generator, Markdown-Tabelle, Lorem Ipsum |
| 🎨 **Medien & Design** | Farbauswahl, Kontrastprüfung, CSS-Verlaufsgenerator, CSS-Generatoren, Bildkomprimierung, SVG-Optimierer, EXIF-Viewer & -Entferner, Favicon-Generator, Code-Screenshot, Keycode-Inspektor |
| 📱 **Produktivität** | Notizen, Code-Snippets, Aufgaben, Lesezeichen, API Keys, Pausenraum (2048, Sudoku, Snake, Minesweeper, Tetris) |

Alles ist über eine einzige Befehlspalette durchsuchbar, im hellen oder dunklen
Modus, in 27 Sprachen.

---

## 🔒 Datenschutz by Design

- **Kein MyDevTools-Server.** Kein Backend, bei dem du dich anmeldest, kein
  Sync-Dienst, kein Account-System. Tool-Eingaben, Notizen, Snippets, Aufgaben und
  Lesezeichen landen in einer lokalen SQLCipher-Datenbank, verschlüsselt mit einem
  Schlüssel aus dem Schlüsselbund des Betriebssystems.
- **Zugangsdaten liegen im verschlüsselten Tresor.** Datenbank-Passwörter,
  API-Schlüssel und Einträge im Passwort-Manager werden lokal mit einem
  Master-Passwort verschlüsselt, das nur du kennst.
- **Du entscheidest über jede ausgehende Verbindung.** Die App selbst braucht kein
  Netzwerk, aber manche Tools sind dafür da, mit *deinen* Zielen zu sprechen: Der
  API-Client schickt die Requests, die du schreibst, die Datenbank-Clients verbinden
  sich mit den Hosts, die du konfigurierst, DNS- / WHOIS-Abfragen gehen an öffentliche
  Register, und der Updater prüft GitHub-Releases. Sonst verlässt nichts den Rechner.
- **Optionale, anonyme Nutzungsstatistik.** Aus, solange du sie nicht einschaltest.
  Eingeschaltet werden zwei Events (`app_started`, `tool_opened`) mit einer rotierenden
  Session-ID, der App-Version und der Sprache gesendet. Keine Geräte-ID, keine Pfade,
  nichts, was du in ein Tool tippst.
- **Nachprüfbar.** AGPL-3.0. Alles oben Behauptete steht in diesem Repo — lies es nach.

---

## 🏗️ Architektur

Eine Next.js 16 / React 19-Oberfläche (`apps/desktop-ui`) in einer Tauri v2-Shell
(`apps/desktop`, Rust). Gespeichert wird in SQLCipher mit einem Schlüssel aus dem
Schlüsselbund des Betriebssystems; Datenbanktreiber, HTTP / gRPC und der Mock-Server
sind natives Rust. Die Website (`apps/web`) ist reines Marketing — die Tools laufen
dort nicht.
Details: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 🛠️ Aus dem Quellcode bauen

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Benötigt Node.js ≥ 22, pnpm ≥ 9 und stabiles Rust. Kein Konfigurationsschritt — keine
API-Schlüssel, keine Accounts, keine Dienste.

---

## Wo MyDevTools aufhört

- **Nur macOS** bei den heute veröffentlichten Builds.
- **Die Datenbank-Clients sind für die tägliche Arbeit gedacht**, kein Ersatz für eine
  vollständige DBA-Suite — kein visueller Schema-Designer, keine Migrations-Werkzeuge.
- **Keine Team-Funktionen.** Keine geteilten Workspaces, keine Synchronisierung, keine Zusammenarbeit.
- **Manche Tools brauchen naturgemäß das Netzwerk** — DNS, WHOIS, Webhooks,
  API-Requests, Datenbankverbindungen.

---

## 🤝 Mitmachen

Beiträge sind willkommen — Bugfixes, neue Tools, UI-Feinschliff, Übersetzungen und
Doku zählen alle. Fang mit [CONTRIBUTING.md](../../CONTRIBUTING.md) an; Issues mit dem
Label [`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
sind auf Einsteiger zugeschnitten.

Diese Übersetzung oder eine Sprachdatei in `apps/desktop-ui/messages/` zu verbessern,
braucht weder Rust noch einen Build.

| | |
|---|---|
| 🐛 Bug melden · ✨ Feature vorschlagen | [Issue-Vorlagen](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 Frage stellen | [Diskussionen](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 Sicherheitslücke melden | [SECURITY.md](../../SECURITY.md) — privat, niemals als öffentliches Issue |
| 🗺️ Sehen, was geplant ist | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 Community-Regeln | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ Projekt unterstützen

MyDevTools ist kostenlos, hat keinen Bezahltarif und wird nie einen haben. Wenn es dir
Zeit spart: gib dem Repository einen Stern, [sponsore auf GitHub](https://github.com/sponsors/itsmeakhil)
oder erzähl es jemandem im Team.

---

## 📄 Lizenz

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — siehe [LICENSE](../../LICENSE).

<p align="center">
  Mit ❤️ gebaut von <a href="https://github.com/itsmeakhil">Akhil</a> und <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">Mitwirkenden</a>
</p>
