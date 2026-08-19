# Contributing to MyDevTools

Thanks for taking the time to contribute. MyDevTools is a free, open-source
offline developer workstation, and it gets better every time someone fixes a
bug, adds a tool, tightens a translation or clarifies a doc.

This guide describes how the repository actually works, so you can get from
clone to pull request without guessing.

---

## Table of contents

- [Project overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Linting and formatting](#linting-and-formatting)
- [Branch naming](#branch-naming)
- [Commit guidance](#commit-guidance)
- [Pull request process](#pull-request-process)
- [Adding a new tool](#adding-a-new-tool)
- [Translations](#translations)
- [Improving documentation](#improving-documentation)
- [Reporting bugs](#reporting-bugs)
- [Requesting features](#requesting-features)
- [Good first issues](#good-first-issues)

---

## Project overview

MyDevTools is a **desktop application**. The desktop app is the product: it runs
offline, has no accounts, and has no MyDevTools backend. Please keep that intact
— changes that introduce mandatory sign-in, cloud sync or a required server will
not be merged.

The monorepo holds three workspaces:

| Workspace | Role |
|---|---|
| `apps/desktop-ui` | The Next.js UI the desktop app is built from. **Tool work happens here.** |
| `apps/desktop` | The Tauri v2 (Rust) shell — SQLCipher storage, native database drivers, HTTP/gRPC |
| `apps/web` | mydevtools.tech — the marketing and SEO site. No tools run here. |

Data flows from the UI through `lib/backend-api.ts` → the Tauri `local_api`
command → SQLCipher on disk. The `/api/v1/...` paths you will see are the local
Rust router's contract; they are never real HTTP requests.

---

## Prerequisites

- **Node.js** ≥ 22 (the repo pins a version in `.nvmrc` — `nvm use` picks it up)
- **pnpm** ≥ 9
- **Rust** stable — only needed if you touch `apps/desktop` or want to run the
  real desktop shell. Install via [rustup](https://rustup.rs/).

Contributing to a tool's UI or logic does not require Rust.

---

## Local setup

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
```

There is no configuration step — no `.env` to fill in, no API keys, no accounts,
no services to provision.

---

## Development commands

Run these from the repository root:

| Command | What it does |
|---|---|
| `pnpm dev:desktop` | Run the full Tauri desktop app (needs Rust) |
| `pnpm build:desktop` | Build the desktop app |
| `pnpm dev` | Run the marketing site at [localhost:3000](http://localhost:3000) |
| `pnpm build` | Build every workspace |
| `pnpm lint` | Lint every workspace |
| `pnpm i18n:audit` | Report missing/extra translation keys |
| `pnpm i18n:sync` | Fill missing translation keys across locales |
| `pnpm clean-install` | Wipe `node_modules` everywhere and reinstall |

Working on a tool's UI without Rust? Run the desktop UI on its own:

```bash
cd apps/desktop-ui
pnpm dev:tauri     # Next.js dev server with NEXT_PUBLIC_TAURI=1
```

Some features (database drivers, the request proxy, SQLCipher storage) only work
inside the real Tauri shell, so use `pnpm dev:desktop` when you need them.

---

## Project structure

```
apps/
├── desktop/                       Tauri v2 shell (Rust)
│   └── src-tauri/src/
│       ├── router/                Local API over SQLCipher
│       ├── dbtools/               Native Postgres / MySQL / MongoDB / Redis drivers
│       ├── http/                  Request proxy, gRPC, mock server
│       └── db/                    Schema migrations, device key
│
├── desktop-ui/                    Next.js UI the desktop app is built from
│   ├── src/app/app/<slug>/        One folder per tool: page.tsx + layout.tsx
│   ├── src/components/<slug>/     That tool's components
│   ├── src/lib/<slug>.ts          Pure tool logic — unit tested, no React
│   ├── src/lib/__tests__/         Jest tests
│   └── messages/                  next-intl locale files (27 languages)
│
└── web/                           Marketing and SEO site
    └── src/lib/seo/               Platform, comparison and structured-data pages
```

The important convention: **keep tool logic pure**. Parsing, formatting,
encoding and validation belong in `src/lib/<slug>.ts` as plain functions that a
test can call. The React component wires that logic to inputs and outputs. This
is what makes tools testable without a browser.

---

## Testing

Tests live in `apps/desktop-ui/src/lib/__tests__/` and run with Jest:

```bash
cd apps/desktop-ui
pnpm test                        # everything
pnpm test -- json-formatter      # one file
pnpm test:watch                  # watch mode
```

Rust:

```bash
cd apps/desktop/src-tauri
cargo check
cargo test
```

**A new tool needs a test for its logic module.** It does not need a rendering
test — cover the parsing/conversion/edge cases in `src/lib/<slug>.ts` and you
have covered the part that breaks.

> One suite fails on a clean checkout — the `react-window` tests, because that
> package is not installed. That failure is pre-existing and not caused by your
> change.

---

## Linting and formatting

```bash
pnpm lint                                    # every workspace
cd apps/desktop-ui && pnpm lint              # just the app
```

Type checking uses the workspace-local TypeScript:

```bash
cd apps/desktop-ui && ./node_modules/.bin/tsc --noEmit
```

Match the style of the file you are editing rather than reformatting it. Please
do not add a formatter config or run a repo-wide reformat in a feature PR — a
diff full of whitespace hides the actual change.

---

## Branch naming

```
feature/<short-description>     new tool or capability
fix/<short-description>         bug fix
docs/<short-description>        documentation only
chore/<short-description>       deps, config, tooling
```

Example: `feature/yaml-schema-validator`, `fix/jwt-decoder-expiry-timezone`.

---

## Commit guidance

- One logical change per commit; keep unrelated refactors out of it.
- Write the subject in the imperative mood: `Add YAML schema validator`, not
  `Added...`.
- Explain *why* in the body when the reason is not obvious from the diff.
- Conventional Commit prefixes (`feat:`, `fix:`, `docs:`) are welcome but not
  required.

---

## Pull request process

1. Fork the repo and branch from `main`.
2. Make your change, with a test if you touched logic.
3. Run `pnpm lint` and the relevant tests.
4. Open a PR against `main` and fill in the template.
5. Describe what changed and how you verified it. Screenshots or a short clip
   help a lot for UI work.

What reviewers look for:

- The offline/no-account promise is intact — no new mandatory network calls,
  sign-in, sync or backend.
- User-visible strings go through `useTranslations("<Namespace>")`, never
  hardcoded.
- Async mutations that can fail (vault locked, no workspace) are wrapped in
  `try/catch` with a `toast.error(message)` — never left as an unhandled
  rejection.
- New dependencies are justified. A few lines beat a package for small jobs.

Small, focused PRs get reviewed faster than large ones. If you are planning
something big, open an issue first so we can agree on the approach before you
spend the time.

---

## Adding a new tool

A tool is more than one page — it has to be registered so it shows up in search,
the sidebar, the dashboard and the metadata. All of this happens in
`apps/desktop-ui`.

**1. The tool itself**

```
src/app/app/<slug>/page.tsx                       the route
src/app/app/<slug>/layout.tsx                     metadata via generateToolMetadata
src/components/<slug>/<slug>-layout.tsx           the UI
src/lib/<slug>.ts                                 pure logic
src/lib/__tests__/<slug>.test.ts                  its test
```

**2. Register it in all six registries**

| File | What to add |
|---|---|
| `src/lib/metadata.ts` | Title, description, keywords |
| `src/lib/route-config.ts` | Route entry (lucide icon) |
| `src/lib/tab-registry.tsx` | Tab/window behaviour |
| `src/lib/tool-categories.ts` | Which category it belongs to |
| `src/lib/tool-i18n.ts` | Translation key mapping |
| `src/components/sidebar/data/sidebar-data.ts` | Sidebar entry (@tabler icon) |

Miss one and the tool will look half-installed — for example present in the
sidebar but missing from search.

**3. Translations**

Add `Navigation.<key>`, `Dashboard.tools.<key>` and a top-level `<Namespace>`
block to `messages/en.json`, then run `pnpm i18n:sync` to propagate the keys and
`pnpm i18n:audit` to confirm nothing is missing. See
[Translations](#translations) below.

**4. UI conventions**

Use `ToolPageHeader` with `RevealItem` and `CATEGORY_ACCENT[category]` so the
header matches every other tool.

The clearest guide is an existing tool — copy the shape of one close to what you
are building. `CLAUDE.md` in the repo root documents these conventions in
condensed form.

---

## Translations

The app ships in 27 languages. English (`messages/en.json`) is the source of
truth; every other locale mirrors its keys.

```bash
pnpm i18n:sync      # add missing keys to every locale
pnpm i18n:audit     # report missing or orphaned keys
```

Two things to watch:

- **Preserve ICU plural forms.** Russian, Ukrainian, Polish and Czech need
  `few`/`many`; Arabic needs the full set (`zero`/`one`/`two`/`few`/`many`/`other`).
- **Avoid `<tag>`-shaped text in strings read with a plain `t()`** — next-intl
  treats it as markup and the call fails client-side. Use tag-free strings, or
  `t.rich` when you genuinely need markup.

Improving an existing translation is one of the most useful small contributions
available, and needs no Rust and no build.

### README translations

`README.md` (English) is canonical. Translated copies live in
`docs/readme/readme_<locale>.md` using the same locale codes as `messages/`
(`zh`, `ja`, `ko`, `es`, `pt-BR`, `de`, `fr`, `hi`). They are deliberately
shorter than the English README — keep the hero, install, privacy, tool
categories, contributing and license sections; skip the full per-tool tables.

- Fixing wording in an existing translation: edit the file, open a PR.
- Adding a language: copy `docs/readme/readme_es.md`, translate, add the new
  language to the language bar at the top of `README.md` **and** of every file in
  `docs/readme/`. Use the tool names from `messages/<locale>.json`
  (`Navigation.*`, `Dashboard.tools.*`) so the README matches the app.

---

## Improving documentation

Docs live in:

- `README.md` — the front door
- `docs/readme/readme_<locale>.md` — translated READMEs (zh, ja, ko, es, pt-BR, de, fr, hi); English is canonical, translations may lag
- `docs/ARCHITECTURE.md` — how the shell, router, storage and UI fit together
- `apps/web/src/lib/metadata.ts` — per-tool descriptions used on the website
- Tool descriptions in `src/components/sidebar/data/sidebar-data.ts`

Doc PRs are as welcome as code PRs. If a tool description is vague or a setup
step did not work for you, fixing it helps the next person hitting the same wall.

---

## Reporting bugs

Open a [bug report](https://github.com/mydevtools-tech/mydevtools/issues/new/choose)
and include:

- What you did, what you expected, what happened instead
- Your OS and app version (Settings → About)
- The tool involved
- A screenshot or clip if it is visual

**Please do not paste real secrets, tokens or production connection strings**
into an issue. Redact them, or reproduce with dummy data.

Found a security vulnerability? Do not open a public issue — follow
[SECURITY.md](SECURITY.md) instead.

---

## Requesting features

Open a [feature request](https://github.com/mydevtools-tech/mydevtools/issues/new/choose)
describing the problem you are trying to solve, not only the solution you have
in mind — the underlying problem often has a simpler answer.

Useful things to include: what you do today as a workaround, how often you hit
this, and whether it fits an offline, local-first, account-free app.

---

## Good first issues

New here? Issues labelled
[`good first issue`](https://github.com/mydevtools-tech/mydevtools/labels/good%20first%20issue)
are scoped to be completable without deep knowledge of the codebase. If none are
open, improving a translation, a tool description or a README translation is
always welcome — and testing the desktop build on Windows or Linux is the most
useful thing a new contributor can do right now.

---

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Be
decent to each other.

## License

MyDevTools is licensed under the [GNU AGPL v3](LICENSE). By contributing, you
agree that your contributions are licensed under the same terms.
