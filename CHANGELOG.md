# Changelog

## 0.2.0

### Added

- **Terminal**: reorder tabs by dragging. Drag a tab in the tab bar, or a terminal row in the sidebar, onto another tab of the same project to move it there. Running shells keep going while they move.
- **Terminal**: links in terminal output are clickable. Plain URLs and OSC 8 hyperlinks open in your default browser.

### Fixed

- **Desktop**: external links open in your default browser. Previously links that opened a new window did nothing, and other external links replaced the app's own window with the web page.
- **Terminal**: closing a tab no longer makes the next new tab reuse an existing number. New tabs always get the next unused number, so you never see two "Terminal 2" tabs.

## 0.1.20

### Added

- **Terminal**: new built-in terminal tool. Group terminals by project, open them in tabs and split panes, and see each project's git branch and changed-file count in the sidebar and status bar. Scrollback survives switching tools, and your layout is saved between launches.
- **Terminal**: Claude Code awareness. Terminals launched from the app report when Claude is working or waiting on you, collected in a "Needs you" inbox. You get a "Claude needs you" notification and a Dock badge with the waiting count (macOS), and clicking the notification jumps to that terminal.
- **Terminal**: double-click a terminal in the sidebar to rename it (Enter saves, Esc cancels, an empty name falls back to the shell's window title).
- **Terminal**: the sidebar Terminal entry shows a count of terminals waiting on you.
- **Desktop (macOS)**: closing the window hides the app instead of quitting, and quitting with terminals still running asks for confirmation first.

### Fixed

- **Data Explorer**: MongoDB collection tables scroll again. Large collections previously clipped the table, status bar and pagination.
- **Code editors**: Copy from the editor context menu now works in the desktop app, and clicking or typing in an editor no longer logs clipboard errors.
- **Desktop**: ⌘W no longer closes a pane while a dialog or the rename field is open.
- **Desktop**: if a quit is blocked because terminal state failed to save, the app always explains why.

## 0.1.14

### Fixed

- **Markdown Preview & HTML**: exporting HTML now confirms with a "Saved <name>" toast instead of failing silently, so you can tell the download actually happened.

### Added

- **Markdown Preview & HTML**: name your export before downloading — a file name field next to the export button, with path separators and illegal characters stripped automatically (falls back to `export.html`).

### Internal

- CI: ThreatCrush security scan runs on every pull request, with results uploaded as SARIF to GitHub code scanning.
