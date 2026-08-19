<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="Logo do MyDevTools" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>A estação de trabalho offline do desenvolvedor</strong>
</p>

<p align="center">
  Mais de 80 ferramentas de desenvolvimento, um cliente de API, clientes SQL / MongoDB / Redis,<br />
  criptografia e utilitários de produtividade — tudo rodando localmente na sua máquina.
</p>

<p align="center">
  <strong>Grátis · Código aberto · Offline · Sem conta · Sem anúncios</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="Versão mais recente" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="Downloads" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="Licença AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="Estrelas no GitHub" /></a>
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
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ Baixar</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 Site</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 Documentação</strong></a> •
  <a href="../../CHANGELOG.md">📋 Changelog</a> •
  <a href="../../ROADMAP.md">🗺️ Roadmap</a> •
  <a href="../../CONTRIBUTING.md">🤝 Contribuir</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 Discussões</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="App desktop MyDevTools — painel (tema escuro)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="App desktop MyDevTools — painel (tema claro)" width="900" />
</p>
-->

> Esta é uma tradução do [README em inglês](../../README.md), que é a versão
> canônica e pode estar mais atualizada. Correções são bem-vindas — veja
> [Traduções](../../CONTRIBUTING.md#translations).

---

## O que é o MyDevTools?

O MyDevTools é um **aplicativo desktop** que substitui a pilha de abas, sites
avulsos e apps de propósito único que um desenvolvedor abre todo dia.
Formatadores, conversores, geradores, utilitários de criptografia, um cliente de
API, clientes SQL / MongoDB / Redis, notas, snippets e um cofre de credenciais —
um app, um campo de busca, um atalho de teclado.

Ele roda na sua máquina. Não existe servidor do MyDevTools, nem conta, nem sincronização.

| O setup de sempre | MyDevTools |
|---|---|
| Uma dúzia de abas de sites de ferramenta única | Um app desktop, `⌘K` para ir a qualquer lugar |
| Ferramentas que enviam seu payload a um servidor só para formatá-lo | O processamento acontece na sua máquina |
| Muros de cadastro e chaves de licença | Sem conta, sem login, sem ativação |
| Apps separados para SQL, MongoDB e Redis | SQL + MongoDB + Redis + S3 no mesmo lugar |
| Planos pagos para utilitários básicos | Grátis — todas as ferramentas, todos os recursos |
| Ferramentas de código fechado que você não pode auditar | AGPL-3.0, o app inteiro está neste repositório |

---

## 📦 Instalação

| Plataforma | Como |
|---|---|
| **macOS** (Apple Silicon + Intel) | [Baixe o `.dmg` mais recente](https://github.com/mydevtools-tech/mydevtools/releases/latest) — build universal, assinado e notarizado, com atualização dentro do próprio app |
| **Windows / Linux** | Ainda não publicados. O shell Tauri compila nos dois — veja [Compilar a partir do código-fonte](../../README.md#%EF%B8%8F-building-from-source) e o [roadmap](../../ROADMAP.md). Testar nessas plataformas é uma ótima primeira contribuição |

Abra e comece a trabalhar: sem cadastro, sem configuração, sem chaves de API.

---

## 🧰 Ferramentas

Mais de 80 ferramentas, agrupadas do mesmo jeito que a barra lateral agrupa. A
lista completa com descrições está no [README em inglês](../../README.md#-tools).

| Categoria | Exemplos |
|---|---|
| 📝 **Formatadores e validadores** | Formatador JSON, JSON Visualizer, Diff JSON, Gerador de esquema JSON, JSON to Code, Formatador YAML, Conversor de formatos (JSON / YAML / TOML / XML), SQL Formatter, Formatador GraphQL, Pré-visualização Markdown, Diff checker, Regex Tester |
| 🌐 **Rede e API** | Cliente API (coleções, ambientes, autenticação, gRPC, mock server — sem limites de CORS do navegador), cURL to Code, Testador de Webhook, Testador de WebSocket, Pesquisa DNS, Consulta Whois, Calculadora IP / sub-rede, Códigos de status HTTP, User-Agent Parser |
| 🗄️ **Clientes de banco de dados e armazenamento** | SQL Client (PostgreSQL, MySQL, MariaDB), Explorador de banco de dados (MongoDB), Redis Commander, S3 Drive (AWS S3, DigitalOcean Spaces) — drivers Rust nativos, direto da sua máquina para o seu banco |
| 🔐 **Segurança e criptografia** | Gerenciador de Senhas, Laboratório de criptografia (AES-GCM), Decodificador JWT, Gerador de hash, Gerador HMAC, Bcrypt, Código TOTP / 2FA, Gerador de chaves SSH / RSA, Decodificador de certificado / PEM, Gerenciador de ambientes, Segredo / chave de API |
| 🔄 **Conversores** | Base64, Imagem para Base64, URL Encoder / Analisador de URL, Escape / Encode, String Case Converter, String Inspector, Line Sort & Dedupe, CSV / Excel ↔ JSON, Conversor de base, Conversor de Timestamp / Fuso Horário, Conversor de Unidades, Calculadora Chmod, Contador de Tokens de LLM |
| ⚙️ **Geradores** | UUID / ULID, Gerador de dados mock, Cron Builder, Gerador Docker Compose, Gerador .gitignore, Gerador de QR Code, Tabela Markdown, Lorem Ipsum |
| 🎨 **Mídia e design** | Color Picker, Verificador de contraste, Construtor de gradiente CSS, Geradores CSS, Compressor de imagens, Otimizador SVG, Visualizador EXIF e removedor, Gerador de Favicon, Captura de Código, Inspetor de Keycode |
| 📱 **Produtividade** | Notes, Trechos de código, Tasks, Favoritos, API Keys, Sala de descanso (2048, Sudoku, Snake, Minesweeper, Tetris) |

Tudo é pesquisável a partir de uma única paleta de comandos, em tema escuro ou
claro, em 27 idiomas.

---

## 🔒 Privacidade por design

- **Nenhum servidor do MyDevTools.** Não há backend para fazer login, serviço de
  sincronização nem sistema de contas. Entradas das ferramentas, notas, snippets,
  tarefas e favoritos são gravados em um banco SQLCipher local, criptografado com
  uma chave guardada no keychain do sistema operacional.
- **Credenciais ficam criptografadas no cofre.** Senhas de banco de dados, chaves
  de API e entradas do gerenciador de senhas são criptografadas localmente com uma
  senha mestra que só você conhece.
- **Você escolhe cada conexão de saída.** O app em si não precisa de rede, mas
  algumas ferramentas existem para falar com *os seus* destinos: o cliente de API
  envia as requisições que você escreve, os clientes de banco conectam nos hosts
  que você configura, as consultas DNS / WHOIS batem em registros públicos e o
  atualizador verifica as releases do GitHub. Nada além disso sai.
- **Estatísticas de uso opcionais e anônimas.** Desligadas até você ativar. Quando
  ativadas, dois eventos (`app_started`, `tool_opened`) são enviados com um id de
  sessão rotativo, a versão do app e o idioma. Sem id de dispositivo, sem caminhos,
  nada do que você digita em uma ferramenta.
- **Auditável.** AGPL-3.0. As afirmações acima estão neste repositório — leia.

---

## 🏗️ Arquitetura

Uma UI Next.js 16 / React 19 (`apps/desktop-ui`) dentro de um shell Tauri v2
(`apps/desktop`, Rust). O armazenamento é SQLCipher com chave vinda do keychain do
sistema; os drivers de banco, HTTP / gRPC e o mock server são Rust nativo. O site
(`apps/web`) é só marketing — as ferramentas não rodam lá.
Detalhes: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 🛠️ Compilar a partir do código-fonte

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Requer Node.js ≥ 22, pnpm ≥ 9 e Rust estável. Nenhuma etapa de configuração — sem
chaves de API, sem contas, sem serviços.

---

## Até onde o MyDevTools vai

- **Só macOS** nas builds publicadas hoje.
- **Os clientes de banco são para o trabalho do dia a dia**, não um substituto de
  uma suíte completa de DBA — sem designer visual de schema, sem ferramentas de migração.
- **Sem recursos de equipe.** Sem workspaces compartilhados, sem sincronização, sem colaboração.
- **Algumas ferramentas precisam de rede por definição** — DNS, WHOIS, webhooks,
  requisições de API, conexões de banco de dados.

---

## 🤝 Contribuindo

Contribuições são bem-vindas — correções de bugs, novas ferramentas, ajustes de
UI, traduções e documentação, tudo conta. Comece pelo [CONTRIBUTING.md](../../CONTRIBUTING.md);
as issues marcadas como [`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
têm escopo pensado para quem está chegando.

Melhorar esta tradução, ou um arquivo de idioma em `apps/desktop-ui/messages/`,
não exige Rust nem build.

| | |
|---|---|
| 🐛 Reportar um bug · ✨ Sugerir um recurso | [Modelos de issue](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 Fazer uma pergunta | [Discussões](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 Reportar uma vulnerabilidade | [SECURITY.md](../../SECURITY.md) — em privado, nunca em uma issue pública |
| 🗺️ Ver o que está planejado | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 Padrões da comunidade | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ Apoie o projeto

O MyDevTools é grátis, não tem plano pago e nunca vai ter. Se ele te economiza
tempo, dê uma estrela no repositório, [patrocine no GitHub](https://github.com/sponsors/itsmeakhil)
ou conte para alguém do seu time.

---

## 📄 Licença

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — veja [LICENSE](../../LICENSE).

<p align="center">
  Feito com ❤️ por <a href="https://github.com/itsmeakhil">Akhil</a> e <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">colaboradores</a>
</p>
