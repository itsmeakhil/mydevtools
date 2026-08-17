# Changelog

## 0.1.14

### Fixed

- **Markdown Preview & HTML**: exporting HTML now confirms with a "Saved <name>" toast instead of failing silently, so you can tell the download actually happened.

### Added

- **Markdown Preview & HTML**: name your export before downloading — a file name field next to the export button, with path separators and illegal characters stripped automatically (falls back to `export.html`).

### Internal

- CI: ThreatCrush security scan runs on every pull request, with results uploaded as SARIF to GitHub code scanning.
