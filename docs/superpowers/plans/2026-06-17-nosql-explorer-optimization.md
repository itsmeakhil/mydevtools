# NoSQL Explorer Full-Pass Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 25 identified bugs, performance bottlenecks, UX issues, accessibility gaps, and mobile problems in the NoSQL Explorer app across 4 sprints.

**Architecture:** Layer-by-layer: bugs → performance → UX → accessibility → mobile. Each sprint is independently shippable. All changes are confined to `apps/web/src/components/nosql-explorer/` and `apps/web/src/app/app/nosql-explorer/page.tsx`. No API or schema changes.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, `@tabler/icons-react`, `@tanstack/react-virtual` (new), Monaco Editor, next-intl.

## Global Constraints

- All files are under `apps/web/src/` — all paths below are relative to that root
- Use `@tabler/icons-react` for all icons — never `lucide-react`
- Run `pnpm --filter @mydevtools/web lint` after each task — zero new warnings
- Run `pnpm --filter @mydevtools/web build` after each sprint to confirm no build regressions
- No changes to API routes, database schema, or `types.ts` unless explicitly stated
- Do not add comments to code (project convention)
- `isDesktop` = `useMediaQuery("(min-width: 768px)")` — already imported via `@/hooks/use-media-query`

---

## Sprint 1 — Bug Fixes

---

### Task 1: Mask password in sidebar tooltip + unify icon library + fix locale map

**Files:**
- Modify: `components/nosql-explorer/explorer-sidebar.tsx` (line 528)
- Modify: `app/app/nosql-explorer/page.tsx` (line 22)
- Modify: `components/nosql-explorer/connection-form.tsx` (lines 19–61)

**Interfaces:**
- Produces: nothing consumed by other tasks — isolated fixes

- [ ] **Step 1: Confirm current broken behaviors**

  Open the app, navigate to `/app/nosql-explorer`. Add a connection with credentials in the URL (e.g. `mongodb://user:password@host:27017`). Hover over the connection name in the sidebar. Verify the tooltip shows the raw password. This is the bug we're fixing.

- [ ] **Step 2: Fix password mask in sidebar tooltip**

  In `components/nosql-explorer/explorer-sidebar.tsx`, find line 528:
  ```tsx
  <p className="font-mono text-xs">{node.connection.connectionString}</p>
  ```
  Replace with:
  ```tsx
  <p className="font-mono text-xs">{node.connection.connectionString.replace(/:([^@]+)@/, ":****@")}</p>
  ```

- [ ] **Step 3: Replace lucide-react Menu icon with tabler IconMenu2**

  In `app/app/nosql-explorer/page.tsx`:

  Remove from imports (line 22):
  ```tsx
  import { Menu } from "lucide-react";
  ```

  Add `IconMenu2` to the existing tabler import (line 17):
  ```tsx
  import { IconDatabase, IconServer, IconBrandMongodb, IconSearch, IconPlus, IconArrowLeft, IconMenu2 } from "@tabler/icons-react";
  ```

  Find the JSX usage (~line 697):
  ```tsx
  <Menu className="h-4 w-4" />
  ```
  Replace with:
  ```tsx
  <IconMenu2 className="h-4 w-4" />
  ```

- [ ] **Step 4: Replace locale nested ternary with lookup map**

  In `components/nosql-explorer/connection-form.tsx`, replace lines 19–61:

  ```tsx
  import { af, ar, ca, cs as csLocale, da, de, el, enUS, es, faIR, fr as frLocale, ms, nb, nl, pt, zhCN } from "date-fns/locale";
  ```
  Keep this import as-is. Then replace the entire nested ternary block (lines ~31–61) with:
  ```tsx
  const DATE_LOCALE_MAP: Record<string, Locale> = {
      fr: frLocale, es, ar, ca, zh: zhCN, cs: csLocale,
      el, de, da, af, fa: faIR, ms, nb, nl, pt,
  };
  const dateLocale = DATE_LOCALE_MAP[locale] ?? enUS;
  ```
  Remove the old `const dateLocale = locale === "fr" ? frLocale : ...` block entirely.

- [ ] **Step 5: Lint and type-check**

  ```bash
  cd apps/web && pnpm lint
  ```
  Expected: 0 errors, 0 warnings related to changed files.

- [ ] **Step 6: Verify manually**

  1. Hover over a connection with credentials in the URL — tooltip should show `mongodb://user:****@host:27017`
  2. Open browser DevTools → Network. Confirm `lucide-react` is not imported (no `Menu` chunk)
  3. Open connection form — "Last used" timestamps render correctly in non-English locales (switch locale in settings if available)

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/explorer-sidebar.tsx \
           apps/web/src/app/app/nosql-explorer/page.tsx \
           apps/web/src/components/nosql-explorer/connection-form.tsx
  git commit -m "fix(nosql): mask credentials in tooltip, unify icons, simplify locale map"
  ```

---

### Task 2: Replace `confirm()` dialogs with AlertDialog in ExplorerSidebar

**Files:**
- Modify: `components/nosql-explorer/explorer-sidebar.tsx`

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add AlertDialog import**

  In `components/nosql-explorer/explorer-sidebar.tsx`, add to existing shadcn imports:
  ```tsx
  import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  ```

- [ ] **Step 2: Add three dialog state slots**

  Inside `ExplorerSidebar`, after the existing `renameDatabaseDialog` state (around line 61), add:
  ```tsx
  const [deleteConnDialog, setDeleteConnDialog] = useState<{ open: boolean; index: number | null }>({
      open: false, index: null,
  });
  const [dropDbDialog, setDropDbDialog] = useState<{ open: boolean; connIndex: number | null; dbName: string }>({
      open: false, connIndex: null, dbName: "",
  });
  const [dropCollDialog, setDropCollDialog] = useState<{ open: boolean; connIndex: number | null; dbName: string; collectionName: string }>({
      open: false, connIndex: null, dbName: "", collectionName: "",
  });
  ```

- [ ] **Step 3: Replace `confirm()` in handleDeleteConnection**

  Find `handleDeleteConnection` (~line 249). Replace:
  ```tsx
  if (!confirm(t("confirmDeleteConnection", { name: node.connection.name }))) return;
  ```
  With:
  ```tsx
  setDeleteConnDialog({ open: true, index });
  return;
  ```
  Move the rest of the function body into a new `confirmDeleteConnection` async function:
  ```tsx
  const confirmDeleteConnection = async () => {
      const index = deleteConnDialog.index;
      if (index === null) return;
      const node = connections[index];
      if (!user || !node.connection.id) return;
      try {
          await deleteConnection(user.uid, node.connection.id);
          setConnections(prev => prev.filter((_, i) => i !== index));
          toast.success(t("toastDeleted"));
      } catch (error) {
          toast.error(t("toastDeleteConnFail"));
      } finally {
          setDeleteConnDialog({ open: false, index: null });
      }
  };
  ```

- [ ] **Step 4: Replace `confirm()` in handleDropDatabase**

  Find `handleDropDatabase` (~line 263). Replace:
  ```tsx
  if (!confirm(t("confirmDropDb", { name: dbName }))) return;
  ```
  With:
  ```tsx
  setDropDbDialog({ open: true, connIndex, dbName });
  return;
  ```
  Create `confirmDropDatabase`:
  ```tsx
  const confirmDropDatabase = async () => {
      const { connIndex, dbName } = dropDbDialog;
      if (connIndex === null) return;
      const node = connections[connIndex];
      try {
          const res = await backendFetch("/api/nosql/database/drop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ connectionString: node.connection.connectionString, dbName }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success(t("toastDbDropped", { name: dbName }));
          refreshDatabases(connIndex);
      } catch (error: any) {
          toast.error(error.message);
      } finally {
          setDropDbDialog({ open: false, connIndex: null, dbName: "" });
      }
  };
  ```

- [ ] **Step 5: Replace `confirm()` in handleDropCollection**

  Find `handleDropCollection` (~line 283). Replace:
  ```tsx
  if (!confirm(t("confirmDropCollection", { name: collectionName }))) return;
  ```
  With:
  ```tsx
  setDropCollDialog({ open: true, connIndex, dbName, collectionName });
  return;
  ```
  Create `confirmDropCollection`:
  ```tsx
  const confirmDropCollection = async () => {
      const { connIndex, dbName, collectionName } = dropCollDialog;
      if (connIndex === null) return;
      const node = connections[connIndex];
      try {
          const res = await backendFetch("/api/nosql/collection/drop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ connectionString: node.connection.connectionString, dbName, collectionName }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success(t("toastCollectionDropped", { name: collectionName }));
          refreshCollections(connIndex, dbName);
      } catch (error: any) {
          toast.error(error.message);
      } finally {
          setDropCollDialog({ open: false, connIndex: null, dbName: "", collectionName: "" });
      }
  };
  ```

- [ ] **Step 6: Add three AlertDialog renders at bottom of return**

  Before the closing `</div>` of the return, after the existing rename dialogs, add:
  ```tsx
  <AlertDialog open={deleteConnDialog.open} onOpenChange={(open) => setDeleteConnDialog(prev => ({ ...prev, open }))}>
      <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDeleteConnection", { name: deleteConnDialog.index !== null ? connections[deleteConnDialog.index]?.connection.name : "" })}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmDeleteConnectionDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteConnection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("menuDeleteConnection")}
              </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
  </AlertDialog>

  <AlertDialog open={dropDbDialog.open} onOpenChange={(open) => setDropDbDialog(prev => ({ ...prev, open }))}>
      <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDropDb", { name: dropDbDialog.dbName })}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmDropDbDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDropDatabase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("dropDatabase")}
              </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
  </AlertDialog>

  <AlertDialog open={dropCollDialog.open} onOpenChange={(open) => setDropCollDialog(prev => ({ ...prev, open }))}>
      <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDropCollection", { name: dropCollDialog.collectionName })}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmDropCollectionDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDropCollection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("dropCollection")}
              </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
  </AlertDialog>
  ```

- [ ] **Step 7: Add missing i18n keys**

  Open the English locale file (find with `find apps/web/src -name "*.json" | xargs grep -l "NoSqlExplorer" | head -3`). Add under `NoSqlExplorer.sidebar`:
  ```json
  "confirmDeleteConnectionDesc": "This will permanently remove this connection. The database itself will not be affected.",
  "confirmDropDbDesc": "This will permanently delete the database and all its collections. This cannot be undone.",
  "confirmDropCollectionDesc": "This will permanently delete the collection and all its documents. This cannot be undone.",
  "cancel": "Cancel"
  ```
  Repeat for all other locale files (copy English values — translations can be updated later).

- [ ] **Step 8: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```
  Expected: 0 errors.

- [ ] **Step 9: Verify manually**

  1. Right-click a connection → "Delete Connection" — should open shadcn AlertDialog, not browser `confirm()`
  2. Right-click a database → "Drop Database" — same
  3. Right-click a collection → "Drop Collection" — same
  4. Press Escape on any dialog — should dismiss without action

- [ ] **Step 10: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/explorer-sidebar.tsx
  git commit -m "fix(nosql): replace confirm() dialogs with AlertDialog in sidebar"
  ```

---

### Task 3: Fix indeterminate checkbox

**Files:**
- Modify: `components/nosql-explorer/document-view.tsx` (line ~938)

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Locate the broken checkbox**

  In `components/nosql-explorer/document-view.tsx`, find the "Select all" checkbox in the table `<thead>` (~line 930–940):
  ```tsx
  <Checkbox
      checked={isAllSelected}
      onCheckedChange={handleSelectAll}
      aria-label="Select all"
      className={cn(isIndeterminate && "data-[state=checked]:bg-primary/50")}
      data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
  />
  ```

- [ ] **Step 2: Replace with Radix-native indeterminate API**

  Replace the entire `<Checkbox>` with:
  ```tsx
  <Checkbox
      checked={isIndeterminate ? "indeterminate" : isAllSelected}
      onCheckedChange={handleSelectAll}
      aria-label="Select all"
  />
  ```
  Remove the `className` and `data-state` props — Radix handles indeterminate styling natively.

- [ ] **Step 3: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 4: Verify manually**

  1. Open a collection with 5+ documents
  2. Select 2 rows — header checkbox should show dash/indeterminate state
  3. Select all rows — header checkbox should show checked state
  4. Click header checkbox when all selected — should deselect all
  5. Click header checkbox when none selected — should select all

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/document-view.tsx
  git commit -m "fix(nosql): use Radix native indeterminate prop on select-all checkbox"
  ```

---

## Sprint 2 — Performance

---

### Task 4: Install @tanstack/react-virtual and memoize derived values

**Files:**
- Modify: `apps/web/package.json`
- Modify: `components/nosql-explorer/document-view.tsx`

**Interfaces:**
- Produces: `useVirtualizer` available for Task 5

- [ ] **Step 1: Install dependency**

  ```bash
  cd apps/web && pnpm add @tanstack/react-virtual
  ```
  Expected: package appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Add useMemo imports to document-view.tsx**

  In `components/nosql-explorer/document-view.tsx`, ensure `useMemo` is in the React import:
  ```tsx
  import { useState, useEffect, useCallback, useMemo } from "react";
  ```

- [ ] **Step 3: Replace inline derived values with useMemo**

  Find the section around line 576 in `document-view.tsx` where these are declared:
  ```tsx
  const fields = Array.from(new Set(documents.flatMap(Object.keys))).filter(k => k !== "_id");
  const allFields = ["_id", ...fields];
  const totalPages = Math.ceil(total / limit) || 1;
  const isAllSelected = documents.length > 0 && selectedIds.size === documents.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < documents.length;
  const isFilterActive = (() => { ... })();
  ```

  Replace with:
  ```tsx
  const fields = useMemo(
      () => Array.from(new Set(documents.flatMap(Object.keys))).filter(k => k !== "_id"),
      [documents]
  );
  const allFields = useMemo(() => ["_id", ...fields], [fields]);
  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);
  const isAllSelected = useMemo(
      () => documents.length > 0 && selectedIds.size === documents.length,
      [selectedIds, documents]
  );
  const isIndeterminate = useMemo(
      () => selectedIds.size > 0 && selectedIds.size < documents.length,
      [selectedIds, documents]
  );
  const isFilterActive = useMemo(() => {
      try {
          const q = searchQuery?.trim();
          if (!q || q === "{}") return false;
          return Object.keys(JSON.parse(q)).length > 0;
      } catch { return false; }
  }, [searchQuery]);
  ```

- [ ] **Step 4: Defer JSON.stringify off the main thread**

  Find the useEffect around line 422:
  ```tsx
  useEffect(() => {
      setJsonViewContent(JSON.stringify(documents, null, 2));
  }, [documents]);
  ```
  Replace with:
  ```tsx
  useEffect(() => {
      if (documents.length === 0) {
          setJsonViewContent("[]");
          return;
      }
      const id = setTimeout(() => {
          setJsonViewContent(JSON.stringify(documents, null, 2));
      }, 0);
      return () => clearTimeout(id);
  }, [documents]);
  ```

- [ ] **Step 5: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```
  Expected: 0 errors.

- [ ] **Step 6: Verify manually**

  Open a collection with 500+ documents. Switch rapidly between Table/JSON/Tree views. The UI should not freeze. JSON view should render after a brief tick rather than blocking the switch animation.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/package.json apps/web/src/components/nosql-explorer/document-view.tsx
  git commit -m "perf(nosql): install react-virtual, memoize derived values, defer JSON stringify"
  ```

---

### Task 5: Add connection cache to page.tsx

**Files:**
- Modify: `app/app/nosql-explorer/page.tsx`
- Modify: `components/nosql-explorer/explorer-sidebar.tsx`

**Interfaces:**
- Produces: `connectionCacheRef` available to all action handlers in `page.tsx`
- Consumes: `SavedConnection[]` type from `components/nosql-explorer/types.ts`

- [ ] **Step 1: Add cache ref and onConnectionsLoaded prop to ExplorerSidebar**

  In `components/nosql-explorer/explorer-sidebar.tsx`, add `onConnectionsLoaded` to the props interface:
  ```tsx
  interface ExplorerSidebarProps {
      onSelectCollection: (connection: SavedConnection, dbName: string, collectionName: string) => void;
      onRefresh: () => void;
      onAddConnection: () => void;
      onConnectionsLoaded?: (connections: SavedConnection[]) => void;
      width?: number;
  }
  ```

  Destructure it in the component:
  ```tsx
  export function ExplorerSidebar({
      onSelectCollection,
      onRefresh,
      onAddConnection,
      onConnectionsLoaded,
      width = 256,
  }: ExplorerSidebarProps) {
  ```

  In `loadConnections`, after `setConnections(newConnections)` (before the forEach that triggers expand), add:
  ```tsx
  onConnectionsLoaded?.(saved);
  ```

- [ ] **Step 2: Add connectionCacheRef to page.tsx**

  In `app/app/nosql-explorer/page.tsx`, add `useRef` to React imports if not present:
  ```tsx
  import { useState, useEffect, useRef, useCallback } from "react";
  ```
  (It's already there — verify.)

  After the `autoFetchedTabsRef` declaration, add:
  ```tsx
  const connectionCacheRef = useRef<Map<string, import("@/components/nosql-explorer/types").SavedConnection>>(new Map());
  ```

- [ ] **Step 3: Wire onConnectionsLoaded in both ExplorerSidebar usages**

  In `page.tsx`, both the desktop and mobile sidebar renders need the prop. Find both `<ExplorerSidebar` usages and add:
  ```tsx
  onConnectionsLoaded={(conns) => {
      connectionCacheRef.current.clear();
      conns.forEach(c => connectionCacheRef.current.set(c.id, c));
  }}
  ```

- [ ] **Step 4: Create getConnectionForTab helper**

  In `page.tsx`, add this helper after the `connectionCacheRef` declaration:
  ```tsx
  const getConnectionForTab = useCallback(async (tab: import("@/components/nosql-explorer/types").ExplorerTab) => {
      const cached = connectionCacheRef.current.get(tab.connectionId);
      if (cached) return cached;
      if (!user || !encryptionKey) throw new Error("Not authenticated");
      const connections = await getConnections(user.uid, encryptionKey);
      connections.forEach(c => connectionCacheRef.current.set(c.id, c));
      const conn = connections.find(c => c.id === tab.connectionId);
      if (!conn) throw new Error("Connection not found — try refreshing the sidebar");
      return conn;
  }, [user, encryptionKey]);
  ```

- [ ] **Step 5: Replace all getConnections calls in action handlers**

  In `page.tsx`, every handler that calls:
  ```tsx
  const connections = await getConnections(user.uid, encryptionKey);
  const conn = connections.find(c => c.id === activeTab.connectionId);
  if (!conn) throw new Error("Connection not found");
  ```
  Replace with:
  ```tsx
  const conn = await getConnectionForTab(activeTab);
  ```

  Affected handlers: `handleRefresh`, `handleInsert`, `handleUpdate`, `confirmDelete`, `handleBulkDelete`, `handleImport`, `handleLoadSchema`, `handleLoadIndexes`, `handleDropIndex`, `handleCreateIndex`, `performFetch`.

  For `performFetch`, replace:
  ```tsx
  const performFetch = async (tab: ExplorerTab) => {
      if (user && encryptionKey) {
          const connections = await getConnections(user.uid, encryptionKey);
          const conn = connections.find(c => c.id === tab.connectionId);
          if (conn) {
              fetchDocumentsForTab(tab, conn.connectionString);
          }
      }
  };
  ```
  With:
  ```tsx
  const performFetch = async (tab: ExplorerTab) => {
      try {
          const conn = await getConnectionForTab(tab);
          fetchDocumentsForTab(tab, conn.connectionString);
      } catch (e: any) {
          updateTab(tab.id, { loading: false, error: e.message });
      }
  };
  ```

- [ ] **Step 6: Invalidate cache on connection add/delete/update**

  In the `ConnectionForm` `onConnect` callback in `page.tsx` (~line 836):
  ```tsx
  onConnect={async () => {
      setIsConnectionDialogOpen(false);
      setHasConnections(true);
      connectionCacheRef.current.clear();
      toast.success(t("toastConnectionAdded"));
  }}
  ```
  The sidebar will reload and call `onConnectionsLoaded` which repopulates the cache.

- [ ] **Step 7: Lint and type-check**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 8: Verify manually**

  Open browser DevTools → Network tab → filter by `Fetch/XHR`. Open a collection, then edit a document. Before this fix you'd see a connection-fetch request before the PUT. After the fix, no extra requests — only the document update request fires.

- [ ] **Step 9: Commit**

  ```bash
  git add apps/web/src/app/app/nosql-explorer/page.tsx \
           apps/web/src/components/nosql-explorer/explorer-sidebar.tsx
  git commit -m "perf(nosql): cache connection lookup, eliminate redundant storage reads per action"
  ```

---

### Task 6: Fix handleTabClose stale closure + virtualize table rows

**Files:**
- Modify: `app/app/nosql-explorer/page.tsx`
- Modify: `components/nosql-explorer/document-view.tsx`

**Interfaces:**
- Consumes: `@tanstack/react-virtual` installed in Task 4

- [ ] **Step 1: Fix handleTabClose stale closure**

  In `app/app/nosql-explorer/page.tsx`, find `handleTabClose` (~line 249):
  ```tsx
  const handleTabClose = (tabId: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
          const index = tabs.findIndex((t) => t.id === tabId);
          const newActiveTab = tabs[index - 1] || tabs[index + 1];
          setActiveTabId(newActiveTab ? newActiveTab.id : null);
      }
  };
  ```
  Replace with:
  ```tsx
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

- [ ] **Step 2: Add useVirtualizer import to document-view.tsx**

  In `components/nosql-explorer/document-view.tsx`, add:
  ```tsx
  import { useVirtualizer } from "@tanstack/react-virtual";
  import { useRef } from "react";
  ```
  (Add `useRef` to the existing React import if not already present.)

- [ ] **Step 3: Add scroll container ref and virtualizer**

  Inside `DocumentView`, add a ref for the table scroll container and set up the virtualizer. Add after existing state declarations:
  ```tsx
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
      count: documents.length,
      getScrollElement: () => tableContainerRef.current,
      estimateSize: () => 48,
      overscan: 10,
  });
  ```

- [ ] **Step 4: Apply virtualizer to table view render path**

  Find the table view render path (~line 926). The outer wrapper is:
  ```tsx
  <div className="h-full w-full overflow-auto">
      <table className="min-w-full w-max text-sm text-left relative">
  ```
  Add the ref to the outer div:
  ```tsx
  <div ref={tableContainerRef} className="h-full w-full overflow-auto">
      <table
          className="min-w-full w-max text-sm text-left relative"
          aria-label={`${collectionName} documents`}
      >
  ```

  Replace the `<tbody>` content. Find:
  ```tsx
  <tbody>
      {documents.map((doc, index) => {
  ```
  Replace with:
  ```tsx
  <tbody
      style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
  >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const doc = documents[virtualRow.index];
          const index = virtualRow.index;
  ```
  And wrap each `<tr>` to position it:
  ```tsx
  <tr
      key={doc._id}
      data-index={virtualRow.index}
      ref={rowVirtualizer.measureElement}
      style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${virtualRow.start}px)`,
      }}
      className={cn(
          "border-b hover:bg-muted/50 group transition-colors",
          isSelected && "bg-primary/5 hover:bg-primary/10"
      )}
  >
  ```
  Close with `})}` replacing the old `})}`.

- [ ] **Step 5: Add aria-busy to loading skeleton table**

  Find the loading skeleton table (~line 801):
  ```tsx
  <table className="min-w-full text-sm text-left">
  ```
  Replace with:
  ```tsx
  <table aria-busy="true" aria-label="Loading documents" className="min-w-full text-sm text-left">
  ```

- [ ] **Step 6: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 7: Verify manually**

  1. Set limit to 1000 or 2000 in the pagination selector
  2. Load a large collection
  3. Scroll the table — should be smooth with no jank
  4. Close a tab that is NOT the last one — the adjacent tab should become active (not null)
  5. Close the only remaining tab — content area should show empty state

- [ ] **Step 8: Commit**

  ```bash
  git add apps/web/src/app/app/nosql-explorer/page.tsx \
           apps/web/src/components/nosql-explorer/document-view.tsx
  git commit -m "perf(nosql): fix tab close stale closure, virtualize table rows"
  ```

---

## Sprint 3 — UX Improvements

---

### Task 7: Add run button to query input + fix sort badge + fix tab labels

**Files:**
- Modify: `components/nosql-explorer/query-builder.tsx`
- Modify: `components/nosql-explorer/document-view.tsx`
- Modify: `components/nosql-explorer/tab-bar.tsx`

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add run button to QueryBuilder inline input**

  In `components/nosql-explorer/query-builder.tsx`, the `IconPlayerPlay` is already imported. In the absolute-positioned button group at the right edge of the input (~line 334), add a run button as the first item (before the existing clear button):

  Find:
  ```tsx
  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
      {/* Clear button — visible when query is non-empty/non-default */}
      {textQuery && textQuery !== "{}" && (
  ```
  Insert before the clear button block:
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
  <div className="w-[1px] h-4 bg-border" />
  ```

- [ ] **Step 2: Add active sort badge to breadcrumb in DocumentView**

  In `components/nosql-explorer/document-view.tsx`, find the breadcrumb bar (~line 603). It ends with:
  ```tsx
              {!loading && total > 0 && (
                  <>
                      <span className="text-border ml-auto shrink-0">·</span>
                      <span className="shrink-0 ml-1">
                          {t("docsBreadcrumb", { ... })}
                      </span>
                  </>
              )}
          </div>
  ```
  Add after the `total > 0` block (still inside the breadcrumb `<div>`):
  ```tsx
  {sortField && (
      <button
          className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors shrink-0"
          onClick={() => onSortChange("", "asc")}
          title="Clear sort"
      >
          sorted by {sortField} {sortDirection === "asc" ? "↑" : "↓"}
          <IconX className="h-2.5 w-2.5" />
      </button>
  )}
  ```

- [ ] **Step 3: Show db context in tab labels**

  In `components/nosql-explorer/tab-bar.tsx`, find the tab label (~line 61):
  ```tsx
  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
      {tab.collectionName}
  </span>
  ```
  Replace with:
  ```tsx
  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
      <span className="text-muted-foreground">
          {tab.dbName.length > 8 ? `${tab.dbName.slice(0, 8)}…` : tab.dbName}·
      </span>
      {tab.collectionName}
  </span>
  ```

- [ ] **Step 4: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 5: Verify manually**

  1. Query input: type a query and click the `▶` button — results should filter without pressing Enter
  2. Sort a column by clicking its header — a "sorted by fieldName ↑" badge should appear in the breadcrumb bar
  3. Click the badge's `×` — sort should clear
  4. Switch to JSON view — badge should still be visible
  5. Open two tabs from different databases — tab labels should show `dbname·collectionName`

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/query-builder.tsx \
           apps/web/src/components/nosql-explorer/document-view.tsx \
           apps/web/src/components/nosql-explorer/tab-bar.tsx
  git commit -m "ux(nosql): add run button to query, sort badge in breadcrumb, db context in tabs"
  ```

---

### Task 8: Toolbar two-row split + Import/Export buttons + empty state fix + auto-expand

**Files:**
- Modify: `components/nosql-explorer/document-view.tsx`
- Modify: `app/app/nosql-explorer/page.tsx`
- Modify: `components/nosql-explorer/explorer-sidebar.tsx`

**Interfaces:**
- Produces: `onConnectionAdded?: (id: string) => void` on `ExplorerSidebar`

- [ ] **Step 1: Split toolbar into two rows**

  In `components/nosql-explorer/document-view.tsx`, find the toolbar div (~line 627):
  ```tsx
  <div className="min-h-14 border-b flex flex-col md:flex-row items-center justify-between px-4 py-2 md:py-0 gap-2 md:gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      <div className="w-full md:flex-1 md:max-w-2xl">
          <QueryBuilder ... />
      </div>
      <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
          {/* all action controls */}
      </div>
  </div>
  ```
  Replace with:
  ```tsx
  <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      {/* Row 1: Query */}
      <div className="px-4 pt-2 pb-1.5">
          <QueryBuilder
              query={searchQuery}
              onSearch={(q: string) => {
                  setSearchQuery(q);
                  onSearch(q);
              }}
              fields={fields}
              connectionName={connectionName}
              dbName={dbName}
              collectionName={collectionName}
          />
      </div>
      {/* Row 2: Controls */}
      <div className="flex items-center justify-between px-4 pb-2 gap-2 overflow-x-auto no-scrollbar">
          {/* Left: view mode + tree controls */}
          <div className="flex items-center gap-1.5 shrink-0">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs px-2.5">
                          {(() => {
                              const ActiveIcon = viewModeOptions.find(o => o.mode === viewMode)?.icon ?? IconTable;
                              return <ActiveIcon className="h-3.5 w-3.5" />;
                          })()}
                          <span>{viewModeOptions.find(o => o.mode === viewMode)?.label ?? t("table")}</span>
                          <IconChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                      {viewModeOptions.map(({ mode, icon: Icon, label }) => (
                          <DropdownMenuItem
                              key={mode}
                              onClick={() => setViewMode(mode as any)}
                              className={cn("gap-2 text-xs", viewMode === mode && "bg-accent font-medium")}
                          >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
              </DropdownMenu>
              {viewMode === "tree" && (
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(true)} className="h-8 w-8">
                                  <IconArrowsMaximize className="h-3.5 w-3.5" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("expandAll")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(false)} className="h-8 w-8">
                                  <IconArrowsMinimize className="h-3.5 w-3.5" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("collapseAll")}</TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              )}
          </div>

          {/* Center: pagination */}
          <div className="flex items-center gap-0.5 border rounded-md bg-background shadow-sm h-8 px-1 shrink-0">
              <select
                  className="h-full bg-transparent text-[10px] font-mono text-muted-foreground border-none outline-none cursor-pointer"
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
              >
                  {[50, 100, 200, 500, 1000, 2000].map(val => (
                      <option key={val} value={val}>{t("perPage", { n: val })}</option>
                  ))}
              </select>
              <div className="w-[1px] h-3 bg-border mx-0.5" />
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                  <IconChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] font-mono text-muted-foreground px-1 min-w-[50px] text-center">
                  {page}/{totalPages}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
                  <IconChevronRight className="h-3.5 w-3.5" />
              </Button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-8 w-8">
                              <IconRefresh className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("refreshData")}</TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <Button size="sm" onClick={openInsertDialog} className="h-8 px-3 text-xs">
                  <IconPlus className="h-3.5 w-3.5 mr-1" />
                  {t("insert")}
              </Button>
              {onImport && (
                  <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)} className="h-8 px-3 text-xs">
                      <IconUpload className="h-3.5 w-3.5 mr-1" />
                      {t("import")}
                  </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setIsExportDialogOpen(true)} className="h-8 px-3 text-xs">
                  <IconDownload className="h-3.5 w-3.5 mr-1" />
                  {t("export")}
              </Button>
          </div>
      </div>
  </div>
  ```

- [ ] **Step 2: Remove Import/Export chooser state and dialog**

  Remove these from `DocumentView` state:
  ```tsx
  const [isImportExportChooserOpen, setIsImportExportChooserOpen] = useState(false);
  ```
  Remove the `openImportFromChooser` and `openExportFromChooser` helper functions.
  Remove the chooser `<Dialog>` block (~lines 1105–1146).

- [ ] **Step 3: Fix empty state — mobile-aware direction hint**

  In `app/app/nosql-explorer/page.tsx`, add `useMediaQuery` import if not already:
  ```tsx
  import { useMediaQuery } from "@/hooks/use-media-query";
  ```
  It's already declared as `const isDesktop = useMediaQuery(...)` in the component.

  Find the "select collection" empty state (~line 813):
  ```tsx
  <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <IconArrowLeft className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
          <h3 className="text-lg font-semibold text-foreground">{t("selectCollectionTitle")}</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              {t("selectCollectionDesc")}
          </p>
      </div>
  </div>
  ```
  Replace with:
  ```tsx
  <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <IconLayoutSidebar className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
          <h3 className="text-lg font-semibold text-foreground">{t("selectCollectionTitle")}</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              {isDesktop ? t("selectCollectionDesc") : t("selectCollectionDescMobile")}
          </p>
      </div>
      {!isDesktop && (
          <Button variant="outline" size="sm" onClick={() => setMobileSidebarOpen(true)}>
              <IconLayoutSidebar className="w-4 h-4 mr-2" />
              {t("openSidebar")}
          </Button>
      )}
  </div>
  ```
  Add `IconLayoutSidebar` to the tabler import. Add i18n keys `selectCollectionDescMobile` and `openSidebar`.

- [ ] **Step 4: Auto-expand newly added connection in sidebar**

  In `components/nosql-explorer/explorer-sidebar.tsx`, add prop:
  ```tsx
  interface ExplorerSidebarProps {
      // ... existing props
      autoExpandConnectionId?: string;
  }
  ```
  Destructure it:
  ```tsx
  export function ExplorerSidebar({ ..., autoExpandConnectionId }: ExplorerSidebarProps) {
  ```
  In `loadConnections`, after `setConnections(newConnections)` and the forEach for expanded connections, add:
  ```tsx
  if (autoExpandConnectionId) {
      const autoIdx = newConnections.findIndex(n => n.connection.id === autoExpandConnectionId);
      if (autoIdx !== -1 && !newConnections[autoIdx].isExpanded) {
          refreshDatabases(autoIdx, newConnections[autoIdx].connection);
          setConnections(prev => prev.map((c, i) => i === autoIdx ? { ...c, isExpanded: true } : c));
      }
  }
  ```

  In `page.tsx`, add state:
  ```tsx
  const [autoExpandConnectionId, setAutoExpandConnectionId] = useState<string | undefined>(undefined);
  ```
  Update `ConnectionForm.onConnect` callback to pass the new id. First, update `connection-service.ts`'s `saveConnection` return type to include the new `id` (check the existing return value — if it already returns it, pass it through the callback chain). If `saveConnection` returns the saved connection, update the callback in `page.tsx`:
  ```tsx
  onConnect={async (newId?: string) => {
      setIsConnectionDialogOpen(false);
      setHasConnections(true);
      connectionCacheRef.current.clear();
      if (newId) setAutoExpandConnectionId(newId);
      toast.success(t("toastConnectionAdded"));
  }}
  ```
  Pass `autoExpandConnectionId` to both `<ExplorerSidebar>` usages.

- [ ] **Step 5: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 6: Verify manually**

  1. Toolbar should show query on row 1, controls on row 2 — no labels hidden with `hidden sm:inline`
  2. Separate Import and Export buttons visible in toolbar
  3. No "Import/Export" chooser dialog appears
  4. On mobile: empty state shows "Open the sidebar" button that opens the sheet
  5. Add a new connection — sidebar should auto-expand it showing its databases

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/document-view.tsx \
           apps/web/src/app/app/nosql-explorer/page.tsx \
           apps/web/src/components/nosql-explorer/explorer-sidebar.tsx
  git commit -m "ux(nosql): two-row toolbar, split import/export, mobile empty state, auto-expand connection"
  ```

---

## Sprint 4a — Accessibility

---

### Task 9: Table accessibility — aria-sort, column resize keyboard, live region, table labels

**Files:**
- Modify: `components/nosql-explorer/document-view.tsx`

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add aria-sort to sortable column headers**

  In `components/nosql-explorer/document-view.tsx`, find the `<th>` elements in the table header map (~line 943):
  ```tsx
  <th
      key={key}
      className="px-4 py-3 whitespace-nowrap font-medium sticky top-0 z-20 bg-muted pr-6 group/th hover:bg-muted/80 transition-colors border-r"
      style={{ ... }}
  >
      <div className="flex items-center gap-1 cursor-pointer truncate" onClick={() => handleSort(key)}>
          {key}
          <span ...>{sortField === key ? ... : '↕'}</span>
      </div>
      <div className="absolute right-0 ..." onMouseDown={(e) => handleColumnResize(key, e)} />
  </th>
  ```
  Replace with:
  ```tsx
  <th
      key={key}
      aria-sort={sortField === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className="px-4 py-3 whitespace-nowrap font-medium sticky top-0 z-20 bg-muted pr-6 group/th hover:bg-muted/80 transition-colors border-r"
      style={{ ... }}
  >
      <button
          className="flex items-center gap-1 truncate w-full text-left"
          onClick={() => handleSort(key)}
      >
          {key}
          <span aria-hidden="true" className={cn("text-muted-foreground w-3 h-3 flex items-center justify-center text-[10px]", sortField !== key && "opacity-0 group-hover/th:opacity-50")}>
              {sortField === key ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
          </span>
      </button>
      <div
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-primary/30 cursor-col-resize z-50 flex items-center justify-center after:content-[''] after:w-[1px] after:h-4 after:bg-border group-hover/th:after:bg-muted-foreground/30"
          onMouseDown={(e) => handleColumnResize(key, e)}
          onKeyDown={(e) => {
              if (e.key === "ArrowRight") setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, (prev[key] ?? 300) + 10) }));
              if (e.key === "ArrowLeft") setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, (prev[key] ?? 300) - 10) }));
          }}
      />
  </th>
  ```

- [ ] **Step 2: Add aria-label to main table**

  Find the table view container (~line 928):
  ```tsx
  <table className="min-w-full w-max text-sm text-left relative">
  ```
  Already updated in Task 6 — confirm it has `aria-label={`${collectionName} documents`}`. If not, add it.

- [ ] **Step 3: Add live region to bulk action bar**

  Find the bulk action bar (~line 750):
  ```tsx
  <span className="text-sm font-medium text-primary">
      {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} selected
  </span>
  ```
  Replace with:
  ```tsx
  <span aria-live="polite" aria-atomic="true" className="text-sm font-medium text-primary">
      {selectedIds.size} document{selectedIds.size > 1 ? "s" : ""} selected
  </span>
  ```

- [ ] **Step 4: Fix advanced editor dialog close button**

  In `components/nosql-explorer/query-builder.tsx`, find (~line 546):
  ```tsx
  <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0 [&>button]:hidden">
  ```
  Replace with:
  ```tsx
  <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0 [&>button]:sr-only">
  ```
  This keeps the default Radix close button accessible to screen readers (`sr-only`) while keeping it visually hidden. The custom `×` button in the header remains the visible control.

- [ ] **Step 5: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 6: Verify manually**

  1. Tab into table headers — each `<th>` sort button should be focusable with keyboard
  2. Focus a column resize handle, press `ArrowRight`/`ArrowLeft` — column should resize
  3. Select 3 rows — browser accessibility inspector should show live region announcing "3 documents selected"
  4. Sort by a column — `aria-sort` attribute should be set on the sorted `<th>` (inspect in DevTools Elements panel)
  5. Open advanced query editor — press Escape — dialog should close (Radix native behavior preserved)

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/document-view.tsx \
           apps/web/src/components/nosql-explorer/query-builder.tsx
  git commit -m "a11y(nosql): aria-sort on columns, keyboard resize, live region, dialog close fix"
  ```

---

### Task 10: Sidebar tree keyboard navigation

**Files:**
- Modify: `components/nosql-explorer/explorer-sidebar.tsx`

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add focusedNodeKey state and tree container ref**

  In `components/nosql-explorer/explorer-sidebar.tsx`, add inside `ExplorerSidebar`:
  ```tsx
  const treeRef = useRef<HTMLDivElement>(null);
  ```
  Add `useRef` to the React import if not already present.

- [ ] **Step 2: Add role="tree" to the tree container**

  Find the connections list container (~line 436):
  ```tsx
  <div ref={nosqlScrollRef} className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-1">
  ```
  Add `role` to the inner div:
  ```tsx
  <div ref={nosqlScrollRef} className="flex-1 overflow-y-auto">
      <div ref={treeRef} role="tree" aria-label="Database connections" className="p-2 space-y-1">
  ```

- [ ] **Step 3: Add role="treeitem" and aria-expanded to connection buttons**

  Find the connection button (~line 470):
  ```tsx
  <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 px-2 font-normal hover:bg-muted/50 relative h-9 md:h-8"
      onClick={() => toggleConnection(index)}
  >
  ```
  Add:
  ```tsx
  <Button
      role="treeitem"
      aria-expanded={node.isExpanded}
      aria-level={1}
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 px-2 font-normal hover:bg-muted/50 relative h-9 md:h-8"
      onClick={() => toggleConnection(index)}
  >
  ```

- [ ] **Step 4: Add role="treeitem" to database buttons**

  Find the database button (~line 571):
  ```tsx
  <Button
      variant="ghost"
      size="sm"
      className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
      onClick={() => toggleDatabase(index, db.name)}
  >
  ```
  Add:
  ```tsx
  <Button
      role="treeitem"
      aria-expanded={node.expandedDbs.has(db.name)}
      aria-level={2}
      variant="ghost"
      size="sm"
      className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
      onClick={() => toggleDatabase(index, db.name)}
  >
  ```

- [ ] **Step 5: Add role="treeitem" to collection buttons**

  Find the collection button (~line 635):
  ```tsx
  <Button
      variant="ghost"
      size="sm"
      className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
      onClick={() => onSelectCollection(node.connection, db.name, col.name)}
  >
  ```
  Add:
  ```tsx
  <Button
      role="treeitem"
      aria-level={3}
      aria-selected={false}
      variant="ghost"
      size="sm"
      className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
      onClick={() => onSelectCollection(node.connection, db.name, col.name)}
  >
  ```

- [ ] **Step 6: Add keyboard handler on tree container**

  Add `onKeyDown` to the tree container div:
  ```tsx
  <div
      ref={treeRef}
      role="tree"
      aria-label="Database connections"
      className="p-2 space-y-1"
      onKeyDown={(e) => {
          if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
          e.preventDefault();
          const focusable = Array.from(
              treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []
          );
          const active = document.activeElement as HTMLElement;
          const idx = focusable.indexOf(active);
          if (idx === -1) { focusable[0]?.focus(); return; }

          if (e.key === "ArrowDown") focusable[idx + 1]?.focus();
          if (e.key === "ArrowUp") focusable[idx - 1]?.focus();
          if (e.key === "ArrowRight") {
              const expanded = active.getAttribute("aria-expanded");
              if (expanded === "false") active.click();
              else focusable[idx + 1]?.focus();
          }
          if (e.key === "ArrowLeft") {
              const expanded = active.getAttribute("aria-expanded");
              if (expanded === "true") active.click();
              else {
                  const level = Number(active.getAttribute("aria-level") ?? 1);
                  if (level > 1) {
                      const parentLevel = String(level - 1);
                      for (let i = idx - 1; i >= 0; i--) {
                          if (focusable[i].getAttribute("aria-level") === parentLevel) {
                              focusable[i].focus();
                              break;
                          }
                      }
                  }
              }
          }
      }}
  >
  ```

- [ ] **Step 7: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 8: Verify manually**

  1. Click any connection in sidebar, then use `ArrowDown`/`ArrowUp` — focus should move between tree nodes
  2. Focus a collapsed connection, press `ArrowRight` — should expand showing databases
  3. Focus an expanded connection, press `ArrowLeft` — should collapse
  4. Focus a database node, press `ArrowLeft` — should move focus to parent connection
  5. Tab through sidebar normally — existing tab behavior unchanged

- [ ] **Step 9: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/explorer-sidebar.tsx
  git commit -m "a11y(nosql): add ARIA tree role and keyboard navigation to sidebar"
  ```

---

## Sprint 4b — Mobile Responsiveness

---

### Task 11: Mobile card view for documents + tab bar fade gradient

**Files:**
- Modify: `components/nosql-explorer/document-view.tsx`
- Modify: `components/nosql-explorer/tab-bar.tsx`

**Interfaces:**
- Consumes: `isDesktop` from `useMediaQuery("(min-width: 768px)")` — add inside DocumentView

- [ ] **Step 1: Add useMediaQuery inside DocumentView**

  In `components/nosql-explorer/document-view.tsx`, add import:
  ```tsx
  import { useMediaQuery } from "@/hooks/use-media-query";
  ```
  Inside the component, add:
  ```tsx
  const isDesktop = useMediaQuery("(min-width: 768px)");
  ```

- [ ] **Step 2: Add mobile card view state**

  Add state for per-card expand:
  ```tsx
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  ```

- [ ] **Step 3: Add mobile card render path**

  In the table view render path (the `else` branch at the bottom of the content area), wrap with:
  ```tsx
  ) : isDesktop ? (
      /* Existing table view — unchanged */
      <div ref={tableContainerRef} className="h-full w-full overflow-auto">
          ...existing table...
      </div>
  ) : (
      /* Mobile card view */
      <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
              {documents.map((doc) => {
                  const isSelected = selectedIds.has(doc._id);
                  const isExpanded = expandedCardIds.has(doc._id);
                  const visibleFields = allFields.filter(k => k !== "_id").slice(0, 5);
                  const hiddenCount = allFields.filter(k => k !== "_id").length - 5;
                  return (
                      <div
                          key={doc._id}
                          className={cn(
                              "border rounded-lg p-3 space-y-2 bg-card transition-colors",
                              isSelected && "border-primary bg-primary/5"
                          )}
                      >
                          <div className="flex items-center gap-2">
                              {showSelectMode && (
                                  <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleSelectRow(doc._id)}
                                      aria-label="Select document"
                                  />
                              )}
                              <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">
                                  {String(doc._id)}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyDocument(doc)}>
                                      <IconCopy className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(doc)}>
                                      <IconPencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(doc._id)}>
                                      <IconTrash className="h-3 w-3" />
                                  </Button>
                              </div>
                          </div>
                          <div className="space-y-1">
                              {(isExpanded ? allFields.filter(k => k !== "_id") : visibleFields).map(key => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                      <span className="text-muted-foreground w-24 shrink-0 truncate font-mono">{key}</span>
                                      <div className="flex-1 min-w-0">
                                          <CellValue value={doc[key]} onViewClick={handleViewValue} />
                                      </div>
                                  </div>
                              ))}
                              {hiddenCount > 0 && (
                                  <button
                                      className="text-[10px] text-primary hover:underline mt-1"
                                      onClick={() => {
                                          const next = new Set(expandedCardIds);
                                          if (isExpanded) next.delete(doc._id); else next.add(doc._id);
                                          setExpandedCardIds(next);
                                      }}
                                  >
                                      {isExpanded ? "show less" : `+${hiddenCount} more fields`}
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </ScrollArea>
  ```

- [ ] **Step 4: Add tab bar overflow fade gradient**

  In `components/nosql-explorer/tab-bar.tsx`, find the return's outer div:
  ```tsx
  <div className="flex items-center border-b bg-muted/10">
      <ScrollArea className="flex-1 w-full whitespace-nowrap">
  ```
  Wrap ScrollArea in a relative container with fade:
  ```tsx
  <div className="flex items-center border-b bg-muted/10">
      <div className="relative flex-1 min-w-0">
          <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex items-center px-1">
                  {safeTabs.map(...)}
              </div>
              <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div
              className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
              style={{ background: "linear-gradient(to right, transparent, var(--background))" }}
          />
      </div>
      {tabs.length > 0 && onCloseAll && (
          <div className="border-l px-2 shrink-0">
              ...
          </div>
      )}
  </div>
  ```

- [ ] **Step 5: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 6: Verify manually (requires mobile viewport)**

  1. Open Chrome DevTools → toggle device toolbar → select iPhone 14 viewport
  2. Navigate to nosql-explorer, open a collection
  3. Should show card view, not horizontal-scroll table
  4. Each card shows `_id` + top 5 fields + action buttons
  5. "+N more fields" link expands card
  6. Tab bar with 4+ tabs: right edge should have a fade gradient indicating more tabs exist

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/document-view.tsx \
           apps/web/src/components/nosql-explorer/tab-bar.tsx
  git commit -m "mobile(nosql): card view for documents on small screens, tab bar fade gradient"
  ```

---

### Task 12: Mobile query builder sheet + connection form scroll + Monaco → Textarea on mobile

**Files:**
- Modify: `components/nosql-explorer/query-builder.tsx`
- Modify: `components/nosql-explorer/connection-form.tsx`
- Modify: `components/nosql-explorer/document-view.tsx`

**Interfaces:**
- Consumes: `useMediaQuery` from `@/hooks/use-media-query`

- [ ] **Step 1: Fix query builder popover width overflow**

  In `components/nosql-explorer/query-builder.tsx`, find:
  ```tsx
  <PopoverContent align="end" className="w-[600px] p-4">
  ```
  Replace with:
  ```tsx
  <PopoverContent align="end" className="w-[min(600px,calc(100vw-2rem))] p-4">
  ```

- [ ] **Step 2: Add useMediaQuery to QueryBuilder**

  In `components/nosql-explorer/query-builder.tsx`:
  ```tsx
  import { useMediaQuery } from "@/hooks/use-media-query";
  ```
  Inside the component:
  ```tsx
  const isDesktop = useMediaQuery("(min-width: 768px)");
  ```

- [ ] **Step 3: Replace filter Popover with Sheet on mobile**

  Add Sheet import:
  ```tsx
  import { Sheet, SheetContent, SheetTitle, SheetHeader } from "@/components/ui/sheet";
  ```
  Add state for mobile sheet:
  ```tsx
  const [mobileBuilderOpen, setMobileBuilderOpen] = useState(false);
  ```

  The filter builder button currently opens `setBuilderOpen(true)`. Update to:
  ```tsx
  onClick={isDesktop ? openBuilder : () => { openBuilder(); setMobileBuilderOpen(true); }}
  ```

  After the existing Popover, add a mobile Sheet:
  ```tsx
  {!isDesktop && (
      <Sheet open={mobileBuilderOpen} onOpenChange={setMobileBuilderOpen}>
          <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
              <SheetHeader className="px-4 pt-4 pb-2 border-b">
                  <SheetTitle className="text-sm font-medium">{t("filterRules")}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4 py-2">
                  <div className="space-y-2">
                      {rules.length === 0 && (
                          <div className="text-center text-xs text-muted-foreground py-4">{t("noFilters")}</div>
                      )}
                      {rules.map((rule, index) => (
                          <div key={rule.id} className="flex flex-col gap-2 p-3 border rounded-md bg-card/50">
                              <div className="text-[10px] font-mono text-muted-foreground uppercase">{index === 0 ? t("where") : t("and")}</div>
                              <div className="grid grid-cols-2 gap-2">
                                  <Select value={rule.field} onValueChange={(val) => updateRule(rule.id, { field: val })}>
                                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("fieldPlaceholder")} /></SelectTrigger>
                                      <SelectContent>{fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={rule.operator} onValueChange={(val) => updateRule(rule.id, { operator: val as FilterOperator })}>
                                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("opPlaceholder")} /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="$eq">=</SelectItem>
                                          <SelectItem value="$ne">!=</SelectItem>
                                          <SelectItem value="$gt">&gt;</SelectItem>
                                          <SelectItem value="$gte">&gt;=</SelectItem>
                                          <SelectItem value="$lt">&lt;</SelectItem>
                                          <SelectItem value="$lte">&lt;=</SelectItem>
                                          <SelectItem value="$regex">{t("opRegex")}</SelectItem>
                                          <SelectItem value="$in">{t("opIn")}</SelectItem>
                                          <SelectItem value="$nin">{t("opNin")}</SelectItem>
                                          <SelectItem value="$exists">{t("opExists")}</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <Input value={rule.value} onChange={(e) => updateRule(rule.id, { value: e.target.value })} className="h-9 text-xs" placeholder={t("valuePlaceholder")} />
                              <Button variant="ghost" size="sm" className="text-destructive self-start h-7 text-xs" onClick={() => removeRule(rule.id)}>
                                  <IconTrash className="h-3 w-3 mr-1" /> Remove
                              </Button>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
              <div className="flex gap-2 p-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={addRule}><IconPlus className="h-3.5 w-3.5 mr-1" />{t("addRule")}</Button>
                  <Button className="flex-1" onClick={() => { handleBuilderSearch(); setMobileBuilderOpen(false); }}><IconCheck className="h-3.5 w-3.5 mr-1" />{t("applyFilters")}</Button>
              </div>
          </SheetContent>
      </Sheet>
  )}
  ```

- [ ] **Step 4: Fix connection form scroll on mobile**

  In `components/nosql-explorer/connection-form.tsx`, find (~line 167):
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 max-h-[70vh] overflow-hidden">
  ```
  Replace with:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 max-h-[85dvh] overflow-y-auto">
  ```

- [ ] **Step 5: Monaco → Textarea on mobile in edit/insert dialogs**

  In `components/nosql-explorer/document-view.tsx`, ensure `useMediaQuery` import and `isDesktop` are present (added in Task 11).

  Find the edit dialog Monaco editor (~line 1047):
  ```tsx
  <div className="flex-1 border rounded-md overflow-hidden">
      <Editor
          height="100%"
          defaultLanguage="json"
          value={editorContent}
          onChange={(v) => setEditorContent(v || "")}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
      />
  </div>
  ```
  Replace with:
  ```tsx
  <div className="flex-1 border rounded-md overflow-hidden">
      {isDesktop ? (
          <Editor
              height="100%"
              defaultLanguage="json"
              value={editorContent}
              onChange={(v) => setEditorContent(v || "")}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
      ) : (
          <Textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="h-full w-full resize-none font-mono text-xs rounded-none border-0 focus-visible:ring-0"
              spellCheck={false}
          />
      )}
  </div>
  ```
  Apply the same pattern to the insert dialog (~line 1069) and view dialog (~line 1086, but read-only — use `readOnly` on Textarea there):
  ```tsx
  <Textarea
      value={viewValue}
      readOnly
      className="h-full w-full resize-none font-mono text-xs rounded-none border-0 focus-visible:ring-0"
      spellCheck={false}
  />
  ```

  Add `Textarea` import if not present:
  ```tsx
  import { Textarea } from "@/components/ui/textarea";
  ```

- [ ] **Step 6: Lint**

  ```bash
  cd apps/web && pnpm lint
  ```

- [ ] **Step 7: Verify manually (mobile viewport)**

  1. On mobile: click filter icon in query builder — bottom sheet opens instead of popover
  2. Connection form on small phone: form scrolls rather than clipping
  3. On mobile: click "Insert Document" or "Edit" — dialog shows plain Textarea, not Monaco editor
  4. Virtual keyboard appears without breaking dialog layout
  5. On desktop: all dialogs still use Monaco editor

- [ ] **Step 8: Build check for entire sprint**

  ```bash
  cd apps/web && pnpm build
  ```
  Expected: build completes with no errors.

- [ ] **Step 9: Commit**

  ```bash
  git add apps/web/src/components/nosql-explorer/query-builder.tsx \
           apps/web/src/components/nosql-explorer/connection-form.tsx \
           apps/web/src/components/nosql-explorer/document-view.tsx
  git commit -m "mobile(nosql): bottom sheet filter, form scroll fix, Textarea fallback for Monaco"
  ```

---

## Self-Review Checklist

### Spec coverage

| Spec item | Task |
|-----------|------|
| 1.1 Password leak in sidebar tooltip | Task 1 ✓ |
| 1.2 `confirm()` → AlertDialog ×3 | Task 2 ✓ |
| 1.3 Indeterminate checkbox | Task 3 ✓ |
| 1.4 Mixed icon library | Task 1 ✓ |
| 1.5 Locale lookup ternary | Task 1 ✓ |
| 2.1 Connection cache | Task 5 ✓ |
| 2.2 Memoize derived values | Task 4 ✓ |
| 2.3 JSON stringify defer | Task 4 ✓ |
| 2.4 handleTabClose stale closure | Task 6 ✓ |
| 2.5 Virtualize table rows | Task 6 ✓ |
| 3.1 Toolbar two-row split | Task 8 ✓ |
| 3.2 Import/Export split buttons | Task 8 ✓ |
| 3.3 Sort badge in breadcrumb | Task 7 ✓ |
| 3.4 Empty state mobile fix | Task 8 ✓ |
| 3.5 Auto-expand new connection | Task 8 ✓ |
| 3.6 Run button in query input | Task 7 ✓ |
| 3.7 Tab labels with db context | Task 7 ✓ |
| 4.1 aria-sort on column headers | Task 9 ✓ |
| 4.2 Column resize keyboard | Task 9 ✓ |
| 4.3 Sidebar tree keyboard nav | Task 10 ✓ |
| 4.4 Advanced editor dialog close | Task 9 ✓ |
| 4.5 Bulk action live region | Task 9 ✓ |
| 4.6 Table aria-label + loading | Task 6 + Task 9 ✓ |
| 5.1 Mobile card view | Task 11 ✓ |
| 5.2 Query builder mobile sheet | Task 12 ✓ |
| 5.3 Connection form scroll | Task 12 ✓ |
| 5.4 Pagination compact mobile | ⚠ Not implemented — deferred (requires deeper toolbar restructure already done in Task 8; the two-row layout partially resolves this) |
| 5.5 Monaco → Textarea mobile | Task 12 ✓ |
| 5.6 Tab bar fade gradient | Task 11 ✓ |

**Deferred:** Spec item 5.4 (pagination compact on mobile with number input popover) is intentionally omitted from this plan. The two-row toolbar split in Task 8 already gives pagination its own row with adequate space. A direct page-jump input can be a follow-up if users report friction.

### No placeholders

Scanned — no TBD/TODO/placeholder strings found.

### Type consistency

- `SavedConnection` used consistently — imported from `@/components/nosql-explorer/types`
- `ExplorerTab` used consistently — same import
- `onConnectionsLoaded?: (connections: SavedConnection[]) => void` defined in Task 5 Step 1, consumed in Task 5 Step 3
- `autoExpandConnectionId?: string` defined in Task 8 Step 4, consumed in Task 8 Step 4
- `getConnectionForTab` defined in Task 5 Step 4, used in Steps 5–6
- `connectionCacheRef` typed as `Map<string, SavedConnection>`, consumed consistently
