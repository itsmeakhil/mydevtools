"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { Search } from "lucide-react";
import { ModeToggle } from "@/components/modeToggle";
import { getToolMessageKey } from "@/lib/tool-i18n";
import { routeConfig } from "@/lib/route-config";
import { WorkspaceSwitcherDropdown } from "@/components/workspace-switcher-dropdown";
import { OrgSwitcherDropdown } from "@/components/org-switcher-dropdown";
import { WorkspaceQuickActions } from "@/components/workspace-quick-actions";
import { NotificationsBell } from "@/components/notifications-bell";

function openCommandPalette() {
  document.dispatchEvent(new CustomEvent("open-command-palette"));
}

/** Global ⌘K launcher — keeps the command-center pattern on every app page. */
function CommandTrigger() {
  return (
    <>
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search or jump to a tool"
        className="group hidden h-9 w-[clamp(180px,22vw,300px)] items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-muted/60 hover:text-foreground lg:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search or jump to…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground/80 shadow-sm">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search or jump to a tool"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:hidden"
      >
        <Search className="h-4 w-4" />
      </button>
    </>
  );
}

/** Strip HTML-like tags and ICU {variable} placeholders from rich-text subtitles. */
function cleanSubtitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\s*\{[^}]+\}\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function NavBar() {
  const pathname = usePathname();
  const tNav = useTranslations("Navigation");
  const messages = useMessages();

  const match = Object.entries(routeConfig).find(([route]) =>
    pathname === route || pathname.startsWith(route + '/')
  );
  const config = match?.[1];
  const matchedRoute = match?.[0];

  // The dashboard needs no page title — the sidebar highlights it and the page
  // greets the user. A "Dashboard" label beside the org switcher is noise.
  if (!config || matchedRoute === '/dashboard') {
    // Minimal bar everywhere with a sidebar so chrome (workspace, bell, theme)
    // is reachable on /dashboard, /settings, etc. — not just /app routes.
    return (
      <header className="sticky top-0 z-20 hidden w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center">
            <OrgSwitcherDropdown />
          </div>
          <CommandTrigger />
          <WorkspaceSwitcherDropdown />
          <WorkspaceQuickActions />
          <NotificationsBell />
          <ModeToggle />
        </div>
      </header>
    );
  }

  const Icon = config.icon;
  const toolKey = matchedRoute ? getToolMessageKey(matchedRoute) : undefined;
  const title = toolKey ? tNav(toolKey as never) : config.title;

  const rawSubtitle = config.namespace
    ? ((messages[config.namespace] as Record<string, string> | undefined)?.subtitle
       ?? (messages[config.namespace] as Record<string, string> | undefined)?.description)
    : undefined;
  const subtitle = rawSubtitle ? cleanSubtitle(rawSubtitle) : undefined;

  return (
    <header className="sticky top-0 z-20 hidden w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <OrgSwitcherDropdown />
          <div className="h-5 w-px shrink-0 bg-border/60" aria-hidden />
          <div className="shrink-0 rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 p-1.5 ring-1 ring-inset ring-border/50">
            <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <CommandTrigger />
        <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
          <WorkspaceSwitcherDropdown />
          <WorkspaceQuickActions />
          <NotificationsBell />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
