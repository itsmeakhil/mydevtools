import { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

function ogImageUrl(title: string, description: string): string {
    return `${baseUrl}/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
}

/** SEO + structured data; optional `aiSummary` adds an answer-first line for AI/search snippets. */
export interface ToolMetadataEntry {
    title: string
    description: string
    keywords: string[]
    aiSummary?: string
}

// Tool metadata definitions
export const toolsMetadata: Record<string, ToolMetadataEntry> = {
    'to-do': {
        title: 'Task Manager',
        description: 'Organize daily tasks, set priorities, and track your productivity. A to-do app built for developers.',
        keywords: ['to do list', 'task manager', 'todo app', 'task list', 'productivity'],
        aiSummary: 'Simple desktop task manager for developers: add tasks, set priorities, check them off. Runs locally in the all-in-one MyDevTools desktop app.',
    },
    'notes': {
        title: 'Notes',
        description: 'Create and manage notes quickly. Markdown-supported note-taking for developers.',
        keywords: ['notes app', 'note taking', 'quick notes', 'developer notes', 'markdown notes'],
        aiSummary: 'Quick Markdown-supported notes stored locally on your device. A developer notepad in the all-in-one MyDevTools desktop app — no Notion account required.',
    },
    'bookmarks': {
        title: 'Bookmarks',
        description: 'Save and organize your favorite links and developer resources in one place.',
        keywords: ['bookmarks manager', 'link organizer', 'developer resources', 'save links', 'favorites'],
        aiSummary: 'Local bookmark manager for developers: save URLs with titles and notes, organize by tags, all in the MyDevTools desktop app. A privacy-first bookmark organizer for developers.',
    },
    'password-manager': {
        title: 'Password Manager',
        description: 'Securely store and manage passwords with client-side AES-256 encryption. Zero-knowledge vault.',
        keywords: ['password manager', 'password vault', 'secure passwords', 'password storage', 'encrypted vault'],
        aiSummary: 'Zero-knowledge password vault: AES-256 encryption on your device, stored in a local encrypted database — no server, no sync. A privacy-first, encrypted password vault in the MyDevTools desktop app.',
    },
    'environment-manager': {
        title: 'Environment Manager',
        description: 'Organize environment variables by project and environment. Encrypted on your device with AES-256-GCM.',
        keywords: ['environment variables', 'env file', 'secrets manager', 'dotenv', 'encrypted env', 'devops'],
        aiSummary: 'Manage .env variables across projects and environments (dev/staging/prod) locally on your device. AES-256-GCM encrypted in a local vault — a privacy-first dotenv manager.',
    },
    'api-keys': {
        title: 'API Keys',
        description: 'Store API keys and secrets per environment (dev / staging / prod). AES-256-GCM encryption on your device — there is no server, nothing leaves your machine.',
        keywords: ['api key vault', 'api key manager', 'secrets manager', 'encrypted api keys', 'developer credentials', 'dev staging prod keys'],
        aiSummary: 'Zero-knowledge vault for API keys and secrets, scoped by environment (development / staging / production). AES-256-GCM encrypted locally on your device — a privacy-first personal secrets manager.',
    },
    'email-validator': {
        title: 'Email Validator',
        description: 'Verify and validate email addresses with MX record checks and RFC 5322 syntax validation.',
        keywords: ['email validator', 'email verification', 'mx record check', 'email syntax', 'validate email'],
        aiSummary: 'Validate email addresses with RFC 5322 syntax check and MX record lookup — an email validator with MX check in the MyDevTools desktop app.',
    },
    'json-formatter': {
        title: 'JSON Editor',
        description: 'Format, validate, and edit JSON data with text and tree views. Supports JSONPath queries.',
        keywords: ['json editor', 'json formatter', 'json validator', 'edit json', 'jsonpath', 'offline json formatter', 'json formatter desktop app'],
        aiSummary: 'A free JSON formatter and validator: MyDevTools JSON Editor formats invalid JSON, validates syntax, and supports JSONPath. Runs locally in the desktop app — nothing leaves your device.',
    },
    'json-schema-generator': {
        title: 'JSON Schema Generator',
        description: 'Generate JSON Schema (Draft 2020-12) and typed models for Python, TypeScript, Go, Rust, Java, C#, Dart, and Swift from sample JSON.',
        keywords: ['json schema', 'jsonschema', 'pydantic', 'typescript types', 'go struct from json', 'serde', 'openapi']
    },
    'api-client': {
        title: 'API Client',
        description: 'Test and debug HTTP requests with headers, body, and auth support. A lightweight Postman alternative for your desktop.',
        keywords: ['api client', 'http client', 'rest api tester', 'debug api', 'postman alternative'],
        aiSummary: 'Local REST client: send GET/POST/PUT/PATCH/DELETE with custom headers, auth, and body — a lightweight Postman alternative in the MyDevTools desktop app.',
    },
    'http-status-codes': {
        title: 'HTTP Status Codes Reference',
        description: 'Search and browse HTTP status codes (1xx–5xx) with short descriptions and RFC references.',
        keywords: ['http status codes', 'status code list', 'http response codes', '200 ok', '404 not found', '500 internal server error', 'rfc 9110'],
        aiSummary: 'Searchable reference for all HTTP status codes (1xx–5xx) with descriptions and RFC 9110 links. Answers "what does HTTP 422 mean", "list of HTTP status codes", or "HTTP 429 too many requests".',
    },
    'database-explorer': {
        title: 'Database Explorer',
        description: 'Explore and manage your MongoDB and SQL databases directly from your desktop.',
        keywords: ['database explorer', 'mongodb manager', 'mongo ui', 'mongodb client', 'database client'],
        aiSummary: 'Desktop database explorer: connect to any MongoDB instance or SQL database, browse collections and tables, query documents, and manage data. A local-first MongoDB GUI and database client.',
    },
    'redis-commander': {
        title: 'Redis Commander',
        description: 'Browse keys, inspect values, run raw commands, and flush patterns against any Redis instance. Credentials are encrypted locally on your device.',
        keywords: ['redis client', 'redis manager', 'redis browser', 'redis gui', 'redis commander', 'redis keys', 'redis cli'],
        aiSummary: 'Redis Commander lets you connect to Redis instances, browse and edit all key types (string, list, set, zset, hash), run raw commands via a console, and flush keys by pattern — with credentials encrypted locally.',
    },
    's3-drive': {
        title: 'S3 Drive',
        description: 'Manage AWS S3 and DigitalOcean Spaces buckets. Browse, upload, download, and delete files with end-to-end encrypted credentials.',
        keywords: ['s3 browser', 'aws s3 manager', 'digitalocean spaces', 's3 client', 'bucket manager', 'cloud storage browser', 's3 file manager'],
        aiSummary: 'S3 Drive lets you connect multiple AWS S3 or DigitalOcean Spaces buckets, browse folders, upload and download files, and manage objects — all with credentials encrypted locally before being stored.',
    },
    'url-encode': {
        title: 'URL Encoder / Decoder',
        description: 'Percent-encode or decode text for query strings and URI components with UTF-8 support.',
        keywords: ['url encode', 'url decode', 'percent encode', 'uri encode', 'encodeURIComponent'],
        aiSummary: 'Percent-encode text for URLs or decode encoded strings — a URL encoder/decoder with UTF-8 support that decodes %20 and more. Runs locally on your device.',
    },
    'url-parser': {
        title: 'URL Parser',
        description: 'Parse any URL into protocol, host, path, query parameters, and hash. Runs locally on your device.',
        keywords: ['url parser', 'parse url', 'url components', 'query params', 'hash fragment', 'protocol', 'hostname'],
        aiSummary: 'Paste any URL to break it into protocol, host, pathname, query parameters, and hash — extract query params and see the full URL components breakdown, locally on your device.',
    },
    'uuid-generator': {
        title: 'UUID / ULID Generator',
        description: 'Generate UUID v1–v7 or ULIDs with namespace options and bulk copy or download.',
        keywords: ['uuid generator', 'ulid generator', 'guid', 'uuid v4', 'uuid v7', 'bulk uuid'],
        aiSummary: 'Generate UUID v1 through v7 or ULIDs, bulk-generate multiple IDs, and copy or download — a UUID and ULID generator in the MyDevTools desktop app.',
    },
    'secret-api-key-generator': {
        title: 'Secret / API Key Generator',
        description: 'Generate cryptographically random strings with a configurable alphabet and length. Bulk copy or download; pairs with the UUID generator.',
        keywords: ['api key generator', 'secret generator', 'random string', 'crypto random', 'token generator', 'getrandomvalues'],
        aiSummary: 'Generate cryptographically random API keys, tokens, or secrets with custom length and alphabet (hex, alphanumeric, base62). Uses crypto.getRandomValues locally — a random API key and secret generator that runs on your device.',
    },
    'qr-code-generator': {
        title: 'QR Code Generator',
        description: 'Create PNG QR codes from any text or URL with error correction, colors, and margin. Runs entirely on your device.',
        keywords: ['qr code', 'qr generator', 'qrcode', 'png qr', 'wifi qr', 'vcard qr', 'offline qr'],
        aiSummary: 'Generate PNG QR codes from any text or URL with custom colors, error correction level, and margin. Download instantly. No server upload — a free, offline QR code generator that runs locally.',
    },
    'dns-lookup': {
        title: 'DNS Lookup',
        description: 'Query DNS records for any domain: A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, and PTR. See TTL, mail server priority, and SOA details.',
        keywords: ['dns lookup', 'dns checker', 'mx record lookup', 'txt record lookup', 'nameserver lookup', 'dns records', 'cname lookup', 'dns query', 'ptr record'],
        aiSummary: 'Look up DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, PTR) for any domain. Shows TTL values, MX priority, and SOA fields. A DNS records checker with MX record lookup and DNS propagation details.',
    },
    'ip-subnet-calculator': {
        title: 'IP / Subnet Calculator',
        description: 'Compute IPv4 and IPv6 CIDR details: netmask, wildcard, broadcast, first and last host, and subnet size. Runs locally on your device.',
        keywords: ['subnet calculator', 'cidr calculator', 'ip calculator', 'netmask', 'ipv6 subnet', 'network calculator', 'ip range'],
        aiSummary: 'Enter an IP/CIDR (e.g. 192.168.1.0/24) to get netmask, wildcard, broadcast, first/last host, and total hosts. IPv4 and IPv6 — a subnet calculator with CIDR to IP range.',
    },
    'hash-generator': {
        title: 'Hash Generator',
        description: 'Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 digests for text or files with hex output. All hashing runs locally on your device.',
        keywords: ['hash generator', 'sha256', 'md5', 'sha512', 'checksum', 'digest', 'file hash', 'crypto hash'],
        aiSummary: 'Compute MD5, SHA-1, SHA-256, SHA-384, or SHA-512 hashes for text or files locally — a SHA-256 hash and file checksum calculator.',
    },
    'hmac-generator': {
        title: 'HMAC Generator',
        description: 'Compute HMAC-SHA1, HMAC-SHA256, HMAC-SHA384, and HMAC-SHA512 signatures in hex or Base64 for webhook signing and API integration testing. Runs entirely on your device.',
        keywords: ['hmac', 'hmac sha256', 'webhook signature', 'api signing', 'stripe webhook', 'github webhook', 'message authentication'],
        aiSummary: 'Compute HMAC-SHA256 (and SHA1/384/512) signatures in hex or Base64 — useful for testing Stripe, GitHub, or custom webhook signatures. An HMAC generator for signing webhook payloads locally.',
    },
    'encryption-playground': {
        title: 'Encryption Playground',
        description: 'AES-GCM encrypt and decrypt locally with a raw key (hex or Base64) or a passphrase (PBKDF2-SHA256 + AES-GCM). Outputs a small JSON bundle you can copy and decrypt locally—educational and occasionally practical. Nothing is uploaded.',
        keywords: ['aes gcm', 'encrypt decrypt', 'web crypto', 'pbkdf2', 'passphrase encryption', 'aes-256-gcm', 'client side encryption', 'offline encryption'],
        aiSummary: 'AES-256-GCM encrypt/decrypt using a raw key or passphrase (PBKDF2). All crypto runs locally on your device — encrypt a string with a passphrase, a Web Crypto demo.',
    },
    'totp-generator': {
        title: 'TOTP / 2FA Code Generator',
        description: 'Paste a Base32 authenticator secret and see the current six-digit RFC 6238 TOTP code refresh every 30 seconds. SHA-1, 30-second step—ideal for testing MFA and sign-in flows. Runs entirely on your device.',
        keywords: ['totp', '2fa', 'two factor', 'authenticator', 'google authenticator', 'RFC 6238', 'one-time password', 'MFA test', 'otp'],
        aiSummary: 'Paste a Base32 TOTP secret to get the current 6-digit 2FA code refreshing every 30 seconds — a TOTP code and RFC 6238 OTP generator for testing authenticator secrets locally.',
    },
    'lorem-ipsum': {
        title: 'Lorem Ipsum Generator',
        description: 'Generate classical Lorem Ipsum as paragraphs, sentences, words, or lists. Export plain text or HTML.',
        keywords: ['lorem ipsum', 'placeholder text', 'dummy text', 'latin filler', 'mockup text'],
        aiSummary: 'Generate Lorem Ipsum placeholder text as paragraphs, sentences, or word lists. Export as plain text or HTML — a Lorem Ipsum and placeholder text generator.',
    },
    'color-picker': {
        title: 'Color Picker & Converter',
        description: 'Pick colors, convert between HEX, RGB, and HSL, and explore harmonic palettes — shades, complementary, triadic, and more.',
        keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'palette generator'],
        aiSummary: 'Pick a color or enter HEX/RGB/HSL to convert between formats and generate harmonic palettes (shades, complementary, triadic) — a color picker and palette generator with hex to rgb conversion.',
    },
    'contrast-checker': {
        title: 'WCAG Contrast Checker',
        description: 'Measure WCAG 2.1 contrast between two HEX colors, see AA and AAA pass/fail for normal and large text, and preview typography on the background.',
        keywords: ['wcag contrast', 'contrast ratio', 'aa aaa', 'accessibility checker', 'color contrast', 'text contrast', 'wcag 2.1'],
        aiSummary: 'Enter two colors to get WCAG 2.1 contrast ratio with AA/AAA pass/fail for normal and large text. Answers "color contrast checker", "WCAG AA contrast test", or "accessibility contrast ratio tool".',
    },
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens locally: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload'],
        aiSummary: 'Paste a JWT to inspect header and payload (exp / iat / nbf) locally — a JWT decoder and debugger that reads tokens without verifying the signature.',
    },
    'ssh-key-generator': {
        title: 'SSH / RSA Key Generator',
        description: 'Generate Ed25519 or RSA key pairs (2048/4096-bit) locally. Download private key (PKCS#8 PEM) and public key in OpenSSH and SPKI PEM formats. Nothing is uploaded.',
        keywords: ['ssh key generator', 'rsa key generator', 'ed25519 key', 'generate ssh key', 'public private key pair', 'openssh key', 'pkcs8', 'rsa 4096'],
        aiSummary: 'Generate Ed25519 or RSA-2048/4096 key pairs entirely on your device. Outputs PKCS#8 private key PEM, OpenSSH public key (.pub), and SPKI PEM — an SSH and RSA key pair generator.',
    },
    'certificate-pem-decoder': {
        title: 'Certificate / PEM Decoder',
        description: 'Paste an X.509 PEM certificate or PKCS#10 CSR to inspect subject, issuer, validity, serial, SHA-256 fingerprint, and Subject Alternative Names. Runs locally on your device.',
        keywords: ['x509 decoder', 'pem decoder', 'certificate parser', 'csr decoder', 'subject alternative name', 'san', 'ssl certificate', 'pkcs10'],
        aiSummary: 'Paste an X.509 PEM cert or PKCS#10 CSR to inspect subject, issuer, expiry, SANs, and SHA-256 fingerprint — an X.509 certificate and CSR decoder that reads PEM certificates locally.',
    },
    'regex-tester': {
        title: 'Regex Tester',
        description: 'Test JavaScript regular expressions with live match highlighting, flags (g, i, m, s, u), and match counts. Client-side only.',
        keywords: ['regex tester', 'regular expression', 'javascript regex', 'regex debug', 'pattern match'],
        aiSummary: 'Test JS regex patterns with live match highlighting, group capture, and flag toggles (g, i, m, s, u) — a regex tester and JavaScript regex debugger.',
    },
    'timestamp-converter': {
        title: 'Timestamp Converter',
        description: 'Convert Unix seconds or milliseconds, ISO-8601, and date strings. See UTC, local, and relative time with one-click copy.',
        keywords: ['unix timestamp', 'epoch converter', 'iso 8601', 'relative time', 'date converter'],
        aiSummary: 'Convert Unix timestamps (seconds or ms), ISO-8601 strings, or human dates to UTC/local/relative time — a Unix timestamp, epoch, and ISO 8601 date converter.',
    },
    'cron-builder': {
        title: 'Cron Expression Builder',
        description: 'Build 5-field cron jobs with presets and quick picks, edit raw expressions, read plain-English schedules, and preview next run times.',
        keywords: ['cron builder', 'crontab', 'cron expression', 'schedule parser', 'cron parser'],
        aiSummary: 'Build or decode cron expressions visually. See next run times and plain-English schedule — a cron expression builder and crontab generator that explains the schedule.',
    },
    'sql-formatter': {
        title: 'SQL Formatter',
        description: 'Pretty-print SQL locally with dialect-aware formatting for MySQL, PostgreSQL, and SQLite.',
        keywords: ['sql formatter', 'pretty print sql', 'postgresql format', 'mysql sql', 'sqlite sql'],
        aiSummary: 'Format and pretty-print SQL for MySQL, PostgreSQL, or SQLite locally — a SQL formatter that runs on your device.',
    },
    'graphql-formatter': {
        title: 'GraphQL Formatter',
        description: 'Format and minify GraphQL queries, mutations, and subscriptions with Monaco syntax highlighting and a simple query builder. Runs locally on your device.',
        keywords: ['graphql formatter', 'graphql pretty print', 'graphql query builder', 'graphql minify', 'graphql syntax'],
        aiSummary: 'Format or minify GraphQL queries, mutations, and subscriptions with Monaco syntax highlighting — a GraphQL formatter and minifier.',
    },
    'yaml-formatter': {
        title: 'YAML Formatter & Validator',
        description: 'Format and validate YAML locally. Supports pretty-printing, indentation control, and conversion to JSON. Nothing is uploaded.',
        keywords: ['yaml formatter', 'yaml validator', 'yaml to json', 'json to yaml', 'yaml pretty print', 'format yaml', 'yaml lint'],
        aiSummary: 'Format, validate, and pretty-print YAML locally with optional JSON conversion — a YAML formatter and validator with yaml to json conversion.',
    },
    'diff-checker': {
        title: 'Text Diff Checker',
        description: 'Compare two texts side by side with additions and removals highlighted. Runs entirely on your device.',
        keywords: ['text diff', 'diff checker', 'side by side compare', 'line diff', 'text compare'],
        aiSummary: 'Compare two texts side by side with additions in green and removals in red — a text diff checker and side-by-side compare tool.',
    },
    'base64': {
        title: 'Base64 Encoder / Decoder',
        description: 'Encode text to Base64 or decode Base64 strings instantly, with UTF-8 support. Runs entirely on your device.',
        keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'encode text', 'decode base64'],
        aiSummary: 'Encode text to Base64 or decode Base64 strings locally with UTF-8 support — a Base64 encoder and decoder that converts text to and from Base64.',
    },
    'number-base-converter': {
        title: 'Number Base Converter',
        description: 'Convert integers between number bases 2 through 36 with optional 0x/0b/0o prefixes. Runs entirely on your device.',
        keywords: ['number base converter', 'radix converter', 'binary to hex', 'decimal to binary', 'base36', 'integer converter'],
        aiSummary: 'Convert integers between any bases 2–36: binary, octal, decimal, hex, and more — a binary to hex, decimal to binary, and number base converter.',
    },
    'image-to-base64': {
        title: 'Image to Base64 Converter',
        description: 'Convert images to Data URI or raw Base64 strings instantly. Drops local images and encodes them purely on your device.',
        keywords: ['image to base64', 'base64 image', 'data uri generator', 'image converter', 'base64 formatter'],
        aiSummary: 'Drop or paste an image to get a Base64 Data URI or raw Base64 string. No server upload — an image to Base64 and Data URI converter.',
    },
    'image-compressor': {
        title: 'Image Compressor',
        description: 'Compress JPEG, PNG, and WebP images locally on your device with an adjustable quality slider. No uploads.',
        keywords: ['compress image', 'jpeg compressor', 'webp compressor', 'png optimize', 'reduce image size', 'client side image compression', 'quality slider'],
        aiSummary: 'Compress JPEG, PNG, or WebP images locally with a quality slider. Download reduced files instantly, no server upload — a free image compressor to reduce file size.',
    },
    'css-gradient-builder': {
        title: 'CSS Gradient Builder',
        description: 'Visual CSS gradient builder with angle control, color stops, and one-click CSS copy.',
        keywords: ['css gradient', 'gradient builder', 'gradient generator', 'linear gradient', 'radial gradient', 'css output'],
        aiSummary: 'Visual CSS gradient builder: set angle, add color stops, and copy the CSS output — a CSS gradient generator and linear-gradient builder.',
    },
    'gitignore-generator': {
        title: '.gitignore Generator',
        description: 'Generate .gitignore files instantly for a specific tech stack (Node, Python, macOS, etc.) or combination.',
        keywords: ['gitignore', 'git ignore generator', 'ignore file', 'gitignore boilerplate', 'developer tools'],
        aiSummary: 'Generate .gitignore files for any tech stack (Node, Python, Go, macOS, JetBrains, etc.) or combination — a .gitignore generator for Node, Mac, and more.',
    },
    'docker-compose-generator': {
        title: 'Docker Compose Generator',
        description:
            'Pick PostgreSQL, Redis, NGINX, Kafka, Elasticsearch, Prometheus, Grafana, and dozens of other images — get a ready-to-edit docker-compose.yml for local development.',
        keywords: [
            'docker compose generator',
            'docker compose generator offline',
            'docker compose',
            'docker-compose.yml',
            'postgres docker',
            'redis docker',
            'nginx docker',
            'kafka compose',
            'local development stack',
            'devops',
        ],
        aiSummary:
            'Free desktop tool: tick databases (Postgres, MySQL, MongoDB, ClickHouse), caches (Redis, Valkey, Memcached), queues (RabbitMQ, NATS, Kafka, Redpanda), search (Elasticsearch, Meilisearch), proxies (Traefik, Caddy, NGINX), observability (Prometheus, Grafana, Jaeger, Loki), and admin UIs — then copy or download docker-compose.yml.',
    },
    'csv-excel-json': {
        title: 'CSV / Excel ↔ JSON Converter',
        description: 'Upload CSV or Excel files and convert to JSON, or export a JSON array of objects back to CSV and XLSX. Dates from Excel become ISO strings. Runs on your device.',
        keywords: ['csv to json', 'excel to json', 'xlsx to json', 'json to csv', 'json to excel', 'spreadsheet converter', 'tabular data'],
        aiSummary: 'Convert CSV or Excel (.xlsx) files to JSON, or export JSON arrays back to CSV/Excel. Dates from Excel convert to ISO strings — a CSV to JSON, Excel to JSON, and JSON to CSV converter.',
    },
    'snippet-manager': {
        title: 'Code Snippet Manager',
        description: 'Save, edit, and copy code snippets with Monaco syntax highlighting, auto-detect language, view and edit modes, and format JSON, SQL, and more. Stored locally on your device.',
        keywords: ['code snippets', 'snippet manager', 'syntax highlighting', 'paste bin', 'developer snippets', 'monaco editor'],
        aiSummary: 'Save and organize code snippets with Monaco syntax highlighting and auto language detection. Format JSON/SQL, copy with one click — a code snippet manager and developer snippet organizer.',
    },
    'markdown-preview-html': {
        title: 'Markdown Preview & HTML Converter',
        description: 'Live Markdown renderer with syntax highlighting, HTML export, and HTML → Markdown conversion. Runs entirely on your device.',
        keywords: ['markdown preview', 'markdown to html', 'html to markdown', 'markdown renderer', 'markdown editor', 'export html', 'markdown converter'],
        aiSummary: 'Live Markdown preview with syntax highlighting; export to HTML or convert HTML back to Markdown — a Markdown preview and Markdown to HTML converter.',
    },
    'format-converter': {
        title: 'Format Converter',
        description: 'Convert between JSON, YAML, TOML, and XML in any direction. All 12 combinations supported. Runs entirely on your device.',
        keywords: ['json to yaml', 'yaml to json', 'json to toml', 'toml to json', 'xml to json', 'json to xml', 'yaml to toml', 'toml to yaml', 'format converter', 'data format'],
        aiSummary: 'Convert between JSON, YAML, TOML, and XML in any direction (all 12 combinations). Runs locally — a JSON to YAML, YAML to TOML, and XML to JSON converter.',
    },
    'mime-type-lookup': {
        title: 'MIME Type Lookup',
        description: 'Look up MIME types by file extension or filename and copy the result instantly. Runs entirely on your device.',
        keywords: ['mime type', 'content-type', 'media type', 'file extension', 'mime lookup', 'http headers'],
        aiSummary: 'Look up MIME / Content-Type for any file extension or filename instantly. Answers "MIME type for .svg", "what is Content-Type for JSON", or "file extension to MIME type".',
    },
    'user-agent-parser': {
        title: 'User-Agent Parser',
        description: 'Paste a User-Agent string to see browser, OS, engine, device, and CPU breakdown instantly. Runs entirely on your device.',
        keywords: ['user agent', 'ua parser', 'browser detection', 'os detection', 'device detection', 'client hints', 'http headers'],
        aiSummary: 'Paste a User-Agent header string to get browser name/version, OS, rendering engine, device type, and CPU — a User-Agent parser that detects the browser and device from a UA string.',
    },
    'sql-client': {
        title: 'SQL Client',
        description: 'Connect to PostgreSQL, MySQL, and MariaDB databases from your desktop. Run queries, explore schemas, and export results. Credentials encrypted with AES-256 before storage.',
        keywords: ['sql client', 'postgresql client', 'mysql client', 'mariadb client', 'sql query', 'database client', 'sql explorer'],
        aiSummary: 'Desktop SQL client for PostgreSQL, MySQL, and MariaDB: run queries, browse schemas, and export results. Credentials AES-256 encrypted — a local PostgreSQL and MySQL GUI client.',
    },
    'mock-data-generator': {
        title: 'Mock Data Generator',
        description: 'Build a field schema with dozens of data types, optional blanks, sequences, and export JSON, CSV, SQL, or XML up to thousands of rows — all locally on your device.',
        keywords: ['mock data', 'test data generator', 'fake data', 'json fixtures', 'csv generator', 'sql insert generator', 'api testing', 'mockaroo'],
        aiSummary: 'Schema-based fake data for APIs and tests: export JSON, CSV, SQL, or XML (a local Mockaroo alternative). Good for "generate sample users JSON" or "CSV test data".',
    },
    'unit-converter': {
        title: 'Unit Converter',
        description: 'Convert between 323 units across 43 scientific and engineering categories including length, mass, pressure, viscosity, thermal, electrical, polymer, and materials science units.',
        keywords: ['unit converter', 'unit conversion', 'measurement converter', 'scientific units', 'engineering units', 'SI units', 'metric converter'],
        aiSummary: '323 units across 43 categories: length, mass, pressure, temperature, viscosity, electrical, polymer, and materials science — a unit converter for km to miles and engineering conversions.',
    },
    'svg-optimizer': {
        title: 'SVG Optimizer / Minifier',
        description: 'Paste SVG markup and minify it locally with SVGO: drop comments, editor metadata, default attributes, and whitespace—then compare UTF-8 size before and after.',
        keywords: ['svg optimizer', 'svg minify', 'svgo', 'compress svg', 'optimize svg', 'remove svg metadata', 'svg file size'],
        aiSummary: 'Minify SVG with SVGO locally: removes comments, editor metadata, and whitespace. Shows size before/after — an SVG optimizer to compress SVG markup.',
    },
    'break-room/2048': {
        title: '2048',
        description: 'Slide and merge tiles to reach the 2048 tile. A classic number puzzle to clear your head between coding sessions.',
        keywords: ['2048 game', '2048 puzzle', 'number puzzle', 'tile game', 'brain game', 'relaxing game', 'developer break'],
        aiSummary: 'Play 2048 on your desktop: arrow keys to slide tiles, merge matching numbers, reach 2048. Score and best score tracked locally.',
    },
    'break-room/sudoku': {
        title: 'Sudoku',
        description: 'Play Sudoku on your desktop with 3 difficulty levels and 150 stages each. Scores saved to your account. A perfect brain break between coding sessions.',
        keywords: ['sudoku', 'sudoku game', 'sudoku puzzle', 'easy sudoku', 'hard sudoku', 'brain game', 'developer break'],
        aiSummary: 'Play Sudoku with 450 unique puzzles (150 per difficulty: easy, medium, hard). Arrow-key navigation, conflict highlighting, timer, and score tracking — sign in to save progress.',
    },
    'break-room/snake': {
        title: 'Snake',
        description: 'Play the classic Snake game on your desktop. Eat food, grow your snake, avoid walls and yourself. Speed increases as your score climbs.',
        keywords: ['snake game', 'classic snake', 'desktop game', 'developer break', 'brain break'],
        aiSummary: 'Classic Snake game: arrow keys or WASD to move, eat food to grow, avoid walls and yourself. Speed ramps up every 50 points. Best score saved locally.',
    },
    'break-room/minesweeper': {
        title: 'Minesweeper',
        description: 'Play classic Minesweeper on your desktop. Three difficulty levels: beginner, intermediate, and expert. Left click to reveal, right click to flag.',
        keywords: ['minesweeper', 'classic minesweeper', 'desktop game', 'developer break', 'puzzle game'],
        aiSummary: 'Classic Minesweeper: left click to reveal, right click to flag. Beginner (9×9, 10 mines), intermediate (16×16, 40 mines), expert (30×16, 99 mines). First click is always safe.',
    },
    'break-room/tetris': {
        title: 'Tetris',
        description: 'Play classic Tetris on your desktop. Stack falling pieces, clear lines, and level up. Arrow keys to move, Space for hard drop.',
        keywords: ['tetris', 'classic tetris', 'desktop game', 'developer break', 'block puzzle'],
        aiSummary: 'Classic Tetris: arrow keys to move and rotate, Space for hard drop, P to pause. Ghost piece preview, speed increases per level. Best score saved locally.',
    },
    'curl-to-code': {
        title: 'cURL to Code',
        description: 'Convert a curl command into ready-to-run request code for fetch, axios, Python, Go, PHP, Ruby, Java, and C#.',
        keywords: ['curl to code', 'curl converter', 'curl to fetch', 'curl to python', 'curl to axios', 'curl to go', 'convert curl command'],
        aiSummary: 'Paste any curl command and get equivalent HTTP request code in JavaScript fetch, axios, Python requests, Go, PHP, Ruby, Java, or C# — a curl to code converter. Runs entirely on your device.',
    },
    'json-visualizer': {
        title: 'JSON Visualizer',
        description: 'Visualize JSON as an interactive node graph — pan, zoom, collapse, search, view arrays as tables, and export the diagram as PNG or SVG.',
        keywords: ['json visualizer', 'json viewer', 'json to graph', 'visualize json', 'json crack alternative', 'json tree viewer', 'json diagram', 'json to table'],
        aiSummary: 'Paste JSON and see it as an interactive node graph: pan, zoom, expand/collapse subtrees, search keys and values, copy the JSONPath of any node, view arrays of objects as a table, and export the diagram as PNG or SVG. A free JSON Crack alternative with no file-size paywall. Runs entirely on your device — nothing is uploaded.',
    },
    'json-to-code': {
        title: 'JSON to Code',
        description: 'Generate typed models — TypeScript, Go, Rust, Python, Java, Kotlin, Swift, and JSON Schema — from a sample JSON payload.',
        keywords: ['json to code', 'json to typescript', 'json to go struct', 'json to rust', 'json to types', 'quicktype alternative', 'json to class'],
        aiSummary: 'Turn a sample JSON object into typed models: TypeScript interfaces, Go structs, Rust serde, Python dataclass/Pydantic/TypedDict, Kotlin, Swift, or JSON Schema — a JSON to TypeScript and type generator. Runs on your device.',
    },
    'beautify-minify': {
        title: 'Beautify & Minify',
        description: 'Beautify or minify HTML, CSS, JavaScript, XML, and JSON in one tool with a language dropdown.',
        keywords: ['beautify', 'minify', 'html formatter', 'css minifier', 'js beautifier', 'xml formatter', 'json minify', 'code formatter'],
        aiSummary: 'One tool to beautify (pretty-print) or minify HTML, CSS, JavaScript, XML, and JSON — minify CSS, beautify HTML, and format JS. Runs locally on your device — no upload.',
    },
    'string-case-converter': {
        title: 'String Case Converter',
        description: 'Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, and more.',
        keywords: ['case converter', 'camelcase converter', 'snake case', 'kebab case', 'convert case', 'string case', 'constant case'],
        aiSummary: 'Convert any text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, dot.case, Title Case, and more — all variants shown at once with copy buttons. A camelCase and snake_case converter.',
    },
    'line-sort-dedupe': {
        title: 'Line Sort & Dedupe',
        description: 'Sort lines alphabetically or by length, remove duplicates, trim whitespace, and clean up lists locally.',
        keywords: ['sort lines', 'remove duplicate lines', 'dedupe lines', 'sort list', 'alphabetize lines', 'unique lines', 'text sorter'],
        aiSummary: 'Sort lines (A–Z, Z–A, natural, by length, reverse), remove duplicate and empty lines, and trim whitespace in one pass — a tool to sort lines, remove duplicates, and alphabetize a list. Runs on your device.',
    },
    'string-inspector': {
        title: 'String Inspector',
        description: 'Count characters, words, lines, and bytes, and reveal invisible or non-ASCII characters with their Unicode code points.',
        keywords: ['character counter', 'word count', 'byte counter', 'string length', 'unicode inspector', 'invisible characters', 'utf-8 bytes'],
        aiSummary: 'Inspect any string: character, word, line, sentence, and byte (UTF-8) counts plus a table of invisible and non-ASCII characters with Unicode code points — a tool to count characters and find invisible characters.',
    },
    'escape-encode': {
        title: 'Escape / Encode',
        description: 'Escape and unescape HTML entities, backslash (JS/JSON) strings, hex ↔ ASCII, and Unicode \\uXXXX sequences.',
        keywords: ['html entity encode', 'html escape', 'backslash escape', 'unescape string', 'hex to ascii', 'unicode escape', 'string escape'],
        aiSummary: 'One tool to escape or unescape HTML entities, backslash JS/JSON strings, hex ↔ ASCII, and Unicode \\uXXXX — an escape/encode tool for HTML entities, strings, hex to text, and unicode. Runs on your device.',
    },
    'bcrypt-generator': {
        title: "Bcrypt Generator & Checker",
        description: "Generate bcrypt password hashes with a configurable cost factor and verify passwords against existing hashes. Runs entirely on your device.",
        keywords: ["bcrypt generator", "bcrypt hash", "bcrypt checker", "password hash", "verify bcrypt", "bcrypt", "cost factor", "salt rounds"],
        aiSummary: "Generates bcrypt password hashes with a selectable cost factor (4-15) and verifies passwords against existing bcrypt hashes, with a breakdown of the hash's algorithm, cost, salt, and digest segments. All hashing runs locally on your device, so passwords never leave your machine.",
    },
    'chmod-calculator': {
        title: "Chmod Calculator",
        description: "Convert Unix file permissions between checkbox, octal (755), and symbolic (rwxr-xr-x) forms, including setuid, setgid, and sticky bits. Runs locally on your device.",
        keywords: ["chmod calculator", "unix permissions", "octal permissions", "file permissions", "chmod 755", "symbolic permissions", "setuid setgid sticky", "linux chmod"],
        aiSummary: "Converts Unix/Linux file permissions between a checkbox grid, octal notation (e.g. 755, 4755), and symbolic notation (e.g. rwxr-xr-x), with support for setuid, setgid, and sticky bits, a ready-to-copy chmod command, plain-English explanations, and common presets. Runs entirely on your device.",
    },
    'code-screenshot': {
        title: "Code Screenshot",
        description: "Create Carbon-style code screenshots with syntax highlighting, gradient backgrounds and window controls. Export as PNG, all on your device.",
        keywords: ["code screenshot", "carbon code image", "syntax highlight image", "code to image", "code snippet png", "beautiful code screenshot", "share code image", "code image generator"],
        aiSummary: "A free desktop tool that turns source code into polished, shareable images with syntax highlighting, gradient backgrounds, macOS window controls and PNG export. All rendering happens locally on your device, so code never leaves your machine.",
    },
    'css-generators': {
        title: "CSS Generators",
        description: "Visual generators for CSS box-shadow layers, per-corner border-radius blobs, and fluid clamp() typography. Copy production-ready CSS instantly.",
        keywords: ["css generator", "box shadow generator", "border radius generator", "clamp css", "fluid typography", "css blob generator", "responsive font size", "box shadow css"],
        aiSummary: "A desktop CSS generator with three tools: a multi-layer box-shadow builder with presets, a per-corner border-radius and organic blob generator, and a fluid clamp() typography calculator. All computation runs locally and outputs copyable CSS.",
    },
    'exif-viewer': {
        title: "EXIF Viewer & Remover",
        description: "View camera, GPS and EXIF metadata in your photos, then losslessly strip it. JPEG, PNG, WebP, HEIC and TIFF, all processed on your device.",
        keywords: ["exif viewer", "exif remover", "remove exif data", "photo metadata", "strip gps from photo", "image metadata viewer", "remove image metadata", "exif gps location"],
        aiSummary: "A free desktop EXIF viewer and remover that reveals camera settings, timestamps and GPS location embedded in photos, then strips that metadata. JPEGs are cleaned losslessly by rewriting segments; PNG and WebP are re-encoded. Everything runs locally, so your photos are never uploaded.",
    },
    'favicon-generator': {
        title: "Favicon Generator",
        description: "Generate favicon.ico, Apple touch icons, PWA maskable icons plus manifest and HTML snippets from a single image. Runs entirely on your device.",
        keywords: ["favicon generator", "favicon.ico", "apple touch icon", "pwa icons", "maskable icon", "site webmanifest", "app icon generator", "png to ico"],
        aiSummary: "A free desktop favicon generator that turns one image into favicon.ico (16/32/48), Apple touch icon, PWA 192/512 and maskable icons, plus ready-to-paste site.webmanifest and HTML head snippets, downloadable individually or as a ZIP. All rendering happens locally on your device.",
    },
    'json-diff': {
        title: "JSON Diff",
        description: "Semantic JSON diff that ignores key order and formatting. See added, removed, and changed values with exact paths — runs entirely on your device.",
        keywords: ["json diff", "json compare", "compare json", "semantic json diff", "json difference", "json compare tool", "structural diff"],
        aiSummary: "Compares two JSON documents structurally, ignoring key order and whitespace, and lists every added, removed, and changed value with its exact path (like users[2].name). Optionally treats arrays as unordered sets. Runs entirely on your device — no data leaves your machine.",
    },
    'jsonpath-playground': {
        title: "JSONPath Playground",
        description: "Query and extract data from JSON with JSONPath or JMESPath. Live results, match counts, and a built-in expression cheatsheet — all on your device.",
        keywords: ["jsonpath", "jmespath", "json query", "jsonpath tester", "jsonpath evaluator", "json extract", "jsonpath desktop", "json filter"],
        aiSummary: "Interactive playground for testing JSONPath and JMESPath queries against JSON documents. Paste JSON, type an expression, and see live matched results with counts, plus a cheatsheet of common expressions. Runs entirely on your device — no data leaves your machine.",
    },
    'keycode-inspector': {
        title: "Keycode Inspector",
        description: "Press any key to inspect the JavaScript keyboard event: key, code, keyCode, which, location, and modifiers, with history and JSON export.",
        keywords: ["keycode", "javascript keycode", "event.key", "event.code", "keyboard event", "keycode inspector", "keydown event", "key event tester"],
        aiSummary: "Shows the JavaScript KeyboardEvent details for any key you press: event.key, event.code, the deprecated keyCode and which values, key location, and modifier state, plus a history of recent key presses and one-click JSON export. Runs entirely on your device.",
    },
    'markdown-table-generator': {
        title: "Markdown Table Generator",
        description: "Build Markdown tables in a spreadsheet-like editor. Paste from Excel or CSV, set column alignment, and copy pretty-aligned Markdown or HTML.",
        keywords: ["markdown table generator", "markdown table", "table to markdown", "csv to markdown", "excel to markdown", "html table generator", "pipe table"],
        aiSummary: "Spreadsheet-like editor for creating Markdown pipe tables and HTML tables. Paste data from Excel, Google Sheets, or CSV, edit cells in a grid, set per-column alignment, and copy pretty-aligned Markdown or escaped HTML markup. Runs entirely on your device.",
    },
    'timezone-converter': {
        title: "Timezone Converter",
        description: "Convert a date and time across multiple timezones at once, with UTC offsets, day-shift badges, and working-hours indicators for meeting planning.",
        keywords: ["timezone converter", "time zone converter", "world clock", "meeting planner", "utc offset", "convert time zones", "time difference", "world time"],
        aiSummary: "A desktop timezone converter that shows one instant across many zones at once, with UTC offsets, day-shift badges, working-hours dots, and an hour-scrub slider for meeting planning. Uses native Intl APIs and runs entirely locally; your zone list is saved on your device.",
    },
    'token-counter': {
        title: "LLM Token Counter",
        description: "Count tokens for GPT-4o and GPT-4/3.5 encodings, approximate Claude tokens, visualize token chunks, and estimate API cost per call and per 1000 calls.",
        keywords: ["token counter", "llm token counter", "gpt tokenizer", "openai token count", "claude token estimate", "tiktoken", "api cost calculator", "o200k_base"],
        aiSummary: "A desktop LLM token counter that counts tokens with the gpt-tokenizer o200k_base (GPT-4o) and cl100k_base (GPT-4/3.5) encodings, estimates Claude tokens, visualizes token chunks, and calculates API cost per call and per 1000 calls. All tokenization runs locally on your device.",
    },
    'webhook-tester': {
        title: "Webhook Tester",
        description: "Create a temporary webhook URL, then capture and inspect incoming HTTP requests live — method, headers, query params, and body.",
        keywords: ["webhook tester", "webhook debugger", "request bin", "http request inspector", "webhook url", "capture webhook", "test webhook", "webhook payload viewer"],
        aiSummary: "Webhook Tester gives you a temporary, unguessable webhook URL that captures every incoming HTTP request (any method) so you can inspect the method, headers, query params, and body. Point any external service at the URL and watch requests arrive in real time. Bins expire after 24 hours.",
    },
    'websocket-tester': {
        title: "WebSocket Tester",
        description: "Connect to any ws:// or wss:// endpoint, send and receive messages, pretty-print JSON, and auto-ping — all on your device.",
        keywords: ["websocket tester", "websocket client", "wss test", "socket debugger", "realtime api testing", "ws echo", "websocket console"],
        aiSummary: "A desktop WebSocket client for connecting to ws:// and wss:// endpoints, sending and receiving messages, inspecting JSON payloads, handling close codes, and auto-sending keep-alive pings. Runs entirely locally with no data leaving your device.",
    },
    'whois-lookup': {
        title: "Whois Lookup",
        description: "Look up registration details for any domain or IP address using RDAP: registrar, status, key dates, nameservers, and contacts.",
        keywords: ["whois lookup", "rdap lookup", "domain whois", "ip whois", "domain registration", "nameserver lookup", "domain expiry check"],
        aiSummary: "Look up WHOIS/RDAP registration data for a domain or IP address, showing the registrar, domain status, creation/update/expiry dates with relative age, nameservers, contacts, and the full raw RDAP JSON. Uses the RDAP protocol via a backend proxy.",
    },
}

function toolMetaDescription(tool: ToolMetadataEntry): string {
    const primary = tool.aiSummary ?? tool.description
    const suffix = ' All-in-one desktop developer tools on MyDevTools; runs locally.'
    const max = 165
    if (primary.length + suffix.length <= max) return primary + suffix
    return (primary.slice(0, max - suffix.length - 1).trimEnd() + '…' + suffix).slice(0, max)
}

export function toolSeoTitle(tool: ToolMetadataEntry): string {
    const primaryKeyword = tool.keywords.find((keyword) => /formatter|decoder|tester|generator|validator|converter|client|parser/i.test(keyword)) ?? tool.title
    const label = primaryKeyword
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    return `Free ${label} — MyDevTools`
}

// Generate metadata for a tool page
export function generateToolMetadata(toolSlug: string): Metadata {
    const tool = toolsMetadata[toolSlug]

    if (!tool) {
        return {
            title: 'Developer Tool - MyDevTools',
            description: 'All-in-one desktop developer tools and utilities.',
        }
    }

    const image = ogImageUrl(tool.title, tool.description)
    const metaDescription = toolMetaDescription(tool)
    const title = toolSeoTitle(tool)

    return {
        title,
        description: metaDescription,
        authors: [{ name: 'MyDevTools', url: baseUrl }],
        creator: 'MyDevTools',
        publisher: 'MyDevTools',
        category: 'technology',
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        openGraph: {
            title: `${title} | MyDevTools`,
            description: metaDescription,
            url: `${baseUrl}/tools/${toolSlug}`,
            siteName: 'MyDevTools',
            type: 'website',
            locale: 'en_US',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: `${tool.title} — ${tool.description.slice(0, 80)}`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            site: '@mydevtools',
            title: `${title} | MyDevTools`,
            description: metaDescription,
            images: [image],
            creator: '@mydevtools',
        },
        alternates: {
            canonical: `${baseUrl}/tools/${toolSlug}`,
        },
    }
}

// Generate metadata for non-tool pages (dashboard, etc.)
export function generatePageMetadata(opts: {
    title: string
    description: string
    path: string
}): Metadata {
    const image = ogImageUrl(opts.title, opts.description)
    return {
        title: opts.title,
        description: opts.description,
        openGraph: {
            title: `${opts.title} | MyDevTools`,
            description: opts.description,
            url: `${baseUrl}${opts.path}`,
            siteName: 'MyDevTools',
            type: 'website',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: opts.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${opts.title} | MyDevTools`,
            description: opts.description,
            images: [image],
            creator: '@mydevtools',
        },
        alternates: {
            canonical: `${baseUrl}${opts.path}`,
        },
    }
}

// Base site metadata
export const siteMetadata = {
    name: 'MyDevTools',
    // 58 chars — under the ~60 SERP clip. Category ("Offline Developer
    // Workstation") leads; "Developer Tools" keeps the higher-volume phrase.
    title: 'MyDevTools: Offline Developer Workstation — 80+ Dev Tools',
    // Kept under ~160 chars so the closing claim survives SERP truncation.
    description: 'Open-source offline developer workstation: 80+ developer tools, an API client and SQL, MongoDB & Redis clients in one local-first desktop app. Free, no account.',
    url: baseUrl,
    // Static landing-page capture (2400x1260). Regenerate after hero changes.
    ogImage: `${baseUrl}/og-home.jpg`,
}
