"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { getToolMessageKey } from "@/lib/tool-i18n";
import { routeConfig } from "@/lib/route-config";

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
    return null;
  }

  const toolKey = matchedRoute ? getToolMessageKey(matchedRoute) : undefined;
  const title = toolKey ? tNav(toolKey as never) : config.title;

  const rawSubtitle = config.namespace
    ? ((messages[config.namespace] as Record<string, string> | undefined)?.subtitle
       ?? (messages[config.namespace] as Record<string, string> | undefined)?.description)
    : undefined;
  const subtitle = rawSubtitle ? cleanSubtitle(rawSubtitle) : undefined;

  return (
    <header className="glass-bar chrome sticky top-0 z-20 hidden w-full border-b border-border md:block">
      <div className="flex h-12 w-full items-center gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
