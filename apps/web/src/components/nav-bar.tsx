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
  Contrast,
  Key,
  Regex,
  Clock,
  Repeat,
  Table2,
  GitCompare,
  GitMerge,
  Binary,
  FileCode2,
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
  ArrowRightLeft,
  List,
  KeyRound,
  BookKey,
  FlaskConical,
  Ruler,
  Shrink,
  Minimize2,
  Timer,
  LockKeyhole,
  Container,
} from "lucide-react";
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
  '/app/number-base-converter': {
    title: 'Number Base Converter',
    icon: ArrowRightLeft,
    namespace: 'NumberBaseConverter',
  },
  '/app/image-to-base64': { title: 'Image to Base64', icon: ImageIcon, namespace: 'ImageToBase64' },
  '/app/image-compressor': { title: 'Image Compressor', icon: Minimize2, namespace: 'ImageCompressor' },
  '/app/json-formatter': { title: 'JSON Formatter', icon: Braces, namespace: 'JsonFormatter' },
  '/app/json-schema-generator': {
    title: 'JSON Schema Generator',
    icon: Braces,
    namespace: 'JsonSchemaGenerator',
  },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/http-status-codes': { title: 'HTTP Status Codes', icon: List, namespace: 'HttpStatusCodes' },
  '/app/nosql-explorer': { title: 'NoSQL Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
  '/app/url-encode': { title: 'URL Encoder / Decoder', icon: Link2, namespace: 'UrlEncode' },
  '/app/uuid-generator': { title: 'UUID / ULID Generator', icon: Fingerprint, namespace: 'UuidGenerator' },
  '/app/secret-api-key-generator': {
    title: 'Secret / API Key Generator',
    icon: KeyRound,
    namespace: 'SecretApiKeyGenerator',
  },
  '/app/qr-code-generator': { title: 'QR Code Generator', icon: QrCode, namespace: 'QrCodeGenerator' },
  '/app/ip-subnet-calculator': { title: 'IP / Subnet Calculator', icon: Calculator, namespace: 'IpSubnetCalculator' },
  '/app/hash-generator': { title: 'Hash Generator', icon: Hash, namespace: 'HashGenerator' },
  '/app/hmac-generator': { title: 'HMAC Generator', icon: ShieldCheck, namespace: 'HmacGenerator' },
  '/app/totp-generator': { title: 'TOTP / 2FA Code Generator', icon: Timer, namespace: 'TotpGenerator' },
  '/app/markdown-preview-html': { title: 'Markdown Preview', icon: FileDown, namespace: 'MarkdownPreview' },
  '/app/format-converter': { title: 'Format Converter', icon: FileCode, namespace: 'FormatConverter' },
  '/app/lorem-ipsum': { title: 'Lorem Ipsum Generator', icon: TextQuote, namespace: 'LoremIpsum' },
  '/app/color-picker': { title: 'Color Picker', icon: Palette, namespace: 'ColorPicker' },
  '/app/contrast-checker': { title: 'Contrast Checker', icon: Contrast, namespace: 'ContrastChecker' },
  '/app/css-gradient-builder': { title: 'CSS Gradient Builder', icon: Paintbrush, namespace: 'CssGradientBuilder' },
  '/app/gitignore-generator': { title: '.gitignore Generator', icon: FileMinus, namespace: 'GitignoreGenerator' },
  '/app/docker-compose-generator': {
    title: 'Docker Compose Generator',
    icon: Container,
    namespace: 'DockerComposeGenerator',
  },
  '/app/jwt-decoder': { title: 'JWT Decoder', icon: Key, namespace: 'JwtDecoder' },
  '/app/encryption-playground': {
    title: 'Encryption Playground',
    icon: LockKeyhole,
    namespace: 'EncryptionPlayground',
  },
  '/app/certificate-pem-decoder': {
    title: 'Certificate / PEM Decoder',
    icon: BookKey,
    namespace: 'CertificatePemDecoder',
  },
  '/app/regex-tester': { title: 'Regex Tester', icon: Regex, namespace: 'RegexTester' },
  '/app/timestamp-converter': { title: 'Timestamp Converter', icon: Clock, namespace: 'TimestampConverter' },
  '/app/cron-builder': { title: 'Cron Builder', icon: Repeat, namespace: 'CronBuilder' },
  '/app/sql-formatter': { title: 'SQL Formatter', icon: Table2, namespace: 'SqlFormatter' },
  '/app/graphql-formatter': {
    title: 'GraphQL Formatter',
    icon: GitMerge,
    namespace: 'GraphqlFormatter',
  },
  '/app/diff-checker': { title: 'Diff checker', icon: GitCompare, namespace: 'DiffChecker' },
  '/app/csv-excel-json': { title: 'CSV / Excel ↔ JSON', icon: FileSpreadsheet, namespace: 'CsvExcelJson' },
  '/app/snippet-manager': { title: 'Code Snippets', icon: FileCode, namespace: 'SnippetManager' },
  '/app/mock-data-generator': {
    title: 'Mock Data Generator',
    icon: FlaskConical,
    namespace: 'MockDataGenerator',
  },
  '/app/unit-converter': {
    title: 'Unit Converter',
    icon: Ruler,
    namespace: 'UnitConverter',
  },
  '/app/svg-optimizer': {
    title: 'SVG Optimizer / Minifier',
    icon: Shrink,
    namespace: 'SvgOptimizer',
  },
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
