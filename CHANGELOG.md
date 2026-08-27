# Changelog

## 0.1.16

### Added

- **Files**: new encrypted file vault. Import files or whole folders — names, folder paths and contents are encrypted on disk as opaque `.mydt` objects in a storage folder you pick, readable only while the vault is unlocked. List and grid views with thumbnails, previews for text, code, images and PDF, export with a plaintext warning, and a storage overview per file type.
- **API Client**: folder-backed collections — requests stored as plain YAML files, so a collection can be committed, diffed and PR-reviewed.
- **API Client**: import from Postman, Insomnia and Bruno; Postman environment import and export.
- **API Client**: "Move to vault" — moves credentials out of collection files into the encrypted API Key Vault, leaving a `{{vault.<name>}}` reference behind.
- **Tool sidebars**: collapse to a 48px icon rail that still exposes sections and filters, `Cmd+\` to toggle, drag-resize with the width remembered per tool.
- **Settings**: regenerate vault backup codes.

### Improved

- **Settings**: split into Profile, Appearance, Security and Data tabs.
- 22 more tools (Media & Design, Network & API, Security) migrated onto the shared tool layout kit.
- **API Client**: no whole-tree re-render per keystroke, editors stay mounted across tab switches, 5s hard timeout on runaway scripts, history queries are paged, pooled HTTP clients and a 50 MB response cap.

### Fixed

- **Notes**: sidebar no longer renders before the vault is unlocked.
- **Dashboard**: greets the user by their profile display name.
- **Tool sidebars**: collapsed state keeps items, identity and top spacing; one toggle glyph at a time.
- **API Client**: toolbar and key/value spacing, open-folder button in the empty state, and tab-storage overflow drops bodies and file bytes instead of wiping all open tabs.

### Internal

- `mydt` crate: the `.mydt` container format extracted into a standalone library plus CLI (`encrypt`/`decrypt`/`info`/`ls`), shared by the desktop app. Format documented in `docs/MYDT_FORMAT.md`.

## 0.1.15

### Added

- **Linux support**: `.deb` for Debian/Ubuntu 22.04+ and an AppImage, x86_64 only. Published in the same release as macOS.
- **Settings**: factory reset — wipes every note, bookmark, task and vault entry from the device.
- A tool launcher that surfaces tools matching how you work.

### Improved

- All 14 Formatters, 15 Converters and 13 Generators share the same layout.
- Linux keeps the database key in the system keyring (GNOME Keyring / KWallet), mirroring the macOS Keychain.
- Updated the bundled database and networking libraries, including the encrypted-database engine.

### Fixed

- Linux title bar no longer reserves an empty gap for the macOS window buttons.
- Rough edges in the editor canvas and the Tasks composer.

## 0.1.14

### Fixed

- **Markdown Preview & HTML**: exporting HTML now confirms with a "Saved <name>" toast instead of failing silently, so you can tell the download actually happened.

### Added

- **Markdown Preview & HTML**: name your export before downloading — a file name field next to the export button, with path separators and illegal characters stripped automatically (falls back to `export.html`).

### Internal

- CI: ThreatCrush security scan runs on every pull request, with results uploaded as SARIF to GitHub code scanning.
