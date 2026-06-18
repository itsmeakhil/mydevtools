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
  Server,
  HardDrive,
  FileSearch,
  UserCheck,
  SplitSquareHorizontal,
  Gamepad2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface RouteConfig {
  title: string
  icon: LucideIcon
  namespace?: string
}

export const routeConfig: Record<string, RouteConfig> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/app/to-do': { title: 'Tasks', icon: CheckSquare },
  '/app/notes': { title: 'Notes', icon: FileText },
  '/app/password-manager': { title: 'Password Manager', icon: Lock },
  '/app/environment-manager': { title: 'Environment Manager', icon: FileCode2, namespace: 'EnvironmentManager' },
  '/app/bookmarks': { title: 'Bookmarks', icon: Bookmark },
  '/app/base64': { title: 'Base64', icon: Binary, namespace: 'Base64' },
  '/app/number-base-converter': { title: 'Number Base Converter', icon: ArrowRightLeft, namespace: 'NumberBaseConverter' },
  '/app/image-to-base64': { title: 'Image to Base64', icon: ImageIcon, namespace: 'ImageToBase64' },
  '/app/image-compressor': { title: 'Image Compressor', icon: Minimize2, namespace: 'ImageCompressor' },
  '/app/json-formatter': { title: 'JSON Formatter', icon: Braces, namespace: 'JsonFormatter' },
  '/app/json-schema-generator': { title: 'JSON Schema Generator', icon: Braces, namespace: 'JsonSchemaGenerator' },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/http-status-codes': { title: 'HTTP Status Codes', icon: List, namespace: 'HttpStatusCodes' },
  '/app/database-explorer': { title: 'Database Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
  '/app/url-encode': { title: 'URL Encoder / Decoder', icon: Link2, namespace: 'UrlEncode' },
  '/app/uuid-generator': { title: 'UUID / ULID Generator', icon: Fingerprint, namespace: 'UuidGenerator' },
  '/app/secret-api-key-generator': { title: 'Secret / API Key Generator', icon: KeyRound, namespace: 'SecretApiKeyGenerator' },
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
  '/app/docker-compose-generator': { title: 'Docker Compose Generator', icon: Container, namespace: 'DockerComposeGenerator' },
  '/app/jwt-decoder': { title: 'JWT Decoder', icon: Key, namespace: 'JwtDecoder' },
  '/app/encryption-playground': { title: 'Encryption Playground', icon: LockKeyhole, namespace: 'EncryptionPlayground' },
  '/app/certificate-pem-decoder': { title: 'Certificate / PEM Decoder', icon: BookKey, namespace: 'CertificatePemDecoder' },
  '/app/regex-tester': { title: 'Regex Tester', icon: Regex, namespace: 'RegexTester' },
  '/app/timestamp-converter': { title: 'Timestamp Converter', icon: Clock, namespace: 'TimestampConverter' },
  '/app/cron-builder': { title: 'Cron Builder', icon: Repeat, namespace: 'CronBuilder' },
  '/app/sql-formatter': { title: 'SQL Formatter', icon: Table2, namespace: 'SqlFormatter' },
  '/app/graphql-formatter': { title: 'GraphQL Formatter', icon: GitMerge, namespace: 'GraphqlFormatter' },
  '/app/yaml-formatter': { title: 'YAML Formatter', icon: FileCode2, namespace: 'YamlFormatter' },
  '/app/diff-checker': { title: 'Diff checker', icon: GitCompare, namespace: 'DiffChecker' },
  '/app/csv-excel-json': { title: 'CSV / Excel ↔ JSON', icon: FileSpreadsheet, namespace: 'CsvExcelJson' },
  '/app/snippet-manager': { title: 'Code Snippets', icon: FileCode, namespace: 'SnippetManager' },
  '/app/mock-data-generator': { title: 'Mock Data Generator', icon: FlaskConical, namespace: 'MockDataGenerator' },
  '/app/unit-converter': { title: 'Unit Converter', icon: Ruler, namespace: 'UnitConverter' },
  '/app/svg-optimizer': { title: 'SVG Optimizer / Minifier', icon: Shrink, namespace: 'SvgOptimizer' },
  '/app/mime-type-lookup': { title: 'MIME Type Lookup', icon: FileSearch },
  '/app/url-parser': { title: 'URL Parser', icon: Link2 },
  '/app/user-agent-parser': { title: 'User Agent Parser', icon: UserCheck },
  '/app/sql-client': { title: 'SQL Client', icon: Server },
  '/app/s3-drive': { title: 'S3 Drive', icon: HardDrive },
  '/app/redis-commander': { title: 'Redis Commander', icon: Database },
  '/app/url-shortener': { title: 'URL Shortener', icon: Link2 },
  '/app/break-room/2048': { title: '2048', icon: Gamepad2 },
  '/app/break-room/sudoku': { title: 'Sudoku', icon: Gamepad2 },
  '/app/break-room/snake': { title: 'Snake', icon: Gamepad2 },
  '/app/break-room/minesweeper': { title: 'Minesweeper', icon: Gamepad2 },
  '/app/break-room/tetris': { title: 'Tetris', icon: Gamepad2 },
}

export const TAB_ENABLED_PREFIX = '/app/'

export function isTabRoute(path: string): boolean {
  return path.startsWith(TAB_ENABLED_PREFIX)
}

export function getRouteConfig(path: string): RouteConfig | undefined {
  // exact match first
  if (routeConfig[path]) return routeConfig[path]
  // prefix match for sub-routes
  const match = Object.entries(routeConfig).find(([route]) =>
    path === route || path.startsWith(route + '/')
  )
  return match?.[1]
}
