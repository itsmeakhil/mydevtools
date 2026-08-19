# README screenshots — shot list

Temporary file. Delete it once every image below exists in `assets/`.

The README already references these exact filenames, so nothing else has to change
when the files land — just drop them in and uncomment the `<!-- hero -->` block in
`README.md`.

## General rules

- Capture from the **real desktop app** (Tauri build or `pnpm dev:tauri`), not the
  browser. Hide the macOS menu bar and dock; use a plain window, no shadow.
- Window size **1600 × 1000** (Retina 2× is fine → 3200 × 2000 px). Same size for
  every shot so they line up in the README.
- Use **dummy data only**: no real emails, tokens, connection strings, hostnames or
  bucket names. Display name in the app: set to something like `Dev`.
- Sidebar visible; no browser-style chrome; no toasts or tooltips mid-fade.
- Export PNG, then run them through the in-app **Image Compressor** (or `pngquant`)
  so each stays under ~400 KB.

## Shots

| File | Theme | What to show | Notes |
|---|---|---|---|
| `assets/hero-dark.png` | dark | Home / dashboard: sidebar + tool grid, a couple of pinned tools | Shown by default on GitHub dark mode. Hero of the README — make it count. |
| `assets/hero-light.png` | light | Same view, same state, light theme | Shown on GitHub light mode. |
| `assets/api-client.png` | dark | API Client: a `GET https://httpbin.org/json` request with the response body and status visible | Shows collections/environments panel if it fits. |
| `assets/sql-client.png` | dark | SQL Client: a query and a result grid | Local Postgres/MySQL with sample rows; credentials never on screen. |
| `assets/command-palette.png` | dark | ⌘K command palette open with a partial query (e.g. `jwt`) and matches listed | Backs the "one search box" claim. |
| `assets/demo.gif` (optional) | dark | 10–15 s: ⌘K → open JSON Formatter → paste/format → ⌘K → API Client → send | ≤ 8 MB, 1600 × 1000, 15 fps. Kap / CleanShot / Gifski. |

## Social preview (repo Settings → Social preview)

`assets/social-preview.png` (1280 × 640) is generated separately — see the PR
description. Upload it manually; GitHub has no API for it.
