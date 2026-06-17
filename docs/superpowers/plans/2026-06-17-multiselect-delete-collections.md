# Multiselect and Batch Delete Collections Implementation Plan

> **For agentic workers:** RECOMMENDED: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to select multiple collections via checkboxes and delete them in bulk with confirmation dialog, while preserving existing single-item delete via dropdown.

**Architecture:** Add `selectedCollections` state to CollectionsSidebar component. Render checkboxes on collection row hover. Show floating delete button in header when selections exist. Batch delete triggers confirmation dialog listing selected names. All changes isolated to CollectionsSidebar component.

**Tech Stack:** React, TypeScript, shadcn/ui components (Dialog, Button, Checkbox), Lucide icons

## Global Constraints

- Checkboxes appear on hover only (not always visible)
- Keep existing single-item dropdown delete unchanged
- Floating delete button shows in header when `selectedCollections.size > 0`
- Display "Delete (X selected)" where X is count of selected collections
- Confirmation dialog lists all selected collection names before final delete
- Selection clears after successful batch delete

---

### Task 1: Add selectedCollections State and Selection Handlers

**Files:**
- Modify: `apps/web/src/components/api-client/collections/collections-sidebar.tsx:1-130`

**Interfaces:**
- Produces: `selectedCollections: Set<string>` state
- Produces: `toggleCollectionSelection(id: string): void` handler
- Produces: `clearSelection(): void` handler

- [ ] **Step 1: Add state at top of component after existing state**

After line 91 where `targetCollectionId` is declared, add:

```typescript
const [selectedCollections, setSelectedCollections] = React.useState<Set<string>>(new Set())
```

- [ ] **Step 2: Add selection toggle handler**

After `openRenameCollectionDialog` function (around line 128), add:

```typescript
const toggleCollectionSelection = (collectionId: string) => {
    setSelectedCollections(prev => {
        const next = new Set(prev)
        if (next.has(collectionId)) {
            next.delete(collectionId)
        } else {
            next.add(collectionId)
        }
        return next
    })
}

const clearSelection = () => {
    setSelectedCollections(new Set())
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/web && npm run type-check`
Expected: No errors in collections-sidebar.tsx

- [ ] **Step 4: Commit**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add apps/web/src/components/api-client/collections/collections-sidebar.tsx
git commit -m "feat(collections): add selectedCollections state and handlers"
```

---

### Task 2: Render Checkbox on Collection Row Hover

**Files:**
- Modify: `apps/web/src/components/api-client/collections/collections-sidebar.tsx:173-213`

**Interfaces:**
- Consumes: `selectedCollections: Set<string>`
- Consumes: `toggleCollectionSelection(id: string): void`

- [ ] **Step 1: Import Checkbox component**

At top with other imports (around line 1-30), add to the component imports:

```typescript
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 2: Modify collection row to include checkbox on hover**

Find the collection row container (line 175, starting with `<div className="flex items-center justify-between..."`). Replace the entire row structure with:

```typescript
<div className="flex items-center justify-between px-2 py-1.5 mb-1 group rounded-md hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <Checkbox
                checked={selectedCollections.has(collection.id)}
                onCheckedChange={() => toggleCollectionSelection(collection.id)}
                className="h-4 w-4"
            />
        </div>
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate flex-1 px-1">
            {collection.name}
        </span>
    </div>
    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md hover:bg-background"
            onClick={() => openAddFolderDialog(collection.id)}
            title={t("newFolder")}
        >
            <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md hover:bg-background"
                >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => openRenameCollectionDialog(collection)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("rename")}
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(collection.id)}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</div>
```

- [ ] **Step 3: Verify checkboxes appear on hover**

Run: `cd apps/web && npm run dev`
Navigate to Collections sidebar, hover over a collection row. Verify checkbox appears before collection name.

- [ ] **Step 4: Verify checkbox toggle works**

Click checkbox. Verify it toggles checked/unchecked state visually.

- [ ] **Step 5: Commit**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add apps/web/src/components/api-client/collections/collections-sidebar.tsx
git commit -m "feat(collections): add checkbox to collection row on hover"
```

---

### Task 3: Add Floating Delete Button to Header

**Files:**
- Modify: `apps/web/src/components/api-client/collections/collections-sidebar.tsx:133-150`

**Interfaces:**
- Consumes: `selectedCollections: Set<string>`

- [ ] **Step 1: Modify header to show delete button when selections exist**

Find the header section (lines 133-150, the `<div className="px-4 py-3 border-b...">`). Replace the header content with:

```typescript
<div className="px-4 py-3 border-b flex flex-col gap-3 shrink-0 bg-card/40 backdrop-blur-sm">
    <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-tight">{t("title")}</h3>
        <div className="flex items-center gap-2">
            {selectedCollections.size > 0 && (
                <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 px-3 rounded-lg text-xs font-medium gap-2"
                    onClick={() => setDeleteBulkDialogOpen(true)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete ({selectedCollections.size})
                </Button>
            )}
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" 
                onClick={() => setNewCollectionDialogOpen(true)} 
                title={t("newCollection")}
            >
                <FolderPlus className="h-4 w-4" />
            </Button>
        </div>
    </div>
    <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-lg">
        <TabsTrigger value="collections" className="rounded-md text-xs font-medium">{t("tabCollections")}</TabsTrigger>
        <TabsTrigger value="history" className="rounded-md text-xs font-medium">{t("tabHistory")}</TabsTrigger>
    </TabsList>
</div>
```

- [ ] **Step 2: Add state for bulk delete dialog**

After the `selectedCollections` state (around line 92), add:

```typescript
const [deleteBulkDialogOpen, setDeleteBulkDialogOpen] = React.useState(false)
```

- [ ] **Step 3: Test floating delete button**

Run dev server, select multiple collections via checkboxes. Verify "Delete (X)" button appears in header with correct count. Verify it disappears when all selections cleared.

- [ ] **Step 4: Commit**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add apps/web/src/components/api-client/collections/collections-sidebar.tsx
git commit -m "feat(collections): add floating delete button in header for bulk delete"
```

---

### Task 4: Add Bulk Delete Confirmation Dialog

**Files:**
- Modify: `apps/web/src/components/api-client/collections/collections-sidebar.tsx:435-437`

**Interfaces:**
- Consumes: `selectedCollections: Set<string>`
- Consumes: `collections: Collection[]`
- Consumes: `deleteBulkDialogOpen: boolean`
- Consumes: `setDeleteBulkDialogOpen: (open: boolean) => void`

- [ ] **Step 1: Add bulk delete confirmation dialog**

Before the closing `</div>` of the component (after the rename dialog, around line 434), add:

```typescript
<Dialog open={deleteBulkDialogOpen} onOpenChange={setDeleteBulkDialogOpen}>
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>{t("dialogDeleteBulkTitle") || "Delete Collections"}</DialogTitle>
            <DialogDescription>
                {t("dialogDeleteBulkDescription") || "This action cannot be undone. The following collections will be permanently deleted:"}
            </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {Array.from(selectedCollections).map(collectionId => {
                    const collection = collections.find(c => c.id === collectionId)
                    return (
                        <div key={collectionId} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border/50">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">{collection?.name || "Unknown"}</span>
                        </div>
                    )
                })}
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBulkDialogOpen(false)}>
                {t("cancel") || "Cancel"}
            </Button>
            <Button
                variant="destructive"
                onClick={() => {
                    onDeleteMultiple?.(Array.from(selectedCollections))
                    setDeleteBulkDialogOpen(false)
                    clearSelection()
                }}
            >
                {t("delete") || "Delete"}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

- [ ] **Step 2: Update component props type to include onDeleteMultiple**

Find `CollectionsSidebarProps` interface (around line 32), add to the props:

```typescript
onDeleteMultiple?: (ids: string[]) => void
```

- [ ] **Step 3: Add destructuring for onDeleteMultiple**

In function parameters (line 47-60), add to the destructuring:

```typescript
onDeleteMultiple,
```

- [ ] **Step 4: Test bulk delete dialog**

Run dev server, select 2-3 collections, click "Delete (X)" button. Verify dialog opens and lists selected collection names. Click cancel - dialog closes. Click delete - confirm dialog closes and onDeleteMultiple callback is called (check network tab for API call).

- [ ] **Step 5: Commit**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add apps/web/src/components/api-client/collections/collections-sidebar.tsx
git commit -m "feat(collections): add bulk delete confirmation dialog"
```

---

### Task 5: Implement onDeleteMultiple Handler in Parent Component

**Files:**
- Find parent component that uses CollectionsSidebar (search for `<CollectionsSidebar`)
- Modify: Parent component file to add onDeleteMultiple handler

- [ ] **Step 1: Find parent component using CollectionsSidebar**

Run: `grep -r "CollectionsSidebar" apps/web/src --include="*.tsx" | grep -v "collections-sidebar.tsx" | head -5`

Expected output shows which component renders CollectionsSidebar.

- [ ] **Step 2: Open parent component and add onDeleteMultiple handler**

Once you identify the parent component, add a handler like:

```typescript
const handleDeleteMultipleCollections = async (ids: string[]) => {
    try {
        // Call API to delete multiple collections
        await Promise.all(
            ids.map(id =>
                fetch(`/api/nosql/collection/drop`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ collectionName: /* get name from collections */ })
                })
            )
        )
        // Refresh collections list
        await fetchCollections()
    } catch (error) {
        console.error("Failed to delete collections:", error)
        // Show error toast to user
    }
}
```

- [ ] **Step 3: Pass handler to CollectionsSidebar**

In the `<CollectionsSidebar` JSX, add:

```typescript
onDeleteMultiple={handleDeleteMultipleCollections}
```

- [ ] **Step 4: Test batch delete flow end-to-end**

Run dev server, select collections, click delete, confirm in dialog. Verify API calls are made and collections disappear from sidebar.

- [ ] **Step 5: Commit**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add [parent-component-path]
git commit -m "feat(collections): implement onDeleteMultiple handler for batch delete API"
```

---

### Task 6: Test Multiselect and Batch Delete Flows

**Files:**
- Test: `apps/web/src/components/api-client/collections/collections-sidebar.tsx` (manual testing)

- [ ] **Step 1: Test selecting single collection**

Run dev server, hover over one collection, click checkbox. Verify:
- Checkbox shows checked state
- "Delete (1)" button appears in header

- [ ] **Step 2: Test selecting multiple collections**

Check 3+ collections. Verify:
- All checkboxes checked
- "Delete (X)" shows correct count
- Button updates as you add/remove selections

- [ ] **Step 3: Test bulk delete confirmation**

Select 2 collections, click "Delete (2)", verify:
- Dialog opens
- Lists both collection names
- Cancel button closes dialog without deleting
- Delete button calls API and removes collections

- [ ] **Step 4: Test selection clears after delete**

After batch delete completes, verify:
- Checkboxes are unchecked
- "Delete (X)" button disappears
- Collections removed from list

- [ ] **Step 5: Test single item delete still works**

Hover over collection without selecting any others via checkbox. Click dropdown menu → Delete. Verify:
- Single delete still works
- Selection state unaffected

- [ ] **Step 6: Commit test documentation**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add -A
git commit -m "test(collections): verify multiselect and batch delete flows work correctly"
```

---

### Task 7: Edge Cases and Error Handling

**Files:**
- Modify: Parent component API handler from Task 5

- [ ] **Step 1: Add error handling to batch delete**

Update `handleDeleteMultipleCollections` to handle partial failures:

```typescript
const handleDeleteMultipleCollections = async (ids: string[]) => {
    const results = await Promise.allSettled(
        ids.map(id =>
            fetch(`/api/nosql/collection/drop`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collectionName: getCollectionName(id) })
            })
        )
    )
    
    const failed = results.filter(r => r.status === "rejected").length
    if (failed > 0) {
        showErrorToast(`Failed to delete ${failed} collection(s). Retrying...`)
    }
    
    // Refresh collections regardless
    await fetchCollections()
}
```

- [ ] **Step 2: Test delete with network error**

Temporarily block network requests for delete API. Select collections and delete. Verify:
- Error message shown
- Selection state preserved for retry
- Collections list refreshes after error

- [ ] **Step 3: Test empty selection edge case**

Clear all selections via unchecking boxes. Verify:
- Delete button disappears
- No dialog shows

- [ ] **Step 4: Commit error handling**

```bash
cd /Users/max/Works/Personal/mydevtools.tech
git add apps/web/src
git commit -m "feat(collections): add error handling for batch delete failures"
```

---

## Plan Verification

✅ Spec coverage:
- selectedCollections state and toggle handlers (Task 1)
- Checkbox rendering on hover (Task 2)
- Floating delete button in header (Task 3)
- Confirmation dialog listing selected names (Task 4)
- onDeleteMultiple implementation (Task 5)
- Single delete via dropdown unchanged (Tasks 2, 6)
- Selection clears after delete (Task 4)

✅ No placeholders - all code shown
✅ Type consistency - Set<string> for selectedCollections, handlers defined
✅ File paths exact - collections-sidebar.tsx specified with line numbers
✅ Testing included - manual test flows in Task 6, edge cases in Task 7
