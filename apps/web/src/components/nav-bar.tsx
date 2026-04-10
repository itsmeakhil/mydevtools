"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  FileText,
  Lock,
  Bookmark,
  Globe,
  Database,
  LayoutDashboard,
  Braces,
  Link2,
  Fingerprint,
  TextQuote,
  Palette,
  Key,
  Regex,
  Clock,
  Repeat,
} from "lucide-react";
import { ModeToggle } from "@/components/modeToggle";

// Route to title/icon mapping
const routeConfig: Record<string, { title: string; icon: React.ElementType }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/app/to-do': { title: 'Tasks', icon: CheckSquare },
  '/app/notes': { title: 'Notes', icon: FileText },
  '/app/password-manager': { title: 'Password Manager', icon: Lock },
  '/app/bookmarks': { title: 'Bookmarks', icon: Bookmark },
  '/app/json-formatter': { title: 'JSON Formatter', icon: Braces },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/nosql-explorer': { title: 'NoSQL Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
  '/app/url-encode': { title: 'URL Encoder / Decoder', icon: Link2 },
  '/app/uuid-generator': { title: 'UUID / ULID Generator', icon: Fingerprint },
  '/app/lorem-ipsum': { title: 'Lorem Ipsum Generator', icon: TextQuote },
  '/app/color-picker': { title: 'Color Picker', icon: Palette },
  '/app/jwt-decoder': { title: 'JWT Decoder', icon: Key },
  '/app/regex-tester': { title: 'Regex Tester', icon: Regex },
  '/app/timestamp-converter': { title: 'Timestamp Converter', icon: Clock },
  '/app/cron-builder': { title: 'Cron Builder', icon: Repeat },
};

export function NavBar() {
  const pathname = usePathname();
  const tNav = useTranslations("Navigation");

  // Find matching route config
  const match = Object.entries(routeConfig).find(([route]) =>
    pathname === route || pathname.startsWith(route + '/')
  );
  const config = match?.[1];
  const matchedRoute = match?.[0];

  if (!config) {
    if (pathname.startsWith("/app")) {
      return (
        <header className="sticky top-0 z-20 hidden w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
          <div className="flex h-12 items-center justify-end px-4">
            <ModeToggle />
          </div>
        </header>
      );
    }
    return null;
  }

  const Icon = config.icon;
  const title =
    matchedRoute === "/app/password-manager"
      ? tNav("passwordManager")
      : matchedRoute === "/app/bookmarks"
        ? tNav("bookmarks")
        : matchedRoute === "/app/email-validator"
          ? tNav("emailValidator")
          : matchedRoute === "/app/nosql-explorer"
            ? tNav("nosqlExplorer")
            : matchedRoute === "/app/json-formatter"
              ? tNav("jsonFormatter")
              : config.title;

  return (
    <header className="sticky top-0 z-20 hidden w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
      <div className="flex h-12 w-full items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
            <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <div className="shrink-0">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}