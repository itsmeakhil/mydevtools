# Formatters Dashboard Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 9 tools in the "Formatters" category (json-formatter, json-schema-generator, sql-formatter, graphql-formatter, yaml-formatter, markdown-preview-html, format-converter, diff-checker, regex-tester) a page header, icon-chip branding, accent color, ambient background, and mount animation consistent with the dashboard's visual system, without changing tool functionality.

**Architecture:** Three small shared components (`ToolPageHeader`, `ToolMobileTabs`, `CopyIconButton`) live in a new `apps/web/src/components/tools/` folder and get applied to each of the 9 tool layout files one at a time, pilot-tested against the hardest case (JSON formatter) first. Reuses the dashboard's existing `RevealItem` motion helper, `CATEGORY_ACCENT` color map, and `dash-ambient`/`dashboard-grid-bg` CSS utilities as-is — no renaming, no new dependencies.

**Tech Stack:** Next.js 16 / React 19, Tailwind CSS 3, shadcn/ui ("new-york" style) on Radix primitives, `@tabler/icons-react` (icon source for these 9 tools per `sidebar-data.ts`), `lucide-react` (already used inside formatter layouts for non-branding icons), `framer-motion` (via the existing `RevealItem`), `next-intl`.

## Global Constraints

- **Scope is exactly 9 tools**, per `apps/web/src/lib/tool-categories.ts:14-22`: `json-formatter`, `json-schema-generator`, `sql-formatter`, `graphql-formatter`, `yaml-formatter`, `markdown-preview-html`, `format-converter`, `diff-checker`, `regex-tester`. No converters, no other categories.
- **No new functionality.** No new save/load, no history, no new action buttons beyond what a tool already has. Reuse each tool's existing `next-intl` keys (`t('title')`, and `t('subtitle')` or `t('description')` — whichever the tool already defines) — do not add new translation keys.
- **Accent color:** all 9 tools share one accent — `CATEGORY_ACCENT.Formatters` from `apps/web/src/components/dashboard/types.ts:131`: `{ bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' }`. Import this constant; do not hand-roll new color classes.
- **Icons:** per-tool icon comes from `apps/web/src/components/sidebar/data/sidebar-data.ts:152-210` (the actual source of truth for tool icons), all from `@tabler/icons-react`:
  | Tool | Icon |
  |---|---|
  | json-formatter | `IconJson` |
  | json-schema-generator | `IconBraces` |
  | sql-formatter | `IconSql` |
  | graphql-formatter | `IconBrandGraphql` |
  | yaml-formatter | `IconFileCode` |
  | markdown-preview-html | `IconMarkdown` |
  | format-converter | `IconFileCode` |
  | diff-checker | `IconGitCompare` |
  | regex-tester | `IconRegex` |
- **No test framework for component rendering exists in this repo.** `jest.config.js` sets `testEnvironment: 'jest-environment-node'` and there is no `@testing-library/react` dependency — existing `__tests__` files test pure logic/utils only, never render React components. Every task below is therefore verified with `npx tsc --noEmit` (types), `npm run lint` (ESLint), and a manual check against the running dev server (`npm run dev`) — not a fabricated render test. Run all three from `apps/web/`.
- **Two corrections to the approved design spec** (`docs/superpowers/specs/2026-07-03-formatters-dashboard-alignment-design.md`), found while reading the exact current code — noted here so they aren't silently dropped:
  1. **Drop `dash-card-sheen` from formatter toolbar/panel Cards.** Reading `apps/web/src/app/globals.css:854` and `873` shows the sheen's opacity is gated by `.group:hover .dash-card-sheen::before/::after` — it only ever renders because `dashboard-tool-card.tsx:90` wraps the card in `<Link className="block group ...">`. Formatter toolbar/panel Cards are not links and have no such wrapper; adding the class would add dead CSS with no visible effect. The visual win instead comes from the new accent icon chip, ambient background, and motion (items below) — sheen is skipped, not replaced.
  2. **Skip importing dashboard's page-level spacing rhythm** (`space-y-5 md:space-y-8`, `p-3 md:p-3.5`). Dashboard is a scrolling page; formatter tool pages are fixed-height (`h-full`, `min-h-0`, `flex-1`) dual-pane layouts where the editor claims all remaining vertical space. Loosening spacing to dashboard's rhythm would shrink usable editor height for no visual benefit. The one real spacing inconsistency — `diff-checker` using `gap-3` at its root while the other 8 use `gap-4` — is fixed in Task 10 for internal formatter-family consistency, not to match dashboard.
- **CSS utilities are reused as-is, unrenamed.** `dash-ambient` and `dashboard-grid-bg` (`apps/web/src/app/globals.css:753-765` and `823-838`) are global stylesheet rules — the `dash-` prefix is cosmetic, not a route scope. No rename task exists; they're simply imported by class name into non-dashboard files.
- **Third correction: no `bg-gradient-to-br from-card to-card/80` on toolbar/panel Cards.** The design spec called for adopting this gradient (from `dashboard-tool-card.tsx:98`) on formatter Cards. Reading `apps/web/src/components/ui/card.tsx:5-18` shows the shared `Card` primitive already renders `bg-card` with a themed shadow — every formatter Card already uses this same primitive, so it's already visually identical to dashboard's *base* card recipe. The extra gradient in `dashboard-tool-card.tsx` exists specifically to sell a hoverable/clickable link card; layering it onto a static toolbar or editor-panel Card (which isn't a single click target) would be decoration copied from the wrong context. The real, correctly-scoped visual delta this plan delivers is the page header, accent icon chip, ambient background, and motion — not a card-background change.

---

## Task 1: `ToolPageHeader` shared component

**Files:**
- Create: `apps/web/src/components/tools/tool-page-header.tsx`

**Interfaces:**
- Produces: `ToolPageHeader({ icon: React.ElementType, title: string, description: string, accent?: { bg: string; text: string }, className?: string })` — a JSX component. Default `accent` is `CATEGORY_ACCENT.Formatters`.
- Consumes: `CATEGORY_ACCENT` from `apps/web/src/components/dashboard/types.ts` (existing export, confirmed at line 128-138), `cn` from `apps/web/src/lib/utils`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

interface ToolPageHeaderProps {
  icon: React.ElementType
  title: string
  description: string
  accent?: { bg: string; text: string }
  className?: string
}

/**
 * Page-level header for a tool page: accented icon chip + title + description,
 * shown at every breakpoint. Mirrors DashboardSectionHeader's icon-chip
 * hierarchy so a tool page reads as part of the same product as the dashboard.
 */
export function ToolPageHeader({
  icon: Icon,
  title,
  description,
  accent = CATEGORY_ACCENT.Formatters,
  className,
}: ToolPageHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-border/60',
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight md:text-xl">{title}</h1>
        <p className="truncate text-xs text-muted-foreground md:text-sm">{description}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors related to `tool-page-header.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tools/tool-page-header.tsx
git commit -m "feat: add shared ToolPageHeader component for formatter pages"
```

---

## Task 2: `ToolMobileTabs` shared component

**Files:**
- Create: `apps/web/src/components/tools/tool-mobile-tabs.tsx`

**Interfaces:**
- Produces: `ToolMobileTabs<T extends string>({ value: T, onValueChange: (v: T) => void, tabs: { value: T; label: string }[], className?: string })`.
- Consumes: `Tabs`, `TabsList`, `TabsTrigger` from `apps/web/src/components/ui/tabs.tsx` (existing, confirmed lines 8, 10-23, 25-38).

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ToolMobileTabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  tabs: { value: T; label: string }[]
  className?: string
}

/**
 * Shared mobile input/output switcher for tool pages — replaces each tool's
 * hand-rolled pill-button toggle (`bg-muted/40 p-1` div) with the shadcn Tabs
 * primitive the rest of the app already uses (e.g. dashboard's Apps/Analytics
 * switch, markdown-preview-html's format switch).
 */
export function ToolMobileTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  className,
}: ToolMobileTabsProps<T>) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)} className={className}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors related to `tool-mobile-tabs.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tools/tool-mobile-tabs.tsx
git commit -m "feat: add shared ToolMobileTabs component for formatter pages"
```

---

## Task 3: `CopyIconButton` shared component

**Files:**
- Create: `apps/web/src/components/tools/copy-icon-button.tsx`

**Interfaces:**
- Produces: `CopyIconButton({ onCopy: () => void, copied: boolean, disabled?: boolean, label: string, className?: string })`.
- Consumes: `Button` from `apps/web/src/components/ui/button.tsx`.
- Note: this extracts the exact pattern already duplicated identically in `yaml-formatter-layout.tsx:214-224`, `sql-formatter-layout.tsx:222-232`, and `graphql-formatter-layout.tsx:300-310`. It does **not** apply to tools where copy is one of several labeled buttons in a row (json-schema-generator, markdown-preview-html, format-converter) — those are a different UI shape (multi-button labeled row vs. lone icon action in a panel header) and are left as-is per YAGNI.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyIconButtonProps {
  onCopy: () => void
  copied: boolean
  disabled?: boolean
  label: string
  className?: string
}

/**
 * Ghost icon-only copy button for a tool output panel header — the pattern
 * already shared identically by the YAML/SQL/GraphQL formatters, extracted
 * to a single source of truth.
 */
export function CopyIconButton({
  onCopy,
  copied,
  disabled,
  label,
  className,
}: CopyIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className ?? 'h-7 w-7 shrink-0'}
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors related to `copy-icon-button.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tools/copy-icon-button.tsx
git commit -m "feat: add shared CopyIconButton component for formatter output panels"
```

---

## Task 4: Apply to JSON Formatter (pilot)

This is the hardest case (resizable dual-pane via `react-resizable-panels`, save/load modal) — proving the pattern here first surfaces integration problems before the cheaper batch tasks.

**Files:**
- Modify: `apps/web/src/components/json-formatter/json-formatter-layout.tsx`

**Interfaces:**
- Consumes: `ToolPageHeader` (Task 1), `ToolMobileTabs` (Task 2), `RevealItem` from `apps/web/src/components/dashboard/dashboard-reveal.tsx` (existing, confirmed).

- [ ] **Step 1: Update imports**

Replace line 18:
```tsx
import { Card, CardHeader } from '@/components/ui/card'
```
with (drop `Card`/`CardHeader` — after Step 2 they're no longer used anywhere in this file):
```tsx
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
```

- [ ] **Step 2: Replace the header block, mobile tab switcher, and add the page shell wrapper**

Replace lines 320-366 (the full `return (` opening through the end of the mobile tab-switcher `{isMobile && (...)}` block) with:

```tsx
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader icon={IconJson} title={t('title')} description={t('description')} />
      </RevealItem>

      {isMobile && (
        <RevealItem index={1}>
          <ToolMobileTabs
            value={activePane}
            onValueChange={setActivePane}
            tabs={[
              { value: 'left', label: 'Text' },
              { value: 'right', label: 'Tree' },
            ]}
          />
        </RevealItem>
      )}
```

(The rest of the file — the `{isMobile ? ( ... ) : ( ... )}` resizable-panel block and the `<ResponsiveModal>` — is unchanged. Only the opening `<div>` through the old mobile-tab-switcher block is replaced.)

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors. If `IconJson` or `Card`/`CardHeader` show unused-import or undefined errors, confirm `IconJson` is still imported at line 12 (it is — used for the header icon now instead of the old inline chip) and that `Card`/`CardHeader` have no remaining references in the file.

- [ ] **Step 4: Manual verification**

Run: `cd apps/web && npm run dev`, visit `/app/json-formatter`.
Expected:
- Desktop: page now shows an icon-chip + "JSON Formatter" title + description at the top (previously only visible on mobile).
- Icon chip uses the emerald Formatters accent, not the old primary/violet gradient.
- Toggle to a narrow viewport (< 768px): the input/output switcher now renders as shadcn `Tabs` pills instead of the old hand-rolled buttons, and still switches the Text/Tree pane correctly.
- Toggle dark mode: header and ambient background render correctly in both themes.
- Enable "reduce motion" in OS accessibility settings (or devtools emulation) and reload: header/tabs appear immediately with no fade-up (per `RevealItem`'s `useReducedMotion` check).
- Save/load modal (click "Save"/"Load" in the per-pane toolbar) still opens and works — this feature must be untouched by this refactor.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/json-formatter/json-formatter-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader/ToolMobileTabs to JSON formatter"
```

---

## Task 5: Apply to YAML Formatter (+ extract CopyIconButton)

**Files:**
- Modify: `apps/web/src/components/yaml-formatter/yaml-formatter-layout.tsx`

- [ ] **Step 1: Update imports**

Add after line 9 (`import { useIsMobile } from '@/components/hooks/use-mobile'`):
```tsx
import { IconFileCode } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs'
import { CopyIconButton } from '@/components/tools/copy-icon-button'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
```

- [ ] **Step 2: Replace the header block and wrap the root wrapper**

Replace lines 94-99:
```tsx
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with:
```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconFileCode} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the mobile tab switcher**

Replace lines 165-188:
```tsx
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setMobileTab('input')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'input'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('inputPanel')}
          </button>
          <button
            onClick={() => setMobileTab('output')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'output'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('outputPanel')}
          </button>
        </div>
      )}
```
with:
```tsx
      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputPanel') },
            { value: 'output', label: t('outputPanel') },
          ]}
        />
      )}
```

- [ ] **Step 4: Replace the inline copy button**

Replace lines 214-224:
```tsx
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!output}
                title={t('copy')}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
```
with:
```tsx
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
```

Then remove `Check` and `Copy` from the lucide-react import on line 17 if no longer used elsewhere in the file (they aren't — `AlertCircle`, `Trash2`, `Wand2` remain):
```tsx
import { AlertCircle, Trash2, Wand2 } from 'lucide-react'
```

- [ ] **Step 5: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `cd apps/web && npm run dev`, visit `/app/yaml-formatter`. Confirm: desktop header now visible with emerald icon chip; mobile switcher is shadcn Tabs; Copy button in output panel still copies and still shows the check-mark toggle; Format/Clear buttons unaffected.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/yaml-formatter/yaml-formatter-layout.tsx
git commit -m "refactor: apply shared tool-page components to YAML formatter"
```

---

## Task 6: Apply to SQL Formatter

**Files:**
- Modify: `apps/web/src/components/sql-formatter/sql-formatter-layout.tsx`

- [ ] **Step 1: Update imports**

Add after line 9 (`import { useIsMobile } from '@/components/hooks/use-mobile';`):
```tsx
import { IconSql } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 84-89:
```tsx
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with:
```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconSql} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the mobile tab switcher**

Replace lines 173-196:
```tsx
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setMobileTab('input')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'input'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('inputPanel')}
          </button>
          <button
            onClick={() => setMobileTab('output')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'output'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('formattedPanel')}
          </button>
        </div>
      )}
```
with:
```tsx
      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputPanel') },
            { value: 'output', label: t('formattedPanel') },
          ]}
        />
      )}
```

- [ ] **Step 4: Replace the inline copy button**

Replace lines 222-232:
```tsx
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!output}
                title={t('copy')}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
```
with:
```tsx
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
```

Remove `Check` and `Copy` from line 17's lucide-react import (keep `AlertCircle`, `Trash2`, `Wand2`):
```tsx
import { AlertCircle, Trash2, Wand2 } from 'lucide-react';
```

- [ ] **Step 5: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Manual verification**

Visit `/app/sql-formatter`: header visible on desktop, mobile Tabs switch input/formatted panes, Copy button still works, dialect/keyword-case/indent Selects and Format/Clear buttons unaffected.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/sql-formatter/sql-formatter-layout.tsx
git commit -m "refactor: apply shared tool-page components to SQL formatter"
```

---

## Task 7: Apply to GraphQL Formatter

**Files:**
- Modify: `apps/web/src/components/graphql-formatter/graphql-formatter-layout.tsx`

- [ ] **Step 1: Update imports**

Add after line 11 (`import { useIsMobile } from '@/components/hooks/use-mobile';`):
```tsx
import { IconBrandGraphql } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 124-129:
```tsx
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with:
```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconBrandGraphql} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the mobile tab switcher**

Replace lines 246-271:
```tsx
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('input')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'input'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('inputPanel')}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('output')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'output'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('outputPanel')}
          </button>
        </div>
      )}
```
with:
```tsx
      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputPanel') },
            { value: 'output', label: t('outputPanel') },
          ]}
        />
      )}
```

- [ ] **Step 4: Replace the inline copy button**

Replace lines 300-310:
```tsx
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!output}
                title={t('copy')}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
```
with:
```tsx
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
```

Remove `Check` and `Copy` from line 5's lucide-react import (keep `AlertCircle`, `Trash2`, `Wand2`):
```tsx
import { AlertCircle, Trash2, Wand2 } from 'lucide-react';
```

- [ ] **Step 5: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Manual verification**

Visit `/app/graphql-formatter`: header visible on desktop, mobile Tabs switch input/output, Copy button works, the Format/Build sub-tabs (`panelTab` state, unrelated to `mobileTab`) still work.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/graphql-formatter/graphql-formatter-layout.tsx
git commit -m "refactor: apply shared tool-page components to GraphQL formatter"
```

---

## Task 8: Apply to JSON Schema Generator

**Files:**
- Modify: `apps/web/src/components/json-schema-generator/json-schema-generator-layout.tsx`

- [ ] **Step 1: Update imports**

Replace line 7:
```tsx
import { AlertCircle, Check, Copy, Download, FileJson, Trash2 } from 'lucide-react';
```
with (drop `FileJson`, the only lucide icon that was used for the old header chip; keep the rest):
```tsx
import { AlertCircle, Check, Copy, Download, Trash2 } from 'lucide-react';
import { IconBraces } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 109-121:
```tsx
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
        <div className="flex items-start gap-2.5">
          <div className="rounded-xl bg-primary/10 p-2 shadow-sm">
            <FileJson className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
      </div>
```
with:
```tsx
  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconBraces} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the mobile tab switcher**

Replace lines 169-186:
```tsx
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          {(['input', 'output'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-all ${
                mobileTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'input' ? t('inputLabel') : t('outputLabel')}
            </button>
          ))}
        </div>
      )}
```
with:
```tsx
      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputLabel') },
            { value: 'output', label: t('outputLabel') },
          ]}
        />
      )}
```

Note: the Clear/Copy/Download button row (lines 144-166) is left unchanged — it's a 3-button labeled row, not the lone-icon-in-panel-header shape `CopyIconButton` targets (see Task 3's note).

- [ ] **Step 4: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Manual verification**

Visit `/app/json-schema-generator`: header visible on desktop with emerald `IconBraces` chip (replacing the old primary-colored `FileJson` chip that only showed on mobile), mobile Tabs switch input/output, Clear/Copy/Download row unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/json-schema-generator/json-schema-generator-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader/ToolMobileTabs to JSON Schema Generator"
```

---

## Task 9: Apply to Markdown Preview

**Files:**
- Modify: `apps/web/src/components/markdown-preview-html/markdown-preview-html-layout.tsx`

This tool has no mobile input/output switcher (`ToolMobileTabs` doesn't apply) — only the header changes.

- [ ] **Step 1: Update imports**

Add after line 13 (`import { Copy, Check, Download, Eye, Code } from 'lucide-react';`):
```tsx
import { IconMarkdown } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 106-111:
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
        <ToolPageHeader icon={IconMarkdown} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/markdown-preview-html`: header visible on desktop; both the "Markdown → HTML" and "HTML → Markdown" tabs (unrelated `Tabs` component, unchanged) still work; Copy/Export buttons unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/markdown-preview-html/markdown-preview-html-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Markdown Preview"
```

---

## Task 10: Apply to Diff Checker (+ spacing fix)

**Files:**
- Modify: `apps/web/src/components/diff-checker/diff-checker-layout.tsx`

- [ ] **Step 1: Update imports**

Add after line 16 (`import { useIsMobile } from '@/components/hooks/use-mobile';`):
```tsx
import { IconGitCompare } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block and fix the root gap**

Replace lines 152-157:
```tsx
  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with (note `gap-3` → `gap-4`, matching the other 8 tools):
```tsx
  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconGitCompare} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the 3-way mobile tab switcher**

Replace lines 180-194:
```tsx
          <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
            {(['original', 'modified', 'diff'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 rounded-md px-2 py-2 text-sm font-medium capitalize transition-all ${
                  mobileTab === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'original' ? t('original') : tab === 'modified' ? t('modified') : t('comparisonLabel')}
              </button>
            ))}
          </div>
```
with:
```tsx
          <ToolMobileTabs
            value={mobileTab}
            onValueChange={setMobileTab}
            tabs={[
              { value: 'original', label: t('original') },
              { value: 'modified', label: t('modified') },
              { value: 'diff', label: t('comparisonLabel') },
            ]}
          />
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Manual verification**

Visit `/app/diff-checker`: header visible on desktop; on mobile, the Original/Modified/Diff Tabs switch correctly; desktop stacked-inputs-plus-diff-below layout is unaffected; Clear button and diff stats badge unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/diff-checker/diff-checker-layout.tsx
git commit -m "refactor: apply shared tool-page components to Diff Checker"
```

---

## Task 11: Apply to Regex Tester

**Files:**
- Modify: `apps/web/src/components/regex-tester/regex-tester-layout.tsx`

This tool has no mobile input/output switcher (single column at all breakpoints) — only the header changes.

- [ ] **Step 1: Update imports**

Add after line 22 (`import { AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';`):
```tsx
import { IconRegex } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 125-130:
```tsx
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with:
```tsx
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconRegex} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 4: Manual verification**

Visit `/app/regex-tester`: header visible on desktop; pattern input, flag checkboxes, match navigation, and highlighted test-text area all unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/regex-tester/regex-tester-layout.tsx
git commit -m "refactor: apply shared ToolPageHeader to Regex Tester"
```

---

## Task 12: Apply to Format Converter

**Files:**
- Modify: `apps/web/src/components/format-converter/format-converter-layout.tsx`

- [ ] **Step 1: Update imports**

Add after line 9 (`import { ArrowLeftRight, Copy, Check, AlertCircle } from 'lucide-react';`):
```tsx
import { IconFileCode } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
```

- [ ] **Step 2: Replace the header block**

Replace lines 97-102:
```tsx
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
```
with:
```tsx
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconFileCode} title={t('title')} description={t('subtitle')} />
      </RevealItem>
```

- [ ] **Step 3: Replace the mobile tab switcher**

Replace lines 104-121:
```tsx
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          {(['input', 'output'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-all ${
                mobileTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'input' ? t('fromLabel') : t('toLabel')}
            </button>
          ))}
        </div>
      )}
```
with:
```tsx
      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('fromLabel') },
            { value: 'output', label: t('toLabel') },
          ]}
        />
      )}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`

- [ ] **Step 5: Manual verification**

Visit `/app/format-converter`: header visible on desktop; mobile Tabs switch input/output (still auto-advances to output tab on typing, per the existing `setMobileTab('output')` call in the `onChange` handler); Swap/Copy buttons and from/to Selects unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/format-converter/format-converter-layout.tsx
git commit -m "refactor: apply shared tool-page components to Format Converter"
```

---

## Task 13: Cross-tool QA pass

**Files:** none (verification only).

- [ ] **Step 1: Full-suite typecheck and lint**

Run: `cd apps/web && npx tsc --noEmit && npm run lint`
Expected: zero errors across the whole app (catches any cross-file regression missed in a single-tool step).

- [ ] **Step 2: Visual sweep across all 9 tools**

Run: `cd apps/web && npm run dev`. For each of the 9 routes (`/app/json-formatter`, `/app/json-schema-generator`, `/app/sql-formatter`, `/app/graphql-formatter`, `/app/yaml-formatter`, `/app/markdown-preview-html`, `/app/format-converter`, `/app/diff-checker`, `/app/regex-tester`), confirm:
- Desktop page header renders with the emerald Formatters icon chip, correct per-tool icon, title, and description.
- Light and dark mode both render the ambient background and icon chip with sufficient contrast.
- Mobile width (< 768px): header stays legible; any `ToolMobileTabs` switcher (json-formatter, yaml, sql, graphql, json-schema-generator, diff-checker, format-converter) switches panes correctly; markdown-preview-html and regex-tester (no switcher) still lay out correctly in a single column.
- No horizontal scroll or layout overflow introduced by the header/ambient background at any of 375px, 768px, 1024px, 1440px widths.
- `prefers-reduced-motion` (devtools "Emulate CSS media feature") removes the header fade-up on every tool, per `RevealItem`.

- [ ] **Step 3: Regression check on stateful features**

Confirm JSON formatter's save/load modal (requires being logged in, or confirm the "login required" toast fires when logged out) still opens, lists, and loads documents correctly — this is the one tool with backend-persisted state and the highest risk of an accidental regression from Task 4's edit.

- [ ] **Step 4: Commit** (only if Steps 1-3 surfaced fixes; otherwise this task ends at Step 3 with nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in formatters dashboard-alignment QA pass"
```
