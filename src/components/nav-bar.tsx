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
  LayoutDashboard
} from "lucide-react";

// Route to title/icon mapping
const routeConfig: Record<string, { title: string; icon: React.ElementType }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/app/to-do': { title: 'Tasks', icon: CheckSquare },
  '/app/notes': { title: 'Notes', icon: FileText },
  '/app/password-manager': { title: 'Password Manager', icon: Lock },
  '/app/bookmarks': { title: 'Bookmarks', icon: Bookmark },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/nosql-explorer': { title: 'NoSQL Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
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

  if (!config) return null;

  const Icon = config.icon;
  const title =
    matchedRoute === "/app/password-manager"
      ? tNav("passwordManager")
      : matchedRoute === "/app/bookmarks"
        ? tNav("bookmarks")
        : matchedRoute === "/app/email-validator"
          ? tNav("emailValidator")
          : config.title;

  return (
    <header className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 hidden md:block">
      <div className="flex h-12 items-center px-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
    </header>
  );
}