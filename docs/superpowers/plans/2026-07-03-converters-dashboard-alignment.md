# Converters Dashboard Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 8 tools in the "Converters" category (`base64`, `url-encode`, `url-parser`, `number-base-converter`, `timestamp-converter`, `unit-converter`, `csv-excel-json`, `image-to-base64`) a page header, icon-chip branding, accent color, ambient background, and mount animation consistent with the dashboard's visual system, without changing tool functionality.

**Architecture:** One shared component, `ToolPageHeader`, lives in `apps/web/src/components/tools/` and gets applied to each of the 8 tool layout files one at a time. Reuses the dashboard's existing `RevealItem` motion helper, `CATEGORY_ACCENT` color map, and `dash-ambient`/`dashboard-grid-bg` CSS utilities as-is — no renaming, no new dependencies. No new Copy/Swap/Dropzone components: all 8 tools already implement copy-to-clipboard, direction-swap (where bidirectional), and drag-and-drop (where file-based) as bespoke per-tool code, and it already works — this plan does not touch it.

**Tech Stack:** Next.js 16 / React 19, Tailwind CSS 3, shadcn/ui ("new-york" style) on Radix primitives, `@tabler/icons-react` (icon source for these 8 tools per `sidebar-data.ts`), `lucide-react` (already used inside converter layouts for non-branding icons), `framer-motion` (via the existing `RevealItem`), `next-intl`.

## Global Constraints

- **Scope is exactly 8 tools**, per `apps/web/src/lib/tool-categories.ts:23-30`: `base64`, `url-encode`, `url-parser`, `number-base-converter`, `timestamp-converter`, `unit-converter`, `csv-excel-json`, `image-to-base64`. `format-converter` is explicitly **excluded** — it is canonically a `Formatters`-category tool (`tool-categories.ts:20`) and is already claimed by the sibling `2026-07-03-formatters-dashboard-alignment.md` plan's own rollout (that plan is now merged to `main` via PR #236).
- **No new functionality.** Every tool already has copy-to-clipboard, and the bidirectional ones (`base64`, `url-encode`, `number-base-converter`, `unit-converter`) already have a working swap control; the file-based ones (`base64`, `url-encode`, `url-parser`, `csv-excel-json`, `image-to-base64`) already have working drag-and-drop. None of that is touched. Reuse each tool's existing `next-intl` keys (`t('title')`, `t('subtitle')`) — do not add new translation keys.
- **Shared component already exists.** The Formatters plan's Task 1 created `apps/web/src/components/tools/tool-page-header.tsx` and it is now merged to `main`, with the interface `{icon: React.ElementType, title: string, description: string, accent?: {bg, text}, className?: string}`. This plan reuses it as-is — **except** `description` must be widened from `string` to `React.ReactNode`, because `timestamp-converter` and `unit-converter` render rich-text descriptions via `t.rich(...)`. This widening is backward-compatible (a `string` is already a valid `ReactNode`), so the 9 existing Formatters callers are unaffected. Task 1 below makes only that one-line change.
- **Accent color:** all 8 tools share one accent — `CATEGORY_ACCENT.Converters` from `apps/web/src/components/dashboard/types.ts:132`: `{ bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' }`. Import this constant; do not hand-roll new color classes.
- **Icons:** per-tool icon comes from `apps/web/src/components/sidebar/data/sidebar-data.ts:216-263` (the source of truth for tool icons), all from `@tabler/icons-react`:
  | Tool | Icon |
  |---|---|
  | base64 | `IconTransform` |
  | url-encode | `IconLink` |
  | url-parser | `IconLink` |
  | number-base-converter | `IconArrowsExchange` |
  | timestamp-converter | `IconCalendarTime` |
  | unit-converter | `IconRuler` |
  | csv-excel-json | `IconFileSpreadsheet` (already imported in this file for its dropzone icon — reuse the existing import, don't duplicate it) |
  | image-to-base64 | `IconPhoto` |
- **No test framework for component rendering exists in this repo.** There is no `@testing-library/react` dependency. Every task below is verified with `npx tsc --noEmit` (types), `npm run lint` (ESLint), and a manual check against the running dev server (`npm run dev`) — not a fabricated render test. Run all three from `apps/web/`.
- **Three corrections to the approved design spec** (`docs/superpowers/specs/2026-07-03-converters-dashboard-alignment-design.md`), found while reading the exact current code and the sibling Formatters plan's own corrections (the two tool families share the same underlying architecture, so the same facts apply):
  1. **No `bg-gradient-to-br from-card to-card/80` / ring-inset / hover-lift on converter Cards.** `apps/web/src/components/ui/card.tsx:5-18` shows the shared `Card` primitive already renders `bg-card` with a themed shadow — every converter `Card` already uses this primitive, so it's already visually aligned with dashboard's *base* card recipe. The extra gradient/ring/hover-lift in `dashboard-tool-card.tsx:98-103` exists specifically to sell a hoverable, clickable link card (`ToolCard`); layering it onto a static I/O panel or toolbar `Card` (not a click target) would be decoration copied from the wrong context.
  2. **No `dash-card-sheen` on converter Cards.** Its hover opacity is gated by `.group:hover .dash-card-sheen::before/::after` (`globals.css:854,873`) — it only ever renders because `dashboard-tool-card.tsx:90` wraps the card in a `<Link className="block group ...">`. Converter panel/toolbar Cards are not links and have no such wrapper; adding the class would be dead CSS with zero visible effect.
  3. **No spacing normalization** (the approved spec's `gap-3 md:gap-4 xl:gap-5` / `p-3 md:p-3.5` rhythm). `base64`, `url-encode`, `url-parser`, and `image-to-base64` are fixed-height (`h-full`, `min-h-0`, `flex-1`) dual-pane layouts where the textarea claims all remaining vertical space; loosening spacing would shrink usable editor height for no visual benefit. The other four (`number-base-converter`, `timestamp-converter`, `unit-converter`, `csv-excel-json`) have no spacing inconsistency worth touching either. The real, correctly-scoped visual delta this plan delivers is the page header, accent icon chip, ambient background, and motion — not a spacing or card-background change.
- **CSS utilities are reused as-is, unrenamed.** `dash-ambient` and `dashboard-grid-bg` (`apps/web/src/app/globals.css:753-765` and `823-838`) are global stylesheet rules — the `dash-` prefix is cosmetic, not a route scope. They're simply imported by class name into converter files.
- **`csv-excel-json` is a special case:** it already uses the older `ToolHeader` component (`apps/web/src/components/tools/tool-header.tsx`), which also renders a pin-to-sidebar (`ToolPinButton`) affordance the other 7 converters don't have. Task 8 swaps `ToolHeader` for `ToolPageHeader` in this file only (the shared `ToolHeader` component itself is untouched, since `http-status-codes` and `email-validator` still use it and are out of scope) and preserves the pin button by rendering `ToolPinButton` directly alongside the new header.

---

## Task 1: Widen `ToolPageHeader`'s `description` prop to `React.ReactNode`

**Files:**
- Modify: `apps/web/src/components/tools/tool-page-header.tsx`

**Interfaces:**
- Produces: `ToolPageHeader({ icon: React.ElementType, title: string, description: React.ReactNode, accent?: { bg: string; text: string }, className?: string })` — same component, one prop type widened.

- [ ] **Step 1: Widen the prop type**

Change:

```tsx
interface ToolPageHeaderProps {
  icon: React.ElementType
  title: string
  description: string
  accent?: { bg: string; text: string }
  className?: string
}
```

to:

```tsx
interface ToolPageHeaderProps {
  icon: React.ElementType
  title: string
  description: React.ReactNode
  accent?: { bg: string; text: string }
  className?: string
}
```

No other line in the file changes — `{description}` is already rendered directly inside a `<p>`, which accepts `ReactNode` today.

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors — this is a type widening, not a behavior change. Confirm no existing caller (the 9 Formatters tools) breaks: they all pass plain strings, which remain valid under `ReactNode`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tools/tool-page-header.tsx
git commit -m "fix: widen ToolPageHeader description prop to ReactNode for converters"
```

---

## Task 2: Apply to Base64 Encoder

**Files:**
- Modify: `apps/web/src/components/base64/base64-layout.tsx`

**Interfaces:**
- Consumes: `ToolPageHeader` (Task 1), `RevealItem` from `apps/web/src/components/dashboard/dashboard-reveal.tsx` (existing), `CATEGORY_ACCENT` from `apps/web/src/components/dashboard/types.ts` (existing), `IconTransform` from `@tabler/icons-react`.

- [ ] **Step 1: Add imports**

After line 21 (`import { SendToMenu } from '@/components/ui/send-to-menu';`), add:

```tsx
import { IconTransform } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
```

- [ ] **Step 2: Replace the header block**

Replace lines 154-189:

```tsx
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 md:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.b64,.base64,.json,.xml,.html,.css,.js,.ts,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconTransform}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      {/* Mobile upload/clear actions */}
      <div className="flex items-center gap-2 shrink-0 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {t('upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.b64,.base64,.json,.xml,.html,.css,.js,.ts,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Run: `cd apps/web && npm run dev`, visit `/app/base64`.
Expected:
- Desktop: an amber icon chip + "Base64 Encoder" title + description now shows above the encode/decode toggle (previously only visible on mobile).
- Mobile (< 768px): Upload/Clear buttons still appear, still work; header still shows above them.
- Dark mode: header and ambient background render correctly.
- Reduce-motion emulation: header appears without a fade-up.
- Encode/decode toggle, swap, copy, download, drag-and-drop file upload all still work exactly as before.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/base64/base64-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Base64 Encoder"
```

---

## Task 3: Apply to URL Encoder

**Files:**
- Modify: `apps/web/src/components/url-encode/url-encode-layout.tsx`

- [ ] **Step 1: Add imports**

After line 21 (`import { SendToMenu } from '@/components/ui/send-to-menu';`), add:

```tsx
import { IconLink } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
```

- [ ] **Step 2: Replace the header block**

Replace lines 134-167:

```tsx
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 md:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.xml,.html,.css,.js,.ts,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconLink}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <div className="flex items-center gap-2 shrink-0 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {t('upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.json,.xml,.html,.css,.js,.ts,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/url-encode`. Same checklist as Task 2 Step 4 (header at all breakpoints, mobile buttons still work, dark mode, reduce-motion, encode/decode/swap/copy/download/drag-drop all unaffected).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/url-encode/url-encode-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to URL Encoder"
```

---

## Task 4: Apply to URL Parser

**Files:**
- Modify: `apps/web/src/components/url-parser/url-parser-layout.tsx`

- [ ] **Step 1: Add imports**

After line 10 (`import { useTranslations } from 'next-intl'`), add:

```tsx
import { IconLink } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
```

- [ ] **Step 2: Replace the header block**

Replace lines 171-204:

```tsx
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 md:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.xml,.html,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconLink}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <div className="flex items-center gap-2 shrink-0 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {t('upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.json,.xml,.html,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/url-parser`. Header at all breakpoints; mobile Upload/Clear unaffected; parsed field copy buttons and JSON download unaffected; drag-drop still works.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/url-parser/url-parser-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to URL Parser"
```

---

## Task 5: Apply to Number Base Converter

**Files:**
- Modify: `apps/web/src/components/number-base-converter/number-base-converter-layout.tsx`

- [ ] **Step 1: Add imports**

After line 25 (the closing `} from '@/lib/number-base';`), add:

```tsx
import { IconArrowsExchange } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
```

- [ ] **Step 2: Replace the header block**

Replace lines 76-81:

```tsx
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconArrowsExchange}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/number-base-converter`. Header at all breakpoints (previously mobile-only); base selects, swap button, copy button all unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/number-base-converter/number-base-converter-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Number Base Converter"
```

---

## Task 6: Apply to Timestamp Converter

**Files:**
- Modify: `apps/web/src/components/timestamp-converter/timestamp-converter-layout.tsx`

- [ ] **Step 1: Add imports**

After line 11 (`import { useTranslations } from 'next-intl';`), add:

```tsx
import { IconCalendarTime } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
```

- [ ] **Step 2: Replace the header block**

Replace lines 57-66:

```tsx
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">
          {t.rich('subtitle', {
            code: (chunks) => <code className="text-foreground">{chunks}</code>,
          })}
        </p>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconCalendarTime}
          title={t('title')}
          description={t.rich('subtitle', {
            code: (chunks) => <code className="text-foreground">{chunks}</code>,
          })}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors. This is the first tool passing a `t.rich(...)` result (a `ReactNode`, not a `string`) as `description` — if this fails to typecheck, confirm Task 1 actually widened `ToolPageHeader`'s `description` prop to `React.ReactNode`.

- [ ] **Step 4: Manual verification**

Visit `/app/timestamp-converter`. Header shows at all breakpoints, with the `<code>ISO-8601</code>` segment of the description still rendered as inline code (not literal angle brackets). "Now" button, per-field copy buttons unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/timestamp-converter/timestamp-converter-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Timestamp Converter"
```

---

## Task 7: Apply to Unit Converter

This is the biggest gap: the tool currently renders no in-page title/description at all (desktop or mobile).

**Files:**
- Modify: `apps/web/src/components/unit-converter/unit-converter-layout.tsx`

- [ ] **Step 1: Add imports**

After line 30 (`import { convert, UNIT_CATEGORIES, getCategoryKeys, getUnitKeys } from '@/lib/unit-converter'`), add:

```tsx
import { IconRuler } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
```

- [ ] **Step 2: Add the header and wrap the existing content in a new outer shell**

Replace line 87:

```tsx
    <div className="max-w-2xl mx-auto space-y-5">
```

with:

```tsx
    <div className="relative space-y-5 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconRuler}
          title={t('title')}
          description={t.rich('subtitle', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <div className="max-w-2xl mx-auto space-y-5">
```

(Line 86, `  return (`, is unchanged — this only replaces the single opening `<div>` line with the block above, which opens two nested divs: the new full-bleed ambient wrapper, and the original centered content wrapper preserved as-is inside it.)

- [ ] **Step 3: Close the new outer wrapper**

Replace the file's closing lines 214-216:

```tsx
      )}
    </div>
  )
}
```

with:

```tsx
      )}
      </div>
    </div>
  )
}
```

(This closes the original `max-w-2xl` div — now indented one level deeper — followed by the new outer wrapper div added in Step 2.)

- [ ] **Step 4: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no unclosed-JSX-tag errors. If there's a mismatch, count divs: the original file had exactly one `return (<div>...</div>)`; after this task it must have `return (<div><div/* ambient */><RevealItem/><div>...(original content)...</div></div>)` — two real `<div>` elements deep at the point Step 3 closes, plus the self-closing ambient div and the `RevealItem` (which is not a div).

- [ ] **Step 5: Manual verification**

Visit `/app/unit-converter`. A page header (icon chip + "Unit Converter" + description with "323 units" / "43 categories" bolded) now renders above the category picker — previously nothing was shown here at any breakpoint. Category combobox, from/to selects, swap button, value input, and copy-result button all unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/unit-converter/unit-converter-layout.tsx
git commit -m "feat: add page header to Unit Converter (previously had none)"
```

---

## Task 8: Apply to CSV / Excel ↔ JSON

**Files:**
- Modify: `apps/web/src/components/csv-excel-json/csv-excel-json-tool.tsx`

**Interfaces:**
- Consumes: `ToolPinButton` from `apps/web/src/components/tools/tool-header.tsx` (existing export, unchanged) to preserve the pin-to-sidebar affordance this tool currently gets from `ToolHeader`.

- [ ] **Step 1: Update imports**

Replace line 20:

```tsx
import { ToolHeader } from "@/components/tools/tool-header";
```

with:

```tsx
import { ToolPinButton } from "@/components/tools/tool-header";
import { ToolPageHeader } from "@/components/tools/tool-page-header";
import { RevealItem } from "@/components/dashboard/dashboard-reveal";
import { CATEGORY_ACCENT } from "@/components/dashboard/types";
```

(`IconFileSpreadsheet` is already imported at line 10 for the dropzone icon — reuse it, don't add a second import.)

- [ ] **Step 2: Replace the header block**

Replace lines 151-159:

```tsx
  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto pb-4">
      <Card className="border-border/60 shadow-sm">
        <ToolHeader
          title={t("title")}
          description={t("subtitle")}
          toolId="csv-excel-json"
        />
        <CardContent className="space-y-6 pt-2">
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-auto pb-4 dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <ToolPageHeader
            icon={IconFileSpreadsheet}
            title={t("title")}
            description={t("subtitle")}
            accent={CATEGORY_ACCENT.Converters}
            className="flex-1"
          />
          <ToolPinButton toolId="csv-excel-json" />
        </div>
      </RevealItem>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-6 pt-2">
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors. If `ToolHeader` shows an unused-import error, confirm Step 1 fully removed it (it's replaced, not kept alongside the new imports).

- [ ] **Step 4: Manual verification**

Visit `/app/csv-excel-json`. Icon-chip header renders above the Card, with the pin (heart) button to its right — pinning/unpinning still adds/removes the tool from the sidebar's pinned section exactly as before. Dropzone, sample-load, format/clear/copy/downloadCsv/downloadXlsx buttons all unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/csv-excel-json/csv-excel-json-tool.tsx
git commit -m "refactor: apply shared ToolPageHeader to CSV/Excel<->JSON, preserve pin button"
```

---

## Task 9: Apply to Image to Base64

**Files:**
- Modify: `apps/web/src/components/image-to-base64/image-to-base64-layout.tsx`

- [ ] **Step 1: Add imports**

After line 19 (`import { useTranslations } from 'next-intl';`), add:

```tsx
import { IconPhoto } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
```

- [ ] **Step 2: Replace the header block**

Replace lines 99-133:

```tsx
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 md:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.type.startsWith('image/')) processFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>
```

with:

```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconPhoto}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      {/* Mobile upload/clear actions */}
      <div className="flex items-center gap-2 shrink-0 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {t('upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.type.startsWith('image/')) processFile(file);
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/image-to-base64`. Header at all breakpoints; Data URI / raw string mode toggle, drag-and-drop image upload, copy, and download all unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/image-to-base64/image-to-base64-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Image to Base64"
```

---

## Task 10: Cross-tool QA pass

**Files:** none (verification only).

- [ ] **Step 1: Full-suite typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: zero errors across the whole app.

- [ ] **Step 2: Visual sweep across all 8 tools**

Run: `cd apps/web && npm run dev`. For each of the 8 routes (`/app/base64`, `/app/url-encode`, `/app/url-parser`, `/app/number-base-converter`, `/app/timestamp-converter`, `/app/unit-converter`, `/app/csv-excel-json`, `/app/image-to-base64`), confirm:
- Desktop page header renders with the amber Converters icon chip, correct per-tool icon, title, and description.
- Light and dark mode both render the ambient background and icon chip with sufficient contrast.
- Mobile width (< 768px): header stays legible; any mobile-only action row (Upload/Clear on `base64`/`url-encode`/`url-parser`/`image-to-base64`) still renders below the header and still works.
- No horizontal scroll or layout overflow introduced by the header/ambient background at any of 375px, 768px, 1024px, 1440px widths.
- `prefers-reduced-motion` (devtools "Emulate CSS media feature") removes the header fade-up on every tool, per `RevealItem`.

- [ ] **Step 3: Regression check on stateful/special-case features**

- `csv-excel-json`: pin/unpin still adds/removes the tool from the sidebar's pinned section (this is the one tool whose header swap could plausibly have dropped functionality).
- `unit-converter`: confirm no unclosed-tag/layout break from the Task 7 wrapper restructuring — category combobox, swap, and copy-result must all still work.
- All 5 file-based tools (`base64`, `url-encode`, `url-parser`, `image-to-base64`, `csv-excel-json`): drag-and-drop still accepts files and still shows the drag-over visual state.
- All 4 bidirectional tools (`base64`, `url-encode`, `number-base-converter`, `unit-converter`): swap still flips direction/state correctly.

- [ ] **Step 4: Commit** (only if Steps 1-3 surfaced fixes; otherwise this task ends at Step 3 with nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in converters dashboard-alignment QA pass"
```
