"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { ModeToggle } from "@/components/modeToggle";
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

  if (!config) {
    if (pathname.startsWith("/app")) {
      return (
        <header className="sticky top-0 z-20 hidden w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
          <div className="flex h-12 items-center justify-end gap-2 px-4">
            <ModeToggle />
          </div>
        </header>
      );
    }
    return null;
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
    <header className="sticky top-0 z-20 hidden w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
      <div className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
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
        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
