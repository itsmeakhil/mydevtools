"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { useActiveOrg, useActiveWorkspace } from "@/store/workspace-store"
import { routeConfig } from "@/lib/route-config"
import { getToolMessageKey } from "@/lib/tool-i18n"

/**
 * Always-visible context trail: `<Org> / <Workspace> / <Section>`.
 * Renders below the NavBar on /app routes. Anchors the active scope so the
 * user never has to open a dropdown to know where they are.
 */
export function WorkspaceBreadcrumb() {
  const pathname = usePathname()
  const org = useActiveOrg()
  const ws = useActiveWorkspace()
  const tNav = useTranslations("Navigation")

  if (!org || !ws) return null

  const match = Object.entries(routeConfig).find(
    ([route]) => pathname === route || pathname.startsWith(route + "/"),
  )
  const matchedRoute = match?.[0]
  const cfg = match?.[1]
  const toolKey = matchedRoute ? getToolMessageKey(matchedRoute) : undefined
  const sectionLabel = toolKey ? tNav(toolKey as never) : cfg?.title

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground border-b border-border/40 bg-background/40"
    >
      <span className="truncate max-w-[140px]">{org.name}</span>
      <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
      <span className="truncate max-w-[160px] font-medium text-foreground/80">
        {ws.name}
      </span>
      {sectionLabel && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate text-foreground/70">{sectionLabel}</span>
        </>
      )}
    </nav>
  )
}
