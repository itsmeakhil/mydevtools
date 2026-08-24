'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
// One glyph for the sidebar toggle in both directions. `PanelLeftClose` /
// `PanelLeftOpen` draw a panel *and* a chevron inside 16px, which reads as two
// overlapping icons rather than one control.
import { PanelLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { useToolSidebarStore } from '@/store/tool-sidebar-store'
import { toolCategoryMap } from '@/lib/tool-categories'
import { categoryAccent } from '@/components/dashboard/types'
import { ToolSidebarRail } from '@/components/tools/tool-sidebar-rail'
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  emptyRailRegistry,
  flattenRail,
  isSidebarShortcut,
  railEntriesKey,
  railHandlerKey,
  registerRailGroup,
  unregisterRailGroup,
  type RailRegistry,
  type ToolSidebarRailEntry,
} from '@/lib/tool-sidebar-rail'
import { cn } from '@/lib/utils'

export type { ToolSidebarRailEntry } from '@/lib/tool-sidebar-rail'

/**
 * The one in-tool left panel. Every app-like tool (notes, bookmarks, api-client,
 * data-explorer, s3-drive, snippet-manager, password-manager, api-keys,
 * environment-manager, to-do) renders its list/tree through this so the chrome —
 * width, header, collapse affordance, mobile sheet — is identical everywhere.
 *
 * Desktop collapse state is persisted per tool; the mobile sheet is ephemeral.
 */

interface ToolSidebarContextValue {
  /** True when the panel is inside the mobile sheet rather than the column. */
  isMobile: boolean
  /**
   * True whenever the panel floats over the content rather than sitting in its
   * own column. Rows should `close()` on select in this state so the pick isn't
   * left hidden behind the panel.
   */
  isOverlay: boolean
  /**
   * False while the panel is collapsed or the mobile sheet is shut. The body
   * stays mounted in that state — gate anything expensive that assumes the user
   * can see the panel on this rather than on mount.
   */
  isVisible: boolean
  /**
   * Dismiss the panel. No-op on desktop when the panel is pinned open — call it
   * from list rows so picking an item on mobile closes the sheet instead of
   * leaving it covering the result.
   */
  close: () => void
}

const ToolSidebarContext = React.createContext<ToolSidebarContextValue | null>(null)
const ActionsSlotContext = React.createContext<HTMLElement | null>(null)

/** Panel-side helper. Returns null outside a ToolSidebarLayout. */
export function useToolSidebarPanel() {
  return React.useContext(ToolSidebarContext)
}

/**
 * Renders header buttons into the panel header from *inside* the panel, so a
 * sidebar whose actions depend on its own local state (sort order, filters)
 * doesn't have to lift that state into the page just to reach the header.
 * Prefer the `actions` prop when the page already owns the handler.
 */
export function ToolSidebarActions({ children }: { children: React.ReactNode }) {
  const slot = React.useContext(ActionsSlotContext)
  return slot ? createPortal(children, slot) : null
}

interface RailRegistrationValue {
  register: (groupId: string, entries: ToolSidebarRailEntry[]) => void
  unregister: (groupId: string) => void
  /**
   * Live handlers keyed `${groupId}/${entryId}`. Handlers live in a ref rather
   * than in registry state so a body that rebuilds its closures every render
   * does not re-register in a loop, and the rail still calls the current one.
   */
  handlers: React.RefObject<Map<string, () => void>>
}

const RailRegistrationContext = React.createContext<RailRegistrationValue | null>(null)

/**
 * Publishes rail entries from inside the panel body, so the collapsed 48px rail
 * can offer the tool's facets/roots instead of only an expand button. Safe to
 * call unconditionally: outside a ToolSidebarLayout it is a no-op.
 *
 * `entries` may be rebuilt every render — registration is keyed on the entries'
 * displayed data, not on array identity.
 */
export function useToolSidebarRail(groupId: string, entries: ToolSidebarRailEntry[]) {
  const reg = React.useContext(RailRegistrationContext)
  const key = railEntriesKey(entries)
  const latest = React.useRef(entries)
  latest.current = entries

  // Refresh handlers on every commit so the rail always calls the current
  // closure, without that identity churn triggering re-registration.
  React.useEffect(() => {
    if (!reg) return
    const map = reg.handlers.current
    for (const e of latest.current) {
      if (e.onSelect) map.set(railHandlerKey(groupId, e.id), e.onSelect)
    }
  })

  React.useEffect(() => {
    if (!reg) return
    reg.register(groupId, latest.current)
    return () => reg.unregister(groupId)
  }, [reg, groupId, key])
}

export interface ToolSidebarFilterItem {
  id: string
  label: string
  count?: number
  /** Tailwind bg-* class for a leading status dot. */
  dot?: string
  icon?: React.ElementType
}

/**
 * The standard panel body for tools that group items by a facet (tags, project,
 * environment, status) rather than a tree. One row per bucket, with counts.
 */
export function ToolSidebarFilterList({
  items,
  value,
  onChange,
  heading,
  className,
  railGroupId,
}: {
  items: ToolSidebarFilterItem[]
  value: string
  onChange: (id: string) => void
  /** Optional uppercase section label above the rows. */
  heading?: string
  className?: string
  /**
   * Group id for the collapsed rail. Defaults to the heading, so a panel with
   * two filter lists (password-manager: security + tags) produces two rail
   * groups. Pass explicitly when there is no heading.
   */
  railGroupId?: string
}) {
  const panel = useToolSidebarPanel()
  const groupId = railGroupId ?? heading ?? 'filters'

  // The facets this list already renders are exactly what the collapsed rail
  // should offer, so publish them rather than making each tool restate them.
  const railEntries = React.useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        count: item.count,
        active: item.id === value,
        onSelect: () => onChange(item.id),
      })),
    [items, value, onChange],
  )

  useToolSidebarRail(groupId, railEntries)

  return (
    <div className={cn('space-y-0.5 p-2', className)}>
      {heading && (
        <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {heading}
        </p>
      )}
      {items.map((item) => {
        const Icon = item.icon
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => {
              onChange(item.id)
              if (panel?.isMobile) panel.close()
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              active
                ? 'bg-primary/10 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {item.dot && (
              <span className={cn('size-2 shrink-0 rounded-full', item.dot)} aria-hidden />
            )}
            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.count !== undefined && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface ToolSidebarLayoutProps {
  /** Stable id — also the persistence key for the collapse state. */
  toolId: string
  icon: React.ElementType
  title: string
  /** Header buttons (add, sort, filter…) rendered left of the collapse toggle. */
  actions?: React.ReactNode
  /**
   * Rail entries the page owns directly. Bodies that own their own state should
   * call `useToolSidebarRail` instead; these render after the registered ones.
   */
  rail?: ToolSidebarRailEntry[]
  /** The tool's one "create" affordance. Shown in the header and in the rail. */
  primaryAction?: { icon: React.ElementType; label: string; onClick: () => void }
  /**
   * Panel body: the tool's list, tree, or filter set. Laid out as a flex column
   * that does NOT scroll — the panel owns its own `overflow-y-auto` region so a
   * search field or footer can stay pinned while the list scrolls under it.
   */
  sidebar: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ToolSidebarLayout({
  toolId,
  icon: Icon,
  title,
  actions,
  rail,
  primaryAction,
  sidebar,
  children,
  className,
}: ToolSidebarLayoutProps) {
  const t = useTranslations('ToolSidebar')
  const isMobile = useIsMobile()
  const collapsed = useToolSidebarStore((s) => !!s.collapsed[toolId])
  const setCollapsed = useToolSidebarStore((s) => s.setCollapsed)
  const width = useToolSidebarStore((s) => s.width[toolId] ?? DEFAULT_SIDEBAR_WIDTH)
  const setWidth = useToolSidebarStore((s) => s.setWidth)
  const resetWidth = useToolSidebarStore((s) => s.resetWidth)
  const dragOriginRef = React.useRef<{ x: number; width: number } | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [actionsSlot, setActionsSlot] = React.useState<HTMLDivElement | null>(null)
  const [registry, setRegistry] = React.useState<RailRegistry>(emptyRailRegistry)
  const handlers = React.useRef<Map<string, () => void>>(new Map())
  const panelId = React.useId()
  const railExpandRef = React.useRef<HTMLButtonElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  // Same category tint the dashboard card for this tool uses, so the identity
  // colour is continuous from the grid to the tool. Falls back to primary.
  const accent = categoryAccent(toolCategoryMap[toolId] ?? '')

  // The panel floats only as the mobile sheet; on desktop it is a pinned column.
  const isOverlay = isMobile && sheetOpen
  const hidden = isMobile || collapsed

  const railRegistration = React.useMemo<RailRegistrationValue>(
    () => ({
      register: (groupId, entries) => setRegistry((r) => registerRailGroup(r, groupId, entries)),
      unregister: (groupId) => setRegistry((r) => unregisterRailGroup(r, groupId)),
      handlers,
    }),
    [],
  )

  const railEntries = React.useMemo(() => {
    const flat = flattenRail(registry)
    if (!rail?.length) return flat
    // Prop entries are their own group, so they get a separator too.
    return [...flat, ...rail.map((e, i) => ({ ...e, groupStart: i === 0 && flat.length > 0 }))]
  }, [registry, rail])

  const expand = React.useCallback(() => {
    if (isMobile) setSheetOpen(true)
    else setCollapsed(toolId, false)
  }, [isMobile, setCollapsed, toolId])

  const close = React.useCallback(() => {
    if (sheetOpen) setSheetOpen(false)
    else if (!isMobile) setCollapsed(toolId, true)
  }, [isMobile, setCollapsed, toolId, sheetOpen])

  const activateRailEntry = React.useCallback(
    (entry: ToolSidebarRailEntry) => {
      expand()
      // `flattenRail` namespaced the id to `groupId/entryId`, which is exactly
      // the handler-map key. Entries that arrived via the `rail` prop are not in
      // the map, so they fall back to their own closure.
      ;(handlers.current.get(entry.id) ?? entry.onSelect)?.()
    },
    [expand],
  )

  const ctx = React.useMemo<ToolSidebarContextValue>(
    () => ({ isMobile, isOverlay, isVisible: !hidden, close }),
    [isMobile, isOverlay, hidden, close],
  )

  // Cmd/Ctrl+\ toggles the panel. Registered per mounted layout; inactive tool
  // tabs stay mounted behind display:none, so the handler bails unless its own
  // tab is the one on screen (offsetParent is null inside a hidden ancestor).
  React.useEffect(() => {
    if (isMobile) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSidebarShortcut(e as unknown as Parameters<typeof isSidebarShortcut>[0])) return
      if (!panelRef.current?.offsetParent && !railExpandRef.current?.offsetParent) return
      e.preventDefault()
      if (collapsed) {
        setCollapsed(toolId, false)
        requestAnimationFrame(() => panelRef.current?.focus())
      } else {
        setCollapsed(toolId, true)
        requestAnimationFrame(() => railExpandRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [collapsed, isMobile, setCollapsed, toolId])

  const onHandlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragOriginRef.current = { x: e.clientX, width }
      // Dragging across the content pane would otherwise select its text.
      document.body.style.userSelect = 'none'
    },
    [width],
  )

  const onHandlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOriginRef.current
      if (!origin) return
      setWidth(toolId, origin.width + (e.clientX - origin.x))
    },
    [setWidth, toolId],
  )

  const onHandlePointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragOriginRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    document.body.style.userSelect = ''
  }, [])

  const onHandleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setWidth(toolId, width - 16)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setWidth(toolId, width + 16)
      } else if (e.key === 'Home') {
        e.preventDefault()
        resetWidth(toolId)
      }
    },
    [setWidth, resetWidth, toolId, width],
  )

  const panel = (
    <div
      id={panelId}
      ref={panelRef}
      tabIndex={-1}
      aria-label={title}
      className="flex h-full min-h-0 flex-col border-r bg-muted/10 outline-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              accent.bg,
              accent.text,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {primaryAction && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={primaryAction.onClick}
              aria-label={primaryAction.label}
              title={primaryAction.label}
            >
              <primaryAction.icon className="h-4 w-4" />
            </Button>
          )}
          {actions}
          <div ref={setActionsSlot} className="flex items-center gap-0.5" />
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => {
                setCollapsed(toolId, true)
                // Focus would otherwise land on <body> when this button hides.
                requestAnimationFrame(() => railExpandRef.current?.focus())
              }}
              aria-label={t('collapse')}
              title={t('collapse')}
              aria-expanded={true}
              aria-controls={panelId}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ActionsSlotContext.Provider value={actionsSlot}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{sidebar}</div>
      </ActionsSlotContext.Provider>
    </div>
  )

  return (
    <ToolSidebarContext.Provider value={ctx}>
      <RailRegistrationContext.Provider value={railRegistration}>
        <div className={cn('flex h-full min-h-0 w-full overflow-hidden', className)}>
          {/* Mounted even while collapsed. Two reasons: rail entries are published
              by hooks inside the body and an unmounted body cannot publish, and
              unmounting threw away the body's search text, expanded tree groups
              and scroll position on every collapse. */}
          {!isMobile && (
            <div
              className="relative shrink-0"
              style={{ width, display: collapsed ? 'none' : undefined }}
            >
              {panel}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={t('resize')}
                aria-valuenow={width}
                aria-valuemin={MIN_SIDEBAR_WIDTH}
                aria-valuemax={MAX_SIDEBAR_WIDTH}
                tabIndex={0}
                title={`${t('resize')} — ${t('resetWidth')}`}
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onDoubleClick={() => resetWidth(toolId)}
                onKeyDown={onHandleKeyDown}
                className="absolute inset-y-0 -right-0.5 z-10 w-1 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none"
              />
            </div>
          )}

          {isMobile && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                {panel}
              </SheetContent>
            </Sheet>
          )}

          {/* Collapsed state is a 48px rail, not a floating overlay: every tool's
              main pane already puts a toolbar or header at the top-left, and an
              absolutely-positioned button would sit on top of it. The rail keeps
              the tool's identity, its primary action and its facets reachable. */}
          {hidden && (
            <ToolSidebarRail
              icon={Icon}
              title={title}
              accent={accent}
              entries={railEntries}
              primaryAction={primaryAction}
              onExpand={expand}
              onActivate={activateRailEntry}
              panelId={panelId}
              expandRef={railExpandRef}
            />
          )}

          {/* Same surface the 71 single-pane tools paint (dashboard-grid-bg +
              dash-ambient), so moving between a converter and a workspace tool
              doesn't change the background under you. */}
          <div
            className="dashboard-grid-bg relative flex min-w-0 flex-1 flex-col overflow-hidden"
            // .dashboard-grid-bg rounds its corners for the padded single-pane
            // column; this pane is flush against the panel border, and the radius
            // would clip content corners under overflow-hidden. Inline beats the
            // utilities-layer rule.
            style={{ borderRadius: 0 }}
          >
            <div className="dash-ambient -z-10" aria-hidden />
            {children}
          </div>
        </div>
      </RailRegistrationContext.Provider>
    </ToolSidebarContext.Provider>
  )
}
