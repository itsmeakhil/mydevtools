export type FieldType =
  | 'first_name' | 'last_name' | 'full_name' | 'email' | 'username' | 'password'
  | 'phone' | 'company' | 'job_title'
  | 'city' | 'country' | 'country_code' | 'street_address' | 'zip_code' | 'latitude' | 'longitude'
  | 'url' | 'domain' | 'ip_address' | 'ipv6' | 'mac_address'
  | 'uuid' | 'boolean' | 'integer' | 'float'
  | 'date' | 'datetime' | 'unix_timestamp'
  | 'word' | 'sentence' | 'paragraph' | 'hex_color' | 'rgb_color' | 'currency_code'
  | 'credit_card' | 'http_method' | 'http_status' | 'semver' | 'slug'
  | 'language_code' | 'timezone' | 'avatar_url'
  | 'row_index' | 'sequence'
  | 'custom_list'

export type FieldOptions = {
  min?: number
  max?: number
  decimals?: number
  dateFrom?: string
  dateTo?: string
  values?: string
  /** 0–100: approximate fraction of cells left empty (`null` in JSON, empty in CSV, NULL in SQL). */
  blankPercent?: number
  step?: number
  /** For `row_index`: first row value (0 or 1). Default 1. */
  rowIndexBase?: number
}

export type FieldSchema = {
  name: string
  type: FieldType
  options?: FieldOptions
}

export type OutputFormat = 'json' | 'csv' | 'sql' | 'xml'

export type GenerateOptions = {
  schema: FieldSchema[]
  rows: number
  format: OutputFormat
  tableName?: string
  /**
   * Optional reproducibility seed. Same seed + same schema → identical output.
   * Strings are hashed (FNV-1a); `undefined`/`''` means non-deterministic.
   * Note: date/datetime/unix_timestamp fields without explicit dateFrom/dateTo
   * default their upper bound to today, so byte-identical replay across days
   * requires explicit date ranges.
   */
  seed?: number | string
}

export const MAX_MOCK_ROWS = 5000

/**
 * Row counts at or below this generate synchronously on the main thread —
 * the Web Worker round-trip costs more than the generation itself. Above it,
 * generation moves off-thread (see hooks/use-mock-data-worker.ts).
 */
export const WORKER_ROW_THRESHOLD = 500

export function shouldUseMockDataWorker(rows: number, workerAvailable: boolean): boolean {
  return workerAvailable && rows > WORKER_ROW_THRESHOLD
}

/**
 * Schema for the type picker; labels come from `MockDataGenerator.groups` and
 * `MockDataGenerator.fieldTypes` in locale message files.
 */
export const FIELD_TYPE_GROUP_STRUCTURE: { groupKey: string; types: FieldType[] }[] = [
  {
    groupKey: 'personal',
    types: [
      'first_name', 'last_name', 'full_name', 'email', 'username', 'password',
      'phone', 'company', 'job_title', 'avatar_url',
    ],
  },
  {
    groupKey: 'location',
    types: [
      'city', 'country', 'country_code', 'street_address', 'zip_code', 'latitude', 'longitude',
    ],
  },
  {
    groupKey: 'internetApi',
    types: [
      'url', 'domain', 'ip_address', 'ipv6', 'mac_address', 'http_method', 'http_status',
    ],
  },
  {
    groupKey: 'numbersIds',
    types: [
      'integer', 'float', 'boolean', 'uuid', 'credit_card', 'semver', 'row_index', 'sequence',
    ],
  },
  {
    groupKey: 'dateTime',
    types: ['date', 'datetime', 'unix_timestamp', 'timezone'],
  },
  {
    groupKey: 'textDesign',
    types: [
      'word', 'sentence', 'paragraph', 'slug', 'hex_color', 'rgb_color', 'currency_code', 'language_code',
    ],
  },
  {
    groupKey: 'custom',
    types: ['custom_list'],
  },
]

export const TYPES_WITH_OPTIONS: FieldType[] = [
  'integer', 'float', 'date', 'datetime', 'unix_timestamp', 'custom_list',
  'sequence', 'row_index',
]

export const ALL_FIELD_TYPES: FieldType[] = FIELD_TYPE_GROUP_STRUCTURE.flatMap((g) => g.types)

/** @deprecated Use ALL_FIELD_TYPES; kept for any external imports. */
export const ALL_TYPES_FLAT = ALL_FIELD_TYPES.map((value) => ({ value, label: value }))

export function schemaHasDuplicateFieldNames(schema: FieldSchema[]): boolean {
  const seen = new Set<string>()
  for (const f of schema) {
    const key = (f.name || '').trim() || 'field'
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'James',
  'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rachel', 'Sam', 'Tara',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe', 'Aaron', 'Beth', 'Carlos', 'Dena',
  'Elena', 'Felix', 'Gina', 'Hugo', 'Ivy', 'Jordan', 'Karen', 'Luke', 'Maria', 'Nick',
  'Oscar', 'Patricia', 'Robert', 'Susan', 'Thomas', 'Ursula', 'Vincent', 'Aisha', 'Bruno', 'Clara',
  'David', 'Emma', 'George', 'Hannah', 'Ivan', 'Julia', 'Kevin', 'Laura', 'Mason', 'Nancy',
  'Owen', 'Penny', 'Ruby', 'Stefan', 'Tessa', 'Violet', 'Wade', 'Xander', 'Yasmin', 'Zara',
  'Adrian', 'Beatrice', 'Caleb', 'Delilah', 'Elliot', 'Freya', 'Gavin', 'Helena', 'Igor', 'Jenna',
  'Kyle', 'Lily', 'Marcus', 'Nina', 'Oliver', 'Phoebe', 'Quentin', 'Rena', 'Sebastian', 'Theresa',
  'Umar', 'Valentina', 'William', 'Ximena', 'Yusuf', 'Amelia', 'Brian', 'Chloe', 'Dylan',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Turner',
  'Phillips', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan',
  'Bell', 'Murphy', 'Bailey', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Peterson', 'Gray',
  'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes',
]

const CITIES = [
  'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Sydney', 'Berlin', 'Toronto', 'Singapore', 'Dubai',
  'Mumbai', 'Beijing', 'Moscow', 'São Paulo', 'Mexico City', 'Buenos Aires', 'Cairo', 'Istanbul', 'Seoul', 'Jakarta',
  'Bangkok', 'Lagos', 'Johannesburg', 'Nairobi', 'Amsterdam', 'Brussels', 'Vienna', 'Prague', 'Warsaw', 'Stockholm',
  'Oslo', 'Helsinki', 'Copenhagen', 'Dublin', 'Lisbon', 'Madrid', 'Rome', 'Athens', 'Zurich', 'Geneva',
  'Tel Aviv', 'Riyadh', 'Doha', 'Karachi', 'Dhaka', 'Manila', 'Ho Chi Minh City', 'Kuala Lumpur', 'Vancouver', 'Melbourne',
]

const COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Canada', 'China', 'India', 'Brazil',
  'South Korea', 'Mexico', 'Italy', 'Spain', 'Russia', 'Indonesia', 'Turkey', 'Saudi Arabia', 'Netherlands', 'Switzerland',
  'Argentina', 'Poland', 'Sweden', 'Belgium', 'Norway', 'Austria', 'Denmark', 'Finland', 'Portugal', 'Greece',
  'Czech Republic', 'Ireland', 'New Zealand', 'Singapore', 'UAE', 'Egypt', 'South Africa', 'Nigeria', 'Kenya', 'Pakistan',
]

const COUNTRY_CODES = [
  'US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA', 'CN', 'IN', 'BR', 'KR', 'MX', 'IT', 'ES', 'RU', 'ID', 'TR', 'NL', 'CH', 'SE',
]

const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'company.com', 'example.org', 'dev.io', 'techcorp.net', 'mail.co',
]

const STREET_NAMES = [
  'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Lincoln', 'Park', 'Main', 'Lake',
  'Hill', 'River', 'Forest', 'Valley', 'Spring', 'Sunset', 'Highland', 'Meadow', 'Stone', 'Green',
  'Church', 'Mill', 'Bridge', 'Grand', 'Union', 'Market', 'Harbor', 'Orchard', 'Pleasant', 'Summit',
]

const STREET_TYPES = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Lane', 'Road', 'Way', 'Court', 'Place', 'Circle']

const COMPANIES = [
  'Tech Corp', 'DataSoft Inc', 'CloudBase Solutions', 'Nexus Systems', 'Vertex Analytics',
  'Digital Frontier', 'Quantum Tech', 'InnovateCo', 'TechWave', 'ByteForce',
  'PrimeEdge', 'CoreTech', 'DataPeak', 'SwiftCode Ltd', 'OpenPath Inc',
  'NovaByte', 'ClearStack', 'IronBridge Tech', 'AlgoWorks', 'SilverLine Digital',
  'RedShift Labs', 'BlueSpark Inc', 'GreenByte Solutions', 'Nexus Cloud', 'Apex Digital',
]

const JOB_TITLES = [
  'Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'UX Designer',
  'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'Machine Learning Engineer', 'Cloud Architect',
  'Database Administrator', 'QA Engineer', 'Security Analyst', 'Mobile Developer', 'API Developer',
  'Systems Administrator', 'Site Reliability Engineer', 'Technical Lead', 'Engineering Manager', 'Data Engineer',
  'Platform Engineer', 'Infrastructure Engineer', 'Solutions Architect', 'Tech Lead', 'CTO',
]

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL',
  'KRW', 'MXN', 'SGD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'HKD', 'TRY',
]

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua', 'enim', 'minim', 'veniam',
  'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'consequat', 'duis', 'aute', 'irure',
  'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim',
  'est', 'laborum', 'perspiciatis', 'natus', 'error', 'accusantium', 'laudantium', 'totam', 'aperiam', 'eaque',
]

const URL_PATHS = [
  '/users', '/products', '/orders', '/api/v1/data', '/api/v2/records',
  '/blog/posts', '/docs/overview', '/dashboard', '/settings/profile', '/reports/summary',
  '/items/list', '/events', '/metrics', '/resources', '/catalog',
]

const URL_HOSTS = [
  'example.com', 'api.service.io', 'data.platform.net', 'app.company.org', 'portal.dev.co',
  'api.example.io', 'demo.service.com', 'test.platform.dev',
]

const DOMAIN_NAMES = [
  'acme.dev', 'northwind.io', 'contoso.com', 'globex.net', 'initech.org',
  'umbrella.corp', 'stark.industries', 'wayne.tech', 'cyberdyne.systems', 'soylent.green',
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const HTTP_STATUSES = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'Africa/Johannesburg',
]

const LANGUAGE_TAGS = ['en', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP', 'pt-BR', 'zh-Hans', 'ko-KR']

/** Test PANs only — safe for fixtures (not real cards). */
const TEST_CREDIT_CARDS = [
  '4111111111111111',
  '4005550000000019',
  '5425233430109903',
  '2223003122003222',
  '378282246310005',
]

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

/** mulberry32 — tiny deterministic PRNG; returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a 32-bit — hashes string seeds to a mulberry32 seed. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Current random source. `generateMockData` swaps this for a seeded PRNG for
 * the duration of a seeded run and resets it in `finally`. Module-level (not
 * a threaded param) because the module is synchronous with a single public
 * entry point and ~45 generator helpers.
 */
let rng: () => number = Math.random
/** True during a seeded run — makes genUuid skip non-deterministic crypto.randomUUID. */
let deterministic = false

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]
}

function randFloat(min: number, max: number, decimals: number): number {
  return parseFloat((rng() * (max - min) + min).toFixed(decimals))
}

function shouldBlank(blankPercent: number | undefined): boolean {
  if (blankPercent == null || blankPercent <= 0) return false
  return rng() * 100 < Math.min(100, blankPercent)
}

// ─── Generators ──────────────────────────────────────────────────────────────

function genFirstName(): string { return pick(FIRST_NAMES) }
function genLastName(): string { return pick(LAST_NAMES) }
function genFullName(): string { return `${genFirstName()} ${genLastName()}` }

function genEmail(): string {
  const fn = pick(FIRST_NAMES).toLowerCase().replace(/[^a-z]/g, '')
  const ln = pick(LAST_NAMES).toLowerCase().replace(/[^a-z]/g, '')
  const sep = pick(['.', '_', ''])
  const suffix = rand(0, 1) ? String(rand(1, 99)) : ''
  return `${fn}${sep}${ln}${suffix}@${pick(EMAIL_DOMAINS)}`
}

function genUsername(): string {
  const fn = pick(FIRST_NAMES).toLowerCase().replace(/[^a-z]/g, '')
  const ln = pick(LAST_NAMES).toLowerCase().replace(/[^a-z]/g, '')
  const suffix = rand(0, 1) ? String(rand(1, 999)) : ''
  return `${fn}_${ln}${suffix}`
}

function genPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  return Array.from({ length: rand(10, 16) }, () => chars[rand(0, chars.length - 1)]).join('')
}

function genPhone(): string {
  return `+1-${rand(200, 999)}-${rand(100, 999)}-${rand(1000, 9999)}`
}

function genCompany(): string { return pick(COMPANIES) }
function genJobTitle(): string { return pick(JOB_TITLES) }
function genCity(): string { return pick(CITIES) }
function genCountry(): string { return pick(COUNTRIES) }
function genCountryCode(): string { return pick(COUNTRY_CODES) }

function genStreetAddress(): string {
  return `${rand(1, 9999)} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`
}

function genZipCode(): string {
  return String(rand(10000, 99999))
}

function genLatitude(): number { return randFloat(-90, 90, 6) }
function genLongitude(): number { return randFloat(-180, 180, 6) }

function genUrl(): string {
  return `https://${pick(URL_HOSTS)}${pick(URL_PATHS)}`
}

function genDomain(): string {
  const base = pick(DOMAIN_NAMES)
  if (rng() < 0.35) {
    const sub = pick(['api', 'app', 'cdn', 'staging', 'dev', 'www'])
    return `${sub}.${base}`
  }
  return base
}

function genIpAddress(): string {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`
}

function genIpv6(): string {
  const parts = Array.from({ length: 8 }, () =>
    rand(0, 65535).toString(16)
  )
  return parts.join(':')
}

function genMacAddress(): string {
  return Array.from({ length: 6 }, () => rand(0, 255).toString(16).padStart(2, '0')).join(':')
}

function genUuid(): string {
  if (!deterministic && typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (rng() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function genBoolean(): boolean { return rng() < 0.5 }

function genInteger(min = 1, max = 1000): number { return rand(min, max) }

function genFloat(min = 0.0, max = 1.0, decimals = 2): number {
  return randFloat(min, max, decimals)
}

function genDate(from = '2020-01-01', to = new Date().toISOString().slice(0, 10)): string {
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  return new Date(fromMs + rng() * (toMs - fromMs)).toISOString().slice(0, 10)
}

function genDatetime(from = '2020-01-01', to = new Date().toISOString().slice(0, 10)): string {
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to + 'T23:59:59').getTime()
  return new Date(fromMs + rng() * (toMs - fromMs)).toISOString()
}

function genUnixTimestamp(from = '2020-01-01', to = new Date().toISOString().slice(0, 10)): number {
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  return Math.floor((fromMs + rng() * (toMs - fromMs)) / 1000)
}

function genWord(): string { return pick(LOREM_WORDS) }

function genSentence(): string {
  const words = Array.from({ length: rand(6, 14) }, () => pick(LOREM_WORDS))
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ') + '.'
}

function genParagraph(): string {
  return Array.from({ length: rand(3, 6) }, genSentence).join(' ')
}

function genHexColor(): string {
  return '#' + Array.from({ length: 6 }, () => rand(0, 15).toString(16)).join('')
}

function genRgbColor(): string {
  return `rgb(${rand(0, 255)}, ${rand(0, 255)}, ${rand(0, 255)})`
}

function genCurrencyCode(): string { return pick(CURRENCIES) }

function genCreditCard(): string { return pick(TEST_CREDIT_CARDS) }

function genHttpMethod(): string { return pick(HTTP_METHODS) }

function genHttpStatus(): number { return pick(HTTP_STATUSES) }

function genSemver(): string {
  return `${rand(0, 5)}.${rand(0, 20)}.${rand(0, 30)}`
}

function genSlug(): string {
  const a = pick(LOREM_WORDS)
  const b = pick(LOREM_WORDS)
  const n = rand(1, 9999)
  return `${a}-${b}-${n}`
}

function genLanguageCode(): string { return pick(LANGUAGE_TAGS) }

function genTimezone(): string { return pick(TIMEZONES) }

function genAvatarUrl(): string {
  const id = rand(1, 70)
  return `https://i.pravatar.cc/150?img=${id}`
}

function genCustomList(values: string): string {
  const list = values.split(',').map(v => v.trim()).filter(Boolean)
  return list.length > 0 ? pick(list) : ''
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function generateValue(field: FieldSchema, rowIndex: number): unknown {
  const opts = field.options ?? {}
  if (shouldBlank(opts.blankPercent)) return null

  switch (field.type) {
    case 'first_name':      return genFirstName()
    case 'last_name':       return genLastName()
    case 'full_name':       return genFullName()
    case 'email':           return genEmail()
    case 'username':        return genUsername()
    case 'password':        return genPassword()
    case 'phone':           return genPhone()
    case 'company':         return genCompany()
    case 'job_title':       return genJobTitle()
    case 'city':            return genCity()
    case 'country':         return genCountry()
    case 'country_code':    return genCountryCode()
    case 'street_address':  return genStreetAddress()
    case 'zip_code':        return genZipCode()
    case 'latitude':        return genLatitude()
    case 'longitude':       return genLongitude()
    case 'url':             return genUrl()
    case 'domain':          return genDomain()
    case 'ip_address':      return genIpAddress()
    case 'ipv6':            return genIpv6()
    case 'mac_address':     return genMacAddress()
    case 'uuid':            return genUuid()
    case 'boolean':         return genBoolean()
    case 'integer':         return genInteger(opts.min ?? 1, opts.max ?? 1000)
    case 'float':           return genFloat(opts.min ?? 0, opts.max ?? 1, opts.decimals ?? 2)
    case 'date':            return genDate(opts.dateFrom, opts.dateTo)
    case 'datetime':        return genDatetime(opts.dateFrom, opts.dateTo)
    case 'unix_timestamp':  return genUnixTimestamp(opts.dateFrom, opts.dateTo)
    case 'word':            return genWord()
    case 'sentence':        return genSentence()
    case 'paragraph':       return genParagraph()
    case 'hex_color':       return genHexColor()
    case 'rgb_color':       return genRgbColor()
    case 'currency_code':   return genCurrencyCode()
    case 'credit_card':     return genCreditCard()
    case 'http_method':     return genHttpMethod()
    case 'http_status':     return genHttpStatus()
    case 'semver':          return genSemver()
    case 'slug':            return genSlug()
    case 'language_code':   return genLanguageCode()
    case 'timezone':        return genTimezone()
    case 'avatar_url':      return genAvatarUrl()
    case 'row_index':       return rowIndex + (opts.rowIndexBase ?? 1)
    case 'sequence':        return (opts.min ?? 1) + rowIndex * (opts.step ?? 1)
    case 'custom_list':     return genCustomList(opts.values ?? '')
    default:                return ''
  }
}

function generateRows(schema: FieldSchema[], count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, rowIndex) => {
    const row: Record<string, unknown> = {}
    for (const field of schema) {
      const key = (field.name || 'field').trim() || 'field'
      row[key] = generateValue(field, rowIndex)
    }
    return row
  })
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

function formatAsJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2)
}

function formatAsCsv(rows: Record<string, unknown>[], schema: FieldSchema[]): string {
  const keys = schema.map(f => (f.name || 'field').trim() || 'field')
  const headers = keys.map(k => csvEscape(k)).join(',')
  const dataRows = rows.map(row =>
    keys.map(k => csvEscape(formatCell(row[k]))).join(',')
  )
  return [headers, ...dataRows].join('\n')
}

function formatAsSql(rows: Record<string, unknown>[], schema: FieldSchema[], tableName: string): string {
  const table = tableName || 'records'
  const keys = schema.map(f => (f.name || 'field').trim() || 'field')
  const columns = keys.map(k => `\`${k.replace(/`/g, '``')}\``).join(', ')
  const valueRows = rows.map(row => {
    const vals = keys.map(k => {
      const val = row[k]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
      if (typeof val === 'number') return String(val)
      return `'${String(val).replace(/'/g, "''")}'`
    }).join(', ')
    return `  (${vals})`
  })
  return `INSERT INTO \`${table.replace(/`/g, '``')}\` (${columns})\nVALUES\n${valueRows.join(',\n')};`
}

function xmlEscapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function xmlEscapeAttr(s: string): string {
  return xmlEscapeText(s).replace(/"/g, '&quot;')
}

function formatAsXml(rows: Record<string, unknown>[], schema: FieldSchema[]): string {
  const keys = schema.map(f => (f.name || 'field').trim() || 'field')
  const body = rows.map((row) => {
    const fields = keys.map((k) => {
      const val = row[k]
      if (val === null || val === undefined) {
        return `    <field name="${xmlEscapeAttr(k)}" />`
      }
      return `    <field name="${xmlEscapeAttr(k)}">${xmlEscapeText(formatCell(val))}</field>`
    }).join('\n')
    return `  <row>\n${fields}\n  </row>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<dataset>\n${body}\n</dataset>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateMockData(options: GenerateOptions): string {
  const { schema, rows, format, tableName, seed } = options
  if (schema.length === 0 || rows <= 0) return ''
  const clampedRows = Math.min(Math.max(1, rows), MAX_MOCK_ROWS)
  const hasSeed = seed !== undefined && seed !== ''
  rng = hasSeed
    ? mulberry32(typeof seed === 'number' ? seed >>> 0 : fnv1a(String(seed)))
    : Math.random
  deterministic = hasSeed
  try {
    const data = generateRows(schema, clampedRows)
    switch (format) {
      case 'json': return formatAsJson(data)
      case 'csv':  return formatAsCsv(data, schema)
      case 'sql':  return formatAsSql(data, schema, tableName ?? 'records')
      case 'xml':  return formatAsXml(data, schema)
      default:     return ''
    }
  } finally {
    rng = Math.random
    deterministic = false
  }
}
