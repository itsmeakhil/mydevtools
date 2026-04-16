"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
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
  Table2,
  GitCompare,
  Binary,
  FileCode2,
  Coffee,
  Image as ImageIcon,
  Paintbrush,
  FileMinus,
  FileSpreadsheet,
  FileCode,
  QrCode,
  Calculator,
  Hash,
  ShieldCheck,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/modeToggle";
import { getToolMessageKey } from "@/lib/tool-i18n";

/** Strip HTML-like tags and ICU {variable} placeholders from rich-text subtitles. */
function cleanSubtitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\s*\{[^}]+\}\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const routeConfig: Record<string, { title: string; icon: React.ElementType; namespace?: string }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/app/to-do': { title: 'Tasks', icon: CheckSquare },
  '/app/notes': { title: 'Notes', icon: FileText },
  '/app/password-manager': { title: 'Password Manager', icon: Lock },
  '/app/environment-manager': { title: 'Environment Manager', icon: FileCode2, namespace: 'EnvironmentManager' },
  '/app/bookmarks': { title: 'Bookmarks', icon: Bookmark },
  '/app/base64': { title: 'Base64', icon: Binary, namespace: 'Base64' },
  '/app/image-to-base64': { title: 'Image to Base64', icon: ImageIcon, namespace: 'ImageToBase64' },
  '/app/json-formatter': { title: 'JSON Formatter', icon: Braces, namespace: 'JsonFormatter' },
  '/app/json-schema-generator': {
    title: 'JSON Schema Generator',
    icon: Braces,
    namespace: 'JsonSchemaGenerator',
  },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/nosql-explorer': { title: 'NoSQL Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
  '/app/url-encode': { title: 'URL Encoder / Decoder', icon: Link2, namespace: 'UrlEncode' },
  '/app/uuid-generator': { title: 'UUID / ULID Generator', icon: Fingerprint, namespace: 'UuidGenerator' },
  '/app/qr-code-generator': { title: 'QR Code Generator', icon: QrCode, namespace: 'QrCodeGenerator' },
  '/app/ip-subnet-calculator': { title: 'IP / Subnet Calculator', icon: Calculator, namespace: 'IpSubnetCalculator' },
  '/app/hash-generator': { title: 'Hash Generator', icon: Hash, namespace: 'HashGenerator' },
  '/app/hmac-generator': { title: 'HMAC Generator', icon: ShieldCheck, namespace: 'HmacGenerator' },
  '/app/markdown-preview-html': { title: 'Markdown Preview', icon: FileDown, namespace: 'MarkdownPreview' },
  '/app/lorem-ipsum': { title: 'Lorem Ipsum Generator', icon: TextQuote, namespace: 'LoremIpsum' },
  '/app/color-picker': { title: 'Color Picker', icon: Palette, namespace: 'ColorPicker' },
  '/app/css-gradient-builder': { title: 'CSS Gradient Builder', icon: Paintbrush, namespace: 'CssGradientBuilder' },
  '/app/gitignore-generator': { title: '.gitignore Generator', icon: FileMinus, namespace: 'GitignoreGenerator' },
  '/app/jwt-decoder': { title: 'JWT Decoder', icon: Key, namespace: 'JwtDecoder' },
  '/app/regex-tester': { title: 'Regex Tester', icon: Regex, namespace: 'RegexTester' },
  '/app/timestamp-converter': { title: 'Timestamp Converter', icon: Clock, namespace: 'TimestampConverter' },
  '/app/cron-builder': { title: 'Cron Builder', icon: Repeat, namespace: 'CronBuilder' },
  '/app/sql-formatter': { title: 'SQL Formatter', icon: Table2, namespace: 'SqlFormatter' },
  '/app/diff-checker': { title: 'Diff checker', icon: GitCompare, namespace: 'DiffChecker' },
  '/app/csv-excel-json': { title: 'CSV / Excel ↔ JSON', icon: FileSpreadsheet, namespace: 'CsvExcelJson' },
  '/app/snippet-manager': { title: 'Code Snippets', icon: FileCode, namespace: 'SnippetManager' },
};

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
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 border-amber-500/40 bg-[#FFDD00] text-neutral-900 hover:bg-[#f5d400] hover:text-neutral-900 dark:bg-[#FFDD00] dark:hover:bg-[#f5d400] dark:text-neutral-900"
              asChild
            >
              <a
                href="https://buymeacoffee.com/itsmeakhil"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy me a coffee"
              >
                <Coffee className="h-4 w-4" />
              </a>
            </Button>
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
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-amber-500/40 bg-[#FFDD00] text-neutral-900 hover:bg-[#f5d400] hover:text-neutral-900 dark:bg-[#FFDD00] dark:hover:bg-[#f5d400] dark:text-neutral-900"
            asChild
          >
            <a
              href="https://buymeacoffee.com/itsmeakhil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy me a coffee"
            >
              <Coffee className="h-4 w-4" />
            </a>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
