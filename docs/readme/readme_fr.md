<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="Logo MyDevTools" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>Le poste de travail développeur hors ligne</strong>
</p>

<p align="center">
  Plus de 80 outils pour développeurs, un client API, des clients SQL / MongoDB / Redis, du chiffrement<br />
  et des utilitaires de productivité — le tout exécuté localement sur votre machine.
</p>

<p align="center">
  <strong>Gratuit · Open source · Hors ligne · Sans compte · Sans publicité</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="Dernière version" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="Téléchargements" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="Licence AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="Étoiles GitHub" /></a>
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
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ Télécharger</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 Site web</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 Documentation</strong></a> •
  <a href="../../CHANGELOG.md">📋 Journal des modifications</a> •
  <a href="../../ROADMAP.md">🗺️ Feuille de route</a> •
  <a href="../../CONTRIBUTING.md">🤝 Contribuer</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 Discussions</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="Application de bureau MyDevTools — tableau de bord (sombre)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="Application de bureau MyDevTools — tableau de bord (clair)" width="900" />
</p>
-->

> Ceci est une traduction du [README anglais](../../README.md), qui fait foi et
> peut être plus à jour. Les corrections sont les bienvenues — voir
> [Translations](../../CONTRIBUTING.md#translations).

---

## Qu’est-ce que MyDevTools ?

MyDevTools est une **application de bureau** qui remplace la pile d’onglets, de
sites ponctuels et d’applications mono-usage qu’un développeur ouvre chaque jour.
Formateurs, convertisseurs, générateurs, utilitaires de chiffrement, un client
API, des clients SQL / MongoDB / Redis, des notes, des extraits de code et un
coffre-fort d’identifiants — une seule application, un seul champ de recherche,
un seul raccourci clavier.

Tout s’exécute sur votre machine. Il n’y a aucun serveur MyDevTools, aucun compte
et aucune synchronisation.

| L’installation habituelle | MyDevTools |
|---|---|
| Une douzaine d’onglets de sites d’outils mono-usage | Une application de bureau, `⌘K` pour aller n’importe où |
| Des outils qui envoient vos données à un serveur pour les formater | Le traitement se fait sur votre machine |
| Inscriptions obligatoires et clés de licence | Aucun compte, aucune connexion, aucune activation |
| Des applications distinctes pour SQL, MongoDB et Redis | SQL + MongoDB + Redis + S3 au même endroit |
| Des offres payantes pour des utilitaires de base | Gratuit — tous les outils, toutes les fonctionnalités |
| Des outils propriétaires que vous ne pouvez pas auditer | AGPL-3.0, toute l’application est dans ce dépôt |

---

## 📦 Installation

| Plateforme | Comment |
|---|---|
| **macOS** (Apple Silicon + Intel) | [Télécharger le dernier `.dmg`](https://github.com/mydevtools-tech/mydevtools/releases/latest) — build universel, signé et notarisé, se met à jour depuis l’application |
| **Linux** (x86_64) | [Téléchargez le `.deb`](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-amd64.deb) (Debian / Ubuntu 22.04+) ou l'[AppImage](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-x86_64.AppImage) (fonctionne partout, sans installation) — même release et même version que macOS. Pas encore de mise à jour intégrée ; voir le [guide d'installation Linux](https://mydevtools.tech/linux-builds) |
| **Windows** | Pas de build pour le moment. Le shell Tauri se compile sous Windows — voir [Compiler depuis les sources](../../README.md#%EF%B8%8F-building-from-source) et la [feuille de route](../../ROADMAP.md) |

Ouvrez-la et travaillez : aucune inscription, aucune configuration, aucune clé API.

---

## 🧰 Outils

Plus de 80 outils, regroupés comme dans la barre latérale. La liste complète avec
les descriptions se trouve dans le [README anglais](../../README.md#-tools).

| Catégorie | Exemples |
|---|---|
| 📝 **Formateurs et validateurs** | Formateur JSON, JSON Visualizer, Diff JSON, Générateur de schéma JSON, JSON to Code, Formateur YAML, Convertisseur de formats (JSON / YAML / TOML / XML), Formateur SQL, Formateur GraphQL, Aperçu Markdown, Comparateur de différences, Testeur d’expressions régulières |
| 🌐 **Réseau et API** | Client API (collections, environnements, authentification, gRPC, serveur de mock — sans les limites CORS d’un navigateur), cURL to Code, Testeur de webhook, Testeur WebSocket, Recherche DNS, Recherche Whois, Calculateur IP / sous-réseau, Codes d’état HTTP, User-Agent Parser |
| 🗄️ **Clients bases de données et stockage** | SQL Client (PostgreSQL, MySQL, MariaDB), Explorateur de base de données (MongoDB), Redis Commander, S3 Drive (AWS S3, DigitalOcean Spaces) — pilotes Rust natifs, directement de votre machine à votre base de données |
| 🔐 **Sécurité et chiffrement** | Gestionnaire de mots de passe, Bac à sable chiffrement (AES-GCM), Décodeur JWT, Générateur de hash, Générateur HMAC, Bcrypt, Code TOTP / 2FA, Générateur de clés SSH / RSA, Décodeur de certificat / PEM, Gestionnaire d’environnement, Secret / clé API |
| 🔄 **Convertisseurs** | Base64, Image vers Base64, Encodeur / analyseur d’URL, Escape / Encode, String Case Converter, String Inspector, Line Sort & Dedupe, CSV / Excel ↔ JSON, Convertisseur de base, Convertisseur d’horodatage / de fuseaux, Convertisseur d’unités, Calculateur Chmod, Compteur de tokens LLM |
| ⚙️ **Générateurs** | UUID / ULID, Générateur de données fictives, Constructeur Cron, Générateur Docker Compose, Générateur .gitignore, Générateur de codes QR, Tableau Markdown, Lorem Ipsum |
| 🎨 **Médias et design** | Sélecteur de couleurs, Vérificateur de contraste, Générateur de dégradé CSS, Générateurs CSS, Compresseur d’images, Optimiseur SVG, Visionneuse et suppression EXIF, Générateur de favicon, Capture de code, Inspecteur de keycode |
| 📱 **Productivité** | Notes, Extraits de code, Tâches, Signets, Clés API, Salle de pause (2048, Sudoku, Snake, Minesweeper, Tetris) |

Tout est accessible depuis une seule palette de commandes, en thème sombre ou
clair, dans 27 langues.

---

## 🔒 Confidentialité par conception

- **Aucun serveur MyDevTools.** Aucun backend auquel se connecter, aucun service
  de synchronisation, aucun système de comptes. Les données saisies dans les
  outils, les notes, les extraits, les tâches et les signets sont écrits dans une
  base SQLCipher locale, chiffrée avec une clé conservée dans le trousseau du système.
- **Les identifiants sont chiffrés dans le coffre-fort.** Mots de passe de bases
  de données, clés API et entrées du gestionnaire de mots de passe sont chiffrés
  localement avec un mot de passe maître que vous seul connaissez.
- **Vous choisissez chaque connexion sortante.** L’application elle-même n’a
  besoin d’aucun réseau, mais certains outils existent pour parler à *vos*
  destinations : le client API envoie les requêtes que vous écrivez, les clients
  de bases de données se connectent aux hôtes que vous configurez, les recherches
  DNS / WHOIS interrogent les registres publics et le système de mise à jour
  consulte les releases GitHub. Rien d’autre ne sort.
- **Statistiques d’usage optionnelles et anonymes.** Désactivées tant que vous ne
  les activez pas. Une fois activées, deux événements (`app_started`,
  `tool_opened`) sont envoyés avec un identifiant de session tournant, la version
  de l’application et la langue. Aucun identifiant d’appareil, aucun chemin, rien
  de ce que vous saisissez dans un outil.
- **Auditable.** AGPL-3.0. Les affirmations ci-dessus sont dans ce dépôt — allez les lire.

---

## 🏗️ Architecture

Une interface Next.js 16 / React 19 (`apps/desktop-ui`) dans un shell Tauri v2
(`apps/desktop`, Rust). Le stockage repose sur SQLCipher, avec une clé issue du
trousseau du système ; les pilotes de bases de données, HTTP / gRPC et le serveur
de mock sont en Rust natif. Le site web (`apps/web`) sert uniquement à la
communication — les outils n’y fonctionnent pas.
Détails : [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 🛠️ Compiler depuis les sources

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Nécessite Node.js ≥ 22, pnpm ≥ 9 et Rust stable. Aucune étape de configuration —
aucune clé API, aucun compte, aucun service.

---

## Les limites de MyDevTools

- **macOS uniquement** pour les builds publiés aujourd’hui.
- **Les clients de bases de données sont faits pour le travail quotidien**, pas
  pour remplacer une suite DBA complète — pas de concepteur de schéma visuel, pas
  d’outillage de migration.
- **Aucune fonctionnalité d’équipe.** Pas d’espaces partagés, pas de
  synchronisation, pas de collaboration.
- **Certains outils ont besoin du réseau par définition** — DNS, WHOIS, webhooks,
  requêtes API, connexions aux bases de données.

---

## 🤝 Contribuer

Les contributions sont les bienvenues — corrections de bugs, nouveaux outils,
finitions de l’interface, traductions et documentation comptent toutes. Commencez
par [CONTRIBUTING.md](../../CONTRIBUTING.md) ; les tickets étiquetés [`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
sont calibrés pour les nouveaux venus.

Améliorer cette traduction, ou un fichier de langue dans
`apps/desktop-ui/messages/`, ne demande ni Rust ni compilation.

| | |
|---|---|
| 🐛 Signaler un bug · ✨ Proposer une fonctionnalité | [Modèles de tickets](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 Poser une question | [Discussions](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 Signaler une vulnérabilité | [SECURITY.md](../../SECURITY.md) — en privé, jamais dans un ticket public |
| 🗺️ Voir ce qui est prévu | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 Règles de la communauté | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ Soutenir le projet

MyDevTools est gratuit, n’a aucune offre payante et n’en aura jamais. Si
l’application vous fait gagner du temps, mettez une étoile au dépôt,
[devenez sponsor sur GitHub](https://github.com/sponsors/itsmeakhil)
ou parlez-en à un collègue.

---

## 📄 Licence

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — voir [LICENSE](../../LICENSE).

<p align="center">
  Fait avec ❤️ par <a href="https://github.com/itsmeakhil">Akhil</a> et les <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">contributeurs</a>
</p>
