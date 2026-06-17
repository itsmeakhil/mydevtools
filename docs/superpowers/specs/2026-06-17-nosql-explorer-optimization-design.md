# NoSQL Explorer — Full-Pass Optimization Design

**Date:** 2026-06-17  
**Scope:** Full-pass optimization (Approach 1 — layer by layer)  
**Sprints:** 4 sprints across 5 layers  
**Files in scope:**
- `apps/web/src/app/app/nosql-explorer/page.tsx`
- `apps/web/src/components/nosql-explorer/document-view.tsx`
- `apps/web/src/components/nosql-explorer/explorer-sidebar.tsx`
- `apps/web/src/components/nosql-explorer/connection-form.tsx`
- `apps/web/src/components/nosql-explorer/query-builder.tsx`
- `apps/web/src/components/nosql-explorer/tab-bar.tsx`
- `apps/web/src/components/nosql-explorer/types.ts`

---

## Layer 1 — Bug Fixes (Sprint 1)

### 1.1 Password leak in sidebar tooltip
**File:** `explorer-sidebar.tsx:528`  
**Problem:** Tooltip renders raw `connectionString` including credentials.  
**Fix:** Mask with `replace(/:([^@]+)@/, ":****@")` — same regex already used in `connection-form.tsx:282`.

### 1.2 `confirm()` → `AlertDialog`
**Files:** `explorer-sidebar.tsx:252, 264, 283`  
**Problem:** Three destructive actions use native `window.confirm()`: delete connection, drop database, drop collection. Inconsistent with rest of app (which uses shadcn `AlertDialog`). Not accessible. Blocked by popup blockers in some environments.  
**Fix:** Add three `AlertDialog` state slots to `ExplorerSidebar`:
```ts
const [deleteConnDialog, setDeleteConnDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
const [dropDbDialog, setDropDbDialog] = useState<{ open: boolean; connIndex: number | null; dbName: string }>({ open: false, connIndex: null, dbName: "" });
const [dropCollDialog, setDropCollDialog] = useState<{ open: boolean; connIndex: number | null; dbName: string; collectionName: string }>({ open: false, connIndex: null, dbName: "", collectionName: "" });
```
Render three `AlertDialog` components at bottom of return, matching existing `page.tsx` pattern.

### 1.3 Indeterminate checkbox
**File:** `document-view.tsx:938`  
**Problem:** Manual `data-state="indeterminate"` hack instead of Radix API.  
**Fix:**
```tsx
// Before
<Checkbox
  checked={isAllSelected}
  data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
/>
// After
<Checkbox
  checked={isIndeterminate ? "indeterminate" : isAllSelected}
  onCheckedChange={handleSelectAll}
  aria-label="Select all"
/>
```

### 1.4 Mixed icon libraries
**File:** `page.tsx:22`  
**Problem:** `Menu` imported from `lucide-react`; everything else uses `@tabler/icons-react`.  
**Fix:** Replace `import { Menu } from "lucide-react"` with `import { IconMenu2 } from "@tabler/icons-react"`. Update JSX reference.

### 1.5 Locale lookup nested ternary
**File:** `connection-form.tsx:31–61`  
**Problem:** 20-line nested ternary for date-fns locale mapping. Unreadable and brittle.  
**Fix:**
```ts
import { af, ar, ca, cs as csLocale, da, de, el, enUS, es, faIR, fr as frLocale, ms, nb, nl, pt, zhCN } from "date-fns/locale";

const DATE_LOCALE_MAP: Record<string, Locale> = {
  fr: frLocale, es, ar, ca, zh: zhCN, cs: csLocale,
  el, de, da, af, fa: faIR, ms, nb, nl, pt,
};

const dateLocale = DATE_LOCALE_MAP[locale] ?? enUS;
```

---

## Layer 2 — Performance (Sprint 2)

### 2.1 Cache connection lookup
**File:** `page.tsx`  
**Problem:** Every action handler calls `getConnections(user.uid, encryptionKey)` independently — up to 8 storage reads per user action (e.g. bulk delete: reads connections, refreshes, repeat).  
**Fix:** Add `connectionCacheRef = useRef<Map<string, SavedConnection>>(new Map())` in `page.tsx`. Add `onConnectionsLoaded` callback prop to `ExplorerSidebar` — fires after `loadConnections()` resolves, receives the `SavedConnection[]` array. `page.tsx` populates the cache map. All action handlers use:
```ts
const conn = connectionCacheRef.current.get(tab.connectionId);
if (!conn) throw new Error("Connection not found — try refreshing the sidebar");
```
Cache invalidated (`.clear()`) when connections are added, deleted, or updated. Fallback to `getConnections()` if cache miss (defensive).

### 2.2 Memoize derived values in DocumentView
**File:** `document-view.tsx:576–590`  
**Problem:** `fields`, `allFields`, `totalPages`, `isAllSelected`, `isIndeterminate`, `isFilterActive` recompute on every render.  
**Fix:**
```ts
const fields = useMemo(() =>
  Array.from(new Set(documents.flatMap(Object.keys))).filter(k => k !== "_id"),
  [documents]
);
const allFields = useMemo(() => ["_id", ...fields], [fields]);
const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);
const isAllSelected = useMemo(() =>
  documents.length > 0 && selectedIds.size === documents.length, [selectedIds, documents]);
const isIndeterminate = useMemo(() =>
  selectedIds.size > 0 && selectedIds.size < documents.length, [selectedIds, documents]);
const isFilterActive = useMemo(() => {
  try {
    const q = searchQuery?.trim();
    if (!q || q === "{}") return false;
    return Object.keys(JSON.parse(q)).length > 0;
  } catch { return false; }
}, [searchQuery]);
```

### 2.3 JSON stringify off main thread
**File:** `document-view.tsx:422–424`  
**Problem:** `JSON.stringify(documents, null, 2)` on the main thread blocks rendering for large payloads (2000 docs × deep objects).  
**Fix:** Defer with `setTimeout(..., 0)` for immediate improvement. For documents.length > 200, use a Web Worker:
```ts
useEffect(() => {
  if (documents.length === 0) { setJsonViewContent("[]"); return; }
  const id = setTimeout(() => {
    setJsonViewContent(JSON.stringify(documents, null, 2));
  }, 0);
  return () => clearTimeout(id);
}, [documents]);
```

### 2.4 Fix `handleTabClose` stale closure
**File:** `page.tsx:249–256`  
**Problem:** `tabs` read from closure may be stale when computing next active tab.  
**Fix:**
```ts
const handleTabClose = (tabId: string) => {
  setTabs((prev) => {
    const next = prev.filter((t) => t.id !== tabId);
    if (activeTabId === tabId) {
      const idx = prev.findIndex((t) => t.id === tabId);
      const nextTab = prev[idx - 1] ?? prev[idx + 1] ?? null;
      setActiveTabId(nextTab?.id ?? null);
    }
    return next;
  });
};
```

### 2.5 Virtualize table rows
**File:** `document-view.tsx` — table view render path  
**Problem:** No virtualization. Rendering 1000–2000 rows locks the browser. Limit selector goes up to 2000.  
**Fix:** Add `@tanstack/react-virtual`. Apply `useVirtualizer` to the table `<tbody>`. Render only visible rows + 10-row overscan. Table container needs fixed height (already `h-full overflow-auto`). Row height: `48px` estimated (can use dynamic measurement). Keep sticky `<thead>` outside the virtualized area.

---

## Layer 3 — UX (Sprint 3)

### 3.1 Toolbar — two-row layout on smaller screens
**File:** `document-view.tsx:627–745`  
**Problem:** Single row with `min-h-14` cramps query builder, view mode, pagination, and actions together. Uses multiple `hidden sm:inline` hacks to hide labels.  
**Fix:** Split toolbar into two rows:
- **Row 1 (full width):** `QueryBuilder` + run button
- **Row 2:** view mode dropdown | pagination | divider | refresh + insert + import/export buttons

On `xl:` breakpoint, collapse back to single row. Remove all `hidden sm:inline` label hacks — labels are always visible on row 2.

### 3.2 Import/Export — remove chooser dialog
**File:** `document-view.tsx:735–743`  
**Problem:** "Import/Export" button → chooser modal → actual import or export modal. Two modals deep for a common action.  
**Fix:** Replace single button with two buttons: `Import` (with `IconUpload`) and `Export` (with `IconDownload`). On mobile (`!isDesktop`), group under a `⋯` overflow `DropdownMenu` to save space. Remove `isImportExportChooserOpen` state and the chooser `Dialog` entirely.

### 3.3 Active sort badge in breadcrumb
**File:** `document-view.tsx:602–624`  
**Problem:** Sort state only visible in table column headers. Invisible in JSON/tree/schema/indexes views.  
**Fix:** When `sortField` is set, render a dismissible badge in breadcrumb bar:
```tsx
{sortField && (
  <button
    className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
    onClick={() => onSortChange("", "asc")}
  >
    sorted by {sortField} {sortDirection === "asc" ? "↑" : "↓"} <IconX className="h-2.5 w-2.5" />
  </button>
)}
```

### 3.4 Empty state — mobile-aware direction hint
**File:** `page.tsx:813–824`  
**Problem:** `IconArrowLeft` makes no sense on mobile where sidebar is hidden behind a Sheet.  
**Fix:**
- Desktop: `IconLayoutSidebar` + "Select a collection from the sidebar"
- Mobile: `IconLayoutSidebar` + "Open the sidebar to browse your collections" + visible "Open Sidebar" button that calls `setMobileSidebarOpen(true)`

### 3.5 Auto-expand newly added connection in sidebar
**Files:** `page.tsx`, `explorer-sidebar.tsx`  
**Problem:** After adding a connection via `ConnectionForm`, sidebar refreshes but new connection stays collapsed. User must manually find and click it.  
**Fix:** `ConnectionForm.onConnect` already fires after save. Pass the new connection's `id` from `saveConnection()` return value up through the callback. Add `autoExpandConnectionId?: string` prop to `ExplorerSidebar`. After `loadConnections()` resolves, call `toggleConnection` for that index if the id matches.

### 3.6 Visible run button in query input
**File:** `query-builder.tsx:334`  
**Problem:** No visible "Run" affordance on the inline query input. Users must know to press `Enter` or find the `▶` in the advanced editor.  
**Fix:** Add `▶` (`IconPlayerPlay`) button at right edge of the query input, always visible:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-primary"
  onClick={handleTextSearch}
  title={t("runQuery")}
>
  <IconPlayerPlay className="h-3.5 w-3.5" />
</Button>
```
Place it before the existing clear/filter/history buttons group.

### 3.7 Tab bar — show db context
**File:** `tab-bar.tsx:61–64`  
**Problem:** Tabs only show `collectionName`. Two tabs with same collection name from different DBs are indistinguishable.  
**Fix:** Show `{dbName.slice(0, 8)}·{collectionName}` as label. Truncate `dbName` at 8 chars with `…` if longer. Tooltip already shows full `connectionName › dbName` — keep unchanged.

---

## Layer 4 — Accessibility (Sprint 4, part 1)

### 4.1 Sortable column headers
**File:** `document-view.tsx:943–963`  
**Problem:** Sort click on `div` inside `<th>`. No `aria-sort`. Not keyboard reachable.  
**Fix:** Replace `<div onClick={handleSort}>` with `<button>`. Add `aria-sort` to `<th>`:
```tsx
<th aria-sort={sortField === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
  <button onClick={() => handleSort(key)} className="flex items-center gap-1">
    {key}
    <span aria-hidden="true">...</span>
  </button>
  {/* resize handle stays as div */}
</th>
```

### 4.2 Column resize — keyboard support
**File:** `document-view.tsx:556–574`  
**Problem:** Resize handle is `<div onMouseDown>` only. No keyboard access.  
**Fix:**
```tsx
<div
  role="separator"
  aria-orientation="vertical"
  tabIndex={0}
  onMouseDown={(e) => handleColumnResize(key, e)}
  onKeyDown={(e) => {
    if (e.key === "ArrowRight") setColumnWidths(prev => ({ ...prev, [key]: (prev[key] ?? 300) + 10 }));
    if (e.key === "ArrowLeft") setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, (prev[key] ?? 300) - 10) }));
  }}
/>
```

### 4.3 Sidebar tree — keyboard navigation
**File:** `explorer-sidebar.tsx`  
**Problem:** No keyboard navigation in connection/database/collection tree. Arrow keys do nothing.  
**Fix:** Implement roving `tabIndex` pattern. Maintain `focusedNodeId` ref. Event handler on tree container:
- `ArrowDown`: move focus to next visible node
- `ArrowUp`: move focus to previous visible node  
- `ArrowRight`: expand collapsed node or move to first child
- `ArrowLeft`: collapse expanded node or move to parent
- `Enter`/`Space`: activate node (select collection or toggle expand)

Add `role="tree"` on container, `role="treeitem"` on each node button, `aria-expanded` on expandable nodes, `aria-selected` on active collection.

### 4.4 Advanced editor dialog — restore close button
**File:** `query-builder.tsx:546`  
**Problem:** `[&>button]:hidden` suppresses default `DialogContent` close button. Fragile — relies on CSS specificity to override Radix behavior.  
**Fix:** Remove `[&>button]:hidden`. The existing custom `×` button in the header is sufficient as the visible close control. The default Radix close button can be visually hidden via `sr-only` class rather than `display:none`, preserving screen reader access.

### 4.5 Bulk action bar — live region
**File:** `document-view.tsx:750–753`  
**Problem:** Selection count changes not announced to screen readers.  
**Fix:**
```tsx
<span aria-live="polite" aria-atomic="true" className="text-sm font-medium text-primary">
  {selectedIds.size} document{selectedIds.size > 1 ? "s" : ""} selected
</span>
```

### 4.6 Table — `aria-label` and loading state
**File:** `document-view.tsx:928, 801`  
**Fix:**
```tsx
// Main table
<table aria-label={`${collectionName} documents`} className="...">

// Loading skeleton table
<table aria-busy="true" aria-label="Loading documents" className="...">
```

---

## Layer 5 — Mobile Responsiveness (Sprint 4, part 2)

### 5.1 Table → Card view on mobile
**File:** `document-view.tsx` — table view render path  
**Problem:** Horizontal-scroll table unusable on phones.  
**Fix:** Gate render path on `isDesktop` (already used in `page.tsx`). Pass `isDesktop` as prop to `DocumentView` or use `useMediaQuery` inside it (already imported).

Mobile card structure per document:
```tsx
<div className="border rounded-lg p-3 space-y-2">
  <div className="flex items-center justify-between">
    <Checkbox checked={isSelected} onChange={() => handleSelectRow(doc._id)} />
    <span className="font-mono text-xs text-muted-foreground truncate flex-1 mx-2">{doc._id}</span>
    {/* copy, edit, delete buttons */}
  </div>
  <div className="space-y-1">
    {visibleFields.map(key => (
      <div key={key} className="flex items-start gap-2 text-xs">
        <span className="text-muted-foreground w-24 shrink-0 truncate">{key}</span>
        <CellValue value={doc[key]} onViewClick={handleViewValue} />
      </div>
    ))}
    {hiddenFieldCount > 0 && <button onClick={toggleExpand}>+{hiddenFieldCount} more</button>}
  </div>
</div>
```
Show top 5 fields by default; "show more" expander for rest. Reuses `CellValue` — type badges preserved.

### 5.2 Query builder — mobile bottom sheet
**File:** `query-builder.tsx:361–489`  
**Problem:** `PopoverContent w-[600px]` overflows on 390px screens.  
**Fix:**
- Change popover width to `w-[min(600px,calc(100vw-2rem))]`
- On `!isDesktop`, replace `Popover` with `Sheet side="bottom"` for the visual filter builder. Sheet gives full-width bottom drawer with proper touch dismiss.

### 5.3 Connection form — mobile scroll fix
**File:** `connection-form.tsx:167`  
**Problem:** `max-h-[70vh] overflow-hidden` clips form content on short phones.  
**Fix:** Change to `overflow-y-auto max-h-[85dvh]`. Use `dvh` (dynamic viewport height) to account for browser chrome on mobile. The `grid-cols-1 md:grid-cols-2` is already correct.

### 5.4 Pagination — mobile compact controls
**File:** `document-view.tsx:694–714`  
**Problem:** Full pagination control (`50/page · 1/12 ‹ ›`) too wide for mobile toolbar row.  
**Fix:** On mobile, collapse to `Page 1/12` tap target that opens a simple number input popover for direct page jump. Limit selector becomes a `DropdownMenu` option list rather than `<select>` (native selects style inconsistently across Android/iOS).

### 5.5 Edit/Insert dialogs — Textarea on mobile
**File:** `document-view.tsx:1047, 1069`  
**Problem:** Monaco editor in dialogs doesn't work well on mobile — virtual keyboard causes layout shift, touch text selection is unreliable.  
**Fix:** Gate on `isDesktop`:
```tsx
{isDesktop ? (
  <Editor height="100%" ... />
) : (
  <Textarea
    value={editorContent}
    onChange={(e) => setEditorContent(e.target.value)}
    className="flex-1 font-mono text-xs resize-none"
  />
)}
```

### 5.6 Tab bar — overflow fade gradient
**File:** `tab-bar.tsx`  
**Problem:** No visual affordance that tab bar is horizontally scrollable on mobile.  
**Fix:** Add right-edge fade mask when tabs overflow:
```tsx
<div className="relative flex-1 overflow-hidden">
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
  <ScrollArea className="w-full whitespace-nowrap">
    ...
  </ScrollArea>
</div>
```
Always show the fade — it only appears if content actually overflows since `ScrollArea` clips content.

---

## Architecture Notes

**Connection cache data flow:**
```
ExplorerSidebar.loadConnections()
  → onConnectionsLoaded(connections: SavedConnection[])
    → page.tsx populates connectionCacheRef.current
      → action handlers read from cache (O(1) Map lookup)
        → cache.clear() on add/delete/update
```

**Component prop additions:**
- `ExplorerSidebar`: `onConnectionsLoaded?: (connections: SavedConnection[]) => void`, `autoExpandConnectionId?: string`
- `DocumentView`: `isDesktop?: boolean` (or use hook internally)

**New dependencies:**
- `@tanstack/react-virtual` — table row virtualization. Not currently installed. Add to `apps/web/package.json` before Sprint 2.

**No schema changes.** `types.ts` unchanged. API routes unchanged.

---

## Sprint Breakdown

| Sprint | Layer | Key deliverables |
|--------|-------|-----------------|
| 1 | Bug fixes | Password mask, AlertDialogs ×3, checkbox fix, icon unify, locale map |
| 2 | Performance | Connection cache, useMemo ×6, stringify defer, tab close fix, virtualization |
| 3 | UX | Toolbar split, import/export split, sort badge, empty state, auto-expand, run button, tab labels |
| 4a | Accessibility | aria-sort, resize keyboard, tree keyboard nav, dialog close, live region, table labels |
| 4b | Mobile | Card view, bottom sheet filter, form scroll, pagination compact, Monaco→Textarea, tab fade |
