# Left rail shell — design

Date: 2026-08-05
Scope: `apps/desktop-ui`
Status: approved, ready for implementation plan

## Goal

Replace the top bar with a left navigation rail. The rail carries the brand, Dashboard,
a curated **Apps** section, Pinned tools, open tool tabs, and the profile menu. A thin
drag strip remains at the very top of the window solely to host the macOS traffic lights
and the ⌘K button.

## Current state

- `components/sidebar/client-layout.tsx` renders `<TopBar/>` then a single `<main>`. No
  left panel is rendered at all.
- `components/shell/top-bar.tsx` (187 lines) — brand, `<TopNavStrip/>`, ⌘K `NavIcon`,
  avatar dropdown (Profile / Settings / Help / Theme / Sign out), macOS traffic-light
  inset + fullscreen detection.
- `components/shell/top-nav-strip.tsx` (427 lines) — Dashboard icon, hover-open Pinned
  dropdown, horizontally scrolling open-tab chips with edge fades, ⌥1–9 / ⌥W keyboard
  handling. Exports `NavIcon`, consumed by `top-bar.tsx`.
- `components/sidebar/app-sidebar.tsx` (87 lines) — orphaned. Uses the shadcn `Sidebar`
  with `collapsible="icon" variant="floating"`, a Dashboard row and a Pinned `NavGroup`.
  Nothing imports it.
- `components/sidebar/nav-user.tsx` (227 lines) — orphaned profile card.
- `SidebarProvider` is already mounted in `client-layout.tsx`, so the shadcn sidebar
  context, ⌘B toggle and persisted collapse state exist and are unused.

## Target layout

```
┌──────────┬────────────────────────────┐
│ ●●●      │        (drag)          ⌘K │  h-9 TopStrip, full width
├──────────┼────────────────────────────┤
│ mydevtools.tech                       │
│ ⌂ Dashboard                           │
│                                       │
│ APPS                   ⚙              │
│   ⚡ API Client        •              │
│   ▤ Data Explorer                     │
│   ✎ Notes             • ×             │
│                                       │
│ PINNED                                │
│   { } JSON Formatter                  │
│                                       │
│ OPEN                                  │
│   ⌗ Regex Tester       ×              │
│──────────│                            │
│ (A) akhil│      tool content          │
└──────────┴────────────────────────────┘
```

Rail: 240px expanded, 48px icon-only collapsed (tooltips on hover), ⌘B toggle, collapse
state persisted by the existing shadcn sidebar cookie. Below the `md` breakpoint the rail
becomes the shadcn offcanvas Sheet; the existing `MobileNav` bottom bar is untouched.

## Components

### `components/shell/top-strip.tsx` (new)

Replaces `top-bar.tsx`. `h-9`, `data-tauri-drag-region`, `border-b`,
`bg-[hsl(var(--surface-2))]`.

Carried over verbatim from `top-bar.tsx`:

- the `isTauri` / `isFullscreen` mounted-guarded state and the resulting left padding
  (`px-4` on web, `pl-[74px]` in a non-fullscreen Tauri window, `pl-4` fullscreen);
- the `NavIcon` component itself, moved here from `top-nav-strip.tsx` (it is the only
  surviving consumer);
- the ⌘K button dispatching `new CustomEvent('open-command-palette')`.

Everything else in `top-bar.tsx` moves to the rail (brand, account dropdown) or is
deleted (`TopNavStrip`).

### `hooks/use-tab-shortcuts.ts` (new)

The ⌥1–9 / ⌥W `keydown` effect lifted out of `TopNavStrip`, unchanged in behaviour,
including the `e.code`-based (layout-independent) key matching and the input/textarea/
contenteditable guard. Also exports the `closeTabAndNavigate(path)` callback that both
the shortcut handler and the rail's row `×` buttons use, so close-and-pick-next-tab logic
lives in exactly one place. Called once from `AppSidebar`.

### `components/sidebar/app-sidebar.tsx` (rewrite)

Keeps `Sidebar collapsible="icon" variant="floating"`. Sections top to bottom:

1. **Brand row** — `mydevtools.tech` wordmark in Courier Prime, navigates to
   `/dashboard`. Hidden when collapsed (the icon rail shows nothing in its place).
2. **Dashboard row** — the existing row with the framer-motion `layoutId="sidebar-active-pill"`
   active indicator.
3. **APPS** — `NavGroup` rows in user order. `NavGroup` gains one optional prop,
   `onReorder?: (paths: string[]) => void`; when supplied it wraps its rows in a
   framer-motion `Reorder.Group` / `Reorder.Item` pair, and when omitted it renders exactly
   as today (so Pinned and Open are unaffected). A `⚙` button in the section header opens a
   `DropdownMenu` checklist of every default app to hide/show. Drag and the `⚙` menu are
   disabled while the rail is collapsed.
4. **PINNED** — the existing `NavGroup` fed by `buildPinnedNavItems`, unchanged. The
   empty-state block ("No pinned tools yet") is retained.
5. **OPEN** — a `NavGroup` listing open tabs whose path is in neither the visible Apps
   list nor the Pinned list. Section is not rendered when empty.
6. **Footer** — `NavUser`.

Row labels and icons resolve through the existing `getSidebarToolMeta` and
`getToolMessageKey` helpers, matching how the top strip resolves them today.

### `components/sidebar/nav-group.tsx` (edit)

The open-tab affordance is added once, inside the shared row renderer, so Apps, Pinned and
Open all inherit it:

- subscribe to `useTabStore` and mark a row open when its path matches an open tab;
- open + not active → a 4px dot at the row's right edge;
- hovered (or active) and open → the dot is replaced by a `×` calling
  `closeTabAndNavigate`;
- collapsed rail → dot only, no `×` (no room, and the tooltip already carries the label).

A closed tool row behaves exactly as today.

### `components/sidebar/nav-user.tsx` (edit)

Currently an orphaned profile card. It absorbs the menu that dies with `top-bar.tsx`:
Profile, Settings, Help, the `ModeToggle` theme row, and Sign out (destructive styling),
plus the logged-out variant showing only Theme and Sign in. Data comes from the existing
`useAppUser` / `useSignOut` hooks. Displays avatar + name expanded, avatar only collapsed.

### `components/sidebar/client-layout.tsx` (edit)

`<TopBar/>` → `<TopStrip/>`, and `<AppSidebar/>` is rendered as the first child of the
existing `<div className="flex min-h-0 w-full flex-1">` row, before `<main>`. The existing
`state === 'collapsed'` padding branch on `<main>` stays.

### Deleted

`components/shell/top-bar.tsx`, `components/shell/top-nav-strip.tsx`.

## State

New `store/app-rail-store.ts`, shaped after `store/pinned-tools-store.ts`:

```ts
interface AppRailStore {
  orderByWorkspace: Record<string, string[]>   // app paths, user order
  hiddenByWorkspace: Record<string, string[]>  // app paths the user hid
  setOrder: (workspaceId: string, paths: string[]) => void
  toggleHidden: (workspaceId: string, path: string) => void
}
```

zustand `persist`, key `app-rail-storage`, version 1, localStorage only. Deliberately **not**
synced to the backend: pinned tools are a server-owned preference, but rail order is local
window chrome.

A selector resolves the visible list: start from `DEFAULT_APPS`, order by the stored array,
append any default app missing from it (so apps shipped in a later release show up at the
bottom instead of vanishing), drop the hidden ones, drop paths no longer in `DEFAULT_APPS`.

`DEFAULT_APPS` — the eleven heavyweight tools that have real routes:

```
/app/api-client        /app/data-explorer   /app/sql-client
/app/s3-drive          /app/redis-commander /app/notes
/app/bookmarks         /app/snippet-manager /app/to-do
/app/password-manager  /app/environment-manager
```

`api-key-vault` is excluded — it is a component, not a route.

## i18n

New `Navigation` keys — `apps`, `open`, `manageApps` — plus `dashboard` and `pinned`, which
the dying top strip hardcoded in English. Added to `messages/en.json` and all 26 other
locales. No ICU plurals involved, so no per-locale plural-category work.

## Testing

- `store/__tests__/app-rail-store.test.ts` — reorder persists; hide removes a row from the
  visible list; a `DEFAULT_APPS` entry absent from a stored order appears at the end; a
  stored path no longer in `DEFAULT_APPS` is dropped.
- `components/sidebar/__tests__/app-sidebar-rbac.test.tsx` — existing suite, updated for
  the new rail structure.
- Manual: `pnpm dev:tauri` — traffic lights draggable and not overlapped, ⌘B collapse,
  ⌥1–9 / ⌥W still switch and close tabs, close `×` on a row picks the neighbouring tab.

## Out of scope

- Drag-resizable rail width (collapse to icons only).
- Backend sync of app order or hidden apps.
- Mobile redesign — the rail uses the shadcn offcanvas Sheet below `md` and `MobileNav`
  stays as is.
- Any change to tool pages, `NavBar`, or `TabContent`.
