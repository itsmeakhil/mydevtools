# Multiselect and Batch Delete Collections

**Date:** 2026-06-17  
**Status:** Design approved  
**Scope:** Add multiselect checkboxes and batch delete for API client collections

## Overview

Add ability to select multiple collections and delete them in bulk. Maintains existing single-item delete via dropdown menu. Checkboxes appear on hover, floating delete button shows when selections exist.

## Components & Changes

### CollectionsSidebar Component
- Add `selectedCollections: Set<string>` state to track checked collection IDs
- Pass `selectedCollections` state and handlers to collection row rendering
- Show/hide delete button in header based on selection count
- Display "X selected" badge next to floating delete button

### Collection Row
- Render checkbox on hover (between collection name and existing action buttons)
- Checkbox toggles collection ID in/out of `selectedCollections` set
- Indeterminate state: not needed (no nested selection)

### Header Controls
- New floating delete button appears when `selectedCollections.size > 0`
- Button text: "Delete (X selected)" where X = count
- Button color: destructive (red/warning)
- Positioned in header alongside existing "New Collection" button

### Delete Confirmation Dialog
- Triggered by floating delete button or individual dropdown
- Lists all selected collection names
- Warning: "This action cannot be undone"
- Buttons: "Cancel" and "Delete" (destructive style)

## Data Flow

**Single Delete (unchanged):**
- User clicks dropdown menu → Delete option → confirmation → `onDelete(id)`

**Batch Delete (new):**
- User checks checkboxes → floating delete button appears
- Click floating delete button → confirmation dialog shows selected names
- Confirm → `onDeleteMultiple(ids: string[])` called with all selected IDs
- Clear selection state after successful delete

## Interface Changes

**CollectionsSidebarProps additions:**
```typescript
onDeleteMultiple?: (ids: string[]) => void
```

**No breaking changes:** Existing `onDelete(id)` callback unchanged.

## UX Flows

### Multiselect Flow
1. Hover over collection → checkbox appears
2. Check 1+ collections → floating delete button appears in header
3. Click "Delete (X selected)" → confirmation dialog
4. Confirm → collections deleted, selection cleared

### Single Delete Flow (unchanged)
1. Hover over collection → action menu appears
2. Click More menu → Delete option
3. Confirm → collection deleted

## Error Handling

- If delete fails mid-batch: show error toast, keep selection state so user can retry
- Invalid collection ID: silently skip (already deleted or doesn't exist)

## Testing

- Select single collection, click floating delete, confirm deletion works
- Select multiple collections, verify count updates, confirm batch delete works
- Verify selection clears after successful delete
- Single dropdown delete still works without affecting multiselect state
- Empty collection list: no checkboxes shown, floating delete hidden

## Styling

- Checkboxes: use existing checkbox component (radix-ui or shadcn/ui)
- Floating delete button: match destructive button style
- Selection badge: use pill/badge component with count
- No new CSS classes needed, use existing utility classes
