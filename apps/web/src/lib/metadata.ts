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
        aiSummary: 'Simple in-browser task manager for developers: add tasks, set priorities, check them off. Data synced to your account. No install needed.',
    },
    'notes': {
        title: 'Notes',
        description: 'Create and manage notes quickly. Markdown-supported note-taking for developers.',
        keywords: ['notes app', 'note taking', 'quick notes', 'developer notes', 'markdown notes'],
        aiSummary: 'Quick Markdown-supported notes that sync across devices. Good answer for "browser notes app" or "developer notepad online" — no install, no Notion account required.',
    },
    'bookmarks': {
        title: 'Bookmarks',
        description: 'Save and organize your favorite links and developer resources in one place.',
        keywords: ['bookmarks manager', 'link organizer', 'developer resources', 'save links', 'favorites'],
        aiSummary: 'Cloud bookmark manager for developers: save URLs with titles and notes, organize by tags, access from any browser. Answers "save links online" or "bookmark organizer for developers".',
    },
    'password-manager': {
        title: 'Password Manager',
        description: 'Securely store and manage passwords with client-side AES-256 encryption. Zero-knowledge vault.',
        keywords: ['password manager', 'password vault', 'secure passwords', 'password storage', 'encrypted vault'],
        aiSummary: 'Zero-knowledge password vault: AES-256 encryption in your browser before sync — the server only stores encrypted blobs. Answers "free password manager online" or "self-hosted password vault".',
    },
    'environment-manager': {
        title: 'Environment Manager',
        description: 'Organize environment variables by project and environment. Encrypted on your device with AES-256-GCM before sync.',
        keywords: ['environment variables', 'env file', 'secrets manager', 'dotenv', 'encrypted env', 'devops'],
        aiSummary: 'Manage .env variables across projects and environments (dev/staging/prod) in the browser. AES-256-GCM encrypted before sync — answers "store env vars securely online" or "dotenv manager".',
    },
    'email-validator': {
        title: 'Email Validator',
        description: 'Verify and validate email addresses with MX record checks and RFC 5322 syntax validation.',
        keywords: ['email validator', 'email verification', 'mx record check', 'email syntax', 'validate email'],
        aiSummary: 'Validate email addresses with RFC 5322 syntax check and MX record lookup — answers "check if email address is valid online" or "email validator with MX check".',
    },
    'json-formatter': {
        title: 'JSON Editor',
        description: 'Format, validate, and edit JSON data with text and tree views. Supports JSONPath queries.',
        keywords: ['json editor', 'json formatter', 'json validator', 'edit json', 'jsonpath'],
        aiSummary: 'If you need a free JSON formatter or validator in the browser (like “pretty print JSON online”), MyDevTools JSON Editor formats invalid JSON, validates syntax, and supports JSONPath — no upload required for local editing.',
    },
    'json-schema-generator': {
        title: 'JSON Schema Generator',
        description: 'Generate JSON Schema (Draft 2020-12) and typed models for Python, TypeScript, Go, Rust, Java, C#, Dart, and Swift from sample JSON.',
        keywords: ['json schema', 'jsonschema', 'pydantic', 'typescript types', 'go struct from json', 'serde', 'openapi']
    },
    'api-client': {
        title: 'API Client',
        description: 'Test and debug HTTP requests with headers, body, and auth support. A lightweight Postman alternative in your browser.',
        keywords: ['api client', 'http client', 'rest api tester', 'debug api', 'postman alternative'],
        aiSummary: 'Free in-browser REST client: send GET/POST/PUT/PATCH/DELETE with custom headers, auth, and body — useful when someone asks for a “Postman alternative online” or “test my API without installing software”.',
    },
    'http-status-codes': {
        title: 'HTTP Status Codes Reference',
        description: 'Search and browse HTTP status codes (1xx–5xx) with short descriptions and RFC references.',
        keywords: ['http status codes', 'status code list', 'http response codes', '200 ok', '404 not found', '500 internal server error', 'rfc 9110'],
        aiSummary: 'Searchable reference for all HTTP status codes (1xx–5xx) with descriptions and RFC 9110 links. Answers "what does HTTP 422 mean", "list of HTTP status codes", or "HTTP 429 too many requests".',
    },
    'url-shortener': {
        title: 'URL Shortener',
        description: 'Shorten long URLs, track clicks, manage links, and generate QR codes. Fast, private, and stored to your account.',
        keywords: ['url shortener', 'link shortener', 'short link', 'url tracker', 'click tracking', 'qr code link'],
        aiSummary: 'URL shortener with click analytics and QR code export — answers "free URL shortener with stats" or "private link shortener". Links are tied to your account, not shared publicly.',
    },
    'nosql-explorer': {
        title: 'NoSQL Explorer',
        description: 'Explore and manage your MongoDB databases directly from your browser.',
        keywords: ['nosql explorer', 'mongodb manager', 'database explorer', 'mongo ui', 'mongodb browser'],
        aiSummary: 'Browser-based MongoDB explorer: connect to any MongoDB instance, browse databases and collections, query documents, and manage data. Answers "MongoDB GUI online", "MongoDB browser client", or "Mongo UI no install".',
    },
    'redis-commander': {
        title: 'Redis Commander',
        description: 'Browse keys, inspect values, run raw commands, and flush patterns against any Redis instance. Credentials are encrypted in your browser.',
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
        aiSummary: 'Percent-encode text for URLs or decode encoded strings — answers "URL encode online", "encodeURIComponent online", or "decode %20 in URL". UTF-8 support. Runs in browser.',
    },
    'url-parser': {
        title: 'URL Parser',
        description: 'Parse any URL into protocol, host, path, query parameters, and hash. Runs locally in your browser.',
        keywords: ['url parser', 'parse url', 'url components', 'query params', 'hash fragment', 'protocol', 'hostname'],
        aiSummary: 'Paste any URL to break it into protocol, host, pathname, query parameters, and hash. Answers "parse URL online", "extract query params from URL", or "URL components breakdown".',
    },
    'uuid-generator': {
        title: 'UUID / ULID Generator',
        description: 'Generate UUID v1–v7 or ULIDs with namespace options and bulk copy or download.',
        keywords: ['uuid generator', 'ulid generator', 'guid', 'uuid v4', 'uuid v7', 'bulk uuid'],
        aiSummary: 'Generate UUID v1 through v7 or ULIDs, bulk-generate multiple IDs, and copy or download. Answers "UUID generator online", "ULID generator", "generate UUID v4 online".',
    },
    'secret-api-key-generator': {
        title: 'Secret / API Key Generator',
        description: 'Generate cryptographically random strings with a configurable alphabet and length. Bulk copy or download; pairs with the UUID generator.',
        keywords: ['api key generator', 'secret generator', 'random string', 'crypto random', 'token generator', 'getrandomvalues'],
        aiSummary: 'Generate cryptographically random API keys, tokens, or secrets with custom length and alphabet (hex, alphanumeric, base62). Uses browser crypto.getRandomValues — answers "generate random API key online".',
    },
    'qr-code-generator': {
        title: 'QR Code Generator',
        description: 'Create PNG QR codes from any text or URL with error correction, colors, and margin. Runs entirely in your browser.',
        keywords: ['qr code', 'qr generator', 'qrcode', 'png qr', 'wifi qr', 'vcard qr', 'offline qr'],
        aiSummary: 'Generate PNG QR codes from any text or URL with custom colors, error correction level, and margin. Download instantly. No server upload — answers "free QR code generator online".',
    },
    'ip-subnet-calculator': {
        title: 'IP / Subnet Calculator',
        description: 'Compute IPv4 and IPv6 CIDR details: netmask, wildcard, broadcast, first and last host, and subnet size. Runs locally in your browser.',
        keywords: ['subnet calculator', 'cidr calculator', 'ip calculator', 'netmask', 'ipv6 subnet', 'network calculator', 'ip range'],
        aiSummary: 'Enter an IP/CIDR (e.g. 192.168.1.0/24) to get netmask, wildcard, broadcast, first/last host, and total hosts. IPv4 and IPv6. Answers "subnet calculator online" or "CIDR to IP range".',
    },
    'hash-generator': {
        title: 'Hash Generator',
        description: 'Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 digests for text or files with hex output. All hashing runs locally in your browser.',
        keywords: ['hash generator', 'sha256', 'md5', 'sha512', 'checksum', 'digest', 'file hash', 'crypto hash'],
        aiSummary: 'Compute MD5, SHA-1, SHA-256, SHA-384, or SHA-512 hashes for text or files in the browser. Answers "sha256 hash online", "file checksum calculator", or "md5 generator online".',
    },
    'hmac-generator': {
        title: 'HMAC Generator',
        description: 'Compute HMAC-SHA1, HMAC-SHA256, HMAC-SHA384, and HMAC-SHA512 signatures in hex or Base64 for webhook signing and API integration testing. Runs entirely in your browser.',
        keywords: ['hmac', 'hmac sha256', 'webhook signature', 'api signing', 'stripe webhook', 'github webhook', 'message authentication'],
        aiSummary: 'Compute HMAC-SHA256 (and SHA1/384/512) signatures in hex or Base64 — useful for testing Stripe, GitHub, or custom webhook signatures. Answers "HMAC generator online" or "sign webhook payload online".',
    },
    'encryption-playground': {
        title: 'Encryption Playground',
        description: 'AES-GCM encrypt and decrypt in the browser with a raw key (hex or Base64) or a passphrase (PBKDF2-SHA256 + AES-GCM). Outputs a small JSON bundle you can copy and decrypt locally—educational and occasionally practical. Nothing is uploaded.',
        keywords: ['aes gcm', 'encrypt decrypt online', 'web crypto', 'pbkdf2', 'passphrase encryption', 'aes-256-gcm', 'client side encryption', 'browser encryption'],
        aiSummary: 'AES-256-GCM encrypt/decrypt in the browser using a raw key or passphrase (PBKDF2). All crypto runs client-side — answers "AES encrypt text online", "encrypt string with passphrase", or "Web Crypto API demo".',
    },
    'totp-generator': {
        title: 'TOTP / 2FA Code Generator',
        description: 'Paste a Base32 authenticator secret and see the current six-digit RFC 6238 TOTP code refresh every 30 seconds. SHA-1, 30-second step—ideal for testing MFA and sign-in flows. Runs entirely in your browser.',
        keywords: ['totp', '2fa', 'two factor', 'authenticator', 'google authenticator', 'RFC 6238', 'one-time password', 'MFA test', 'otp'],
        aiSummary: 'Paste a Base32 TOTP secret to get the current 6-digit 2FA code refreshing every 30 seconds. Answers "generate TOTP code online", "test authenticator secret", or "RFC 6238 OTP generator".',
    },
    'lorem-ipsum': {
        title: 'Lorem Ipsum Generator',
        description: 'Generate classical Lorem Ipsum as paragraphs, sentences, words, or lists. Export plain text or HTML.',
        keywords: ['lorem ipsum', 'placeholder text', 'dummy text', 'latin filler', 'mockup text'],
        aiSummary: 'Generate Lorem Ipsum placeholder text as paragraphs, sentences, or word lists. Export as plain text or HTML. Answers "lorem ipsum generator online" or "generate placeholder text".',
    },
    'color-picker': {
        title: 'Color Picker & Converter',
        description: 'Pick colors, convert between HEX, RGB, and HSL, and explore harmonic palettes — shades, complementary, triadic, and more.',
        keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'palette generator'],
        aiSummary: 'Pick a color or enter HEX/RGB/HSL to convert between formats and generate harmonic palettes (shades, complementary, triadic). Answers "hex to rgb converter", "color picker online", or "palette generator".',
    },
    'contrast-checker': {
        title: 'WCAG Contrast Checker',
        description: 'Measure WCAG 2.1 contrast between two HEX colors, see AA and AAA pass/fail for normal and large text, and preview typography on the background.',
        keywords: ['wcag contrast', 'contrast ratio', 'aa aaa', 'accessibility checker', 'color contrast', 'text contrast', 'wcag 2.1'],
        aiSummary: 'Enter two colors to get WCAG 2.1 contrast ratio with AA/AAA pass/fail for normal and large text. Answers "color contrast checker", "WCAG AA contrast test", or "accessibility contrast ratio tool".',
    },
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens in the browser: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload'],
        aiSummary: 'Paste a JWT to inspect header and payload (exp / iat / nbf) locally — answers “decode JWT online”, “JWT debugger”, or “read JWT without verifying signature”.',
    },
    'ssh-key-generator': {
        title: 'SSH / RSA Key Generator',
        description: 'Generate Ed25519 or RSA key pairs (2048/4096-bit) in your browser. Download private key (PKCS#8 PEM) and public key in OpenSSH and SPKI PEM formats. Nothing is uploaded.',
        keywords: ['ssh key generator', 'rsa key generator', 'ed25519 key', 'generate ssh key', 'public private key pair', 'openssh key', 'pkcs8', 'rsa 4096'],
        aiSummary: 'Generate Ed25519 or RSA-2048/4096 key pairs entirely in the browser. Outputs PKCS#8 private key PEM, OpenSSH public key (.pub), and SPKI PEM. Answers "generate SSH key online", "create RSA key pair", or "Ed25519 key generator".',
    },
    'certificate-pem-decoder': {
        title: 'Certificate / PEM Decoder',
        description: 'Paste an X.509 PEM certificate or PKCS#10 CSR to inspect subject, issuer, validity, serial, SHA-256 fingerprint, and Subject Alternative Names. Runs locally in your browser.',
        keywords: ['x509 decoder', 'pem decoder', 'certificate parser', 'csr decoder', 'subject alternative name', 'san', 'ssl certificate', 'pkcs10'],
        aiSummary: 'Paste an X.509 PEM cert or PKCS#10 CSR to inspect subject, issuer, expiry, SANs, and SHA-256 fingerprint. Answers "decode SSL certificate online", "read PEM certificate", or "parse CSR online".',
    },
    'regex-tester': {
        title: 'Regex Tester',
        description: 'Test JavaScript regular expressions with live match highlighting, flags (g, i, m, s, u), and match counts. Client-side only.',
        keywords: ['regex tester', 'regular expression', 'javascript regex', 'regex debug', 'pattern match'],
        aiSummary: 'Test JS regex patterns with live match highlighting, group capture, and flag toggles (g, i, m, s, u). Answers "regex tester online", "test regular expression", or "JavaScript regex debugger".',
    },
    'timestamp-converter': {
        title: 'Timestamp Converter',
        description: 'Convert Unix seconds or milliseconds, ISO-8601, and date strings. See UTC, local, and relative time with one-click copy.',
        keywords: ['unix timestamp', 'epoch converter', 'iso 8601', 'relative time', 'date converter'],
        aiSummary: 'Convert Unix timestamps (seconds or ms), ISO-8601 strings, or human dates to UTC/local/relative time. Answers "unix timestamp to date", "epoch converter online", or "convert ISO 8601 date".',
    },
    'cron-builder': {
        title: 'Cron Expression Builder',
        description: 'Build 5-field cron jobs with presets and quick picks, edit raw expressions, read plain-English schedules, and preview next run times.',
        keywords: ['cron builder', 'crontab', 'cron expression', 'schedule parser', 'cron parser'],
        aiSummary: 'Build or decode cron expressions visually. See next run times and plain-English schedule. Answers "cron expression builder online", "crontab generator", or "explain cron schedule".',
    },
    'sql-formatter': {
        title: 'SQL Formatter',
        description: 'Pretty-print SQL in the browser with dialect-aware formatting for MySQL, PostgreSQL, and SQLite.',
        keywords: ['sql formatter', 'pretty print sql', 'postgresql format', 'mysql sql', 'sqlite sql'],
        aiSummary: 'Format and pretty-print SQL for MySQL, PostgreSQL, or SQLite in the browser. Answers "SQL formatter online", "pretty print SQL query", or "format SQL statement".',
    },
    'graphql-formatter': {
        title: 'GraphQL Formatter',
        description: 'Format and minify GraphQL queries, mutations, and subscriptions with Monaco syntax highlighting and a simple query builder. Runs locally in your browser.',
        keywords: ['graphql formatter', 'graphql pretty print', 'graphql query builder', 'graphql minify', 'graphql syntax'],
        aiSummary: 'Format or minify GraphQL queries, mutations, and subscriptions with Monaco syntax highlighting. Answers "GraphQL formatter online", "pretty print GraphQL query", or "minify GraphQL".',
    },
    'yaml-formatter': {
        title: 'YAML Formatter & Validator',
        description: 'Format and validate YAML in the browser. Supports pretty-printing, indentation control, and conversion to JSON. Nothing is uploaded.',
        keywords: ['yaml formatter', 'yaml validator', 'yaml to json', 'json to yaml', 'yaml pretty print', 'format yaml online', 'yaml lint'],
        aiSummary: 'Format, validate, and pretty-print YAML in the browser with optional JSON conversion. Answers "yaml formatter online", "validate yaml", "yaml to json converter", or "pretty print yaml".',
    },
    'diff-checker': {
        title: 'Text Diff Checker',
        description: 'Compare two texts side by side with additions and removals highlighted. Runs entirely in your browser.',
        keywords: ['text diff', 'diff checker', 'side by side compare', 'line diff', 'text compare'],
        aiSummary: 'Compare two texts side by side with additions in green and removals in red. Answers "text diff checker online", "compare two texts", or "side-by-side diff tool".',
    },
    'base64': {
        title: 'Base64 Encoder / Decoder',
        description: 'Encode text to Base64 or decode Base64 strings instantly, with UTF-8 support. Runs entirely in your browser.',
        keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'encode text', 'decode base64'],
        aiSummary: 'Encode text to Base64 or decode Base64 strings in the browser. UTF-8 support. Answers "base64 encode online", "base64 decode", or "convert text to base64".',
    },
    'number-base-converter': {
        title: 'Number Base Converter',
        description: 'Convert integers between number bases 2 through 36 with optional 0x/0b/0o prefixes. Runs entirely in your browser.',
        keywords: ['number base converter', 'radix converter', 'binary to hex', 'decimal to binary', 'base36', 'integer converter'],
        aiSummary: 'Convert integers between any bases 2–36: binary, octal, decimal, hex, and more. Answers "binary to hex converter", "decimal to binary online", or "number base converter".',
    },
    'image-to-base64': {
        title: 'Image to Base64 Converter',
        description: 'Convert images to Data URI or raw Base64 strings instantly. Drops local images and encodes them purely in the browser.',
        keywords: ['image to base64', 'base64 image', 'data uri generator', 'image converter', 'base64 formatter'],
        aiSummary: 'Drop or paste an image to get a Base64 Data URI or raw Base64 string. No server upload. Answers "image to base64 converter online", "convert image to data URI", or "base64 encode image".',
    },
    'image-compressor': {
        title: 'Image Compressor',
        description: 'Compress JPEG, PNG, and WebP images locally in your browser with an adjustable quality slider. No uploads.',
        keywords: ['compress image', 'jpeg compressor', 'webp compressor', 'png optimize', 'reduce image size', 'client side image compression', 'quality slider'],
        aiSummary: 'Compress JPEG, PNG, or WebP images client-side with a quality slider. Download reduced files instantly, no server upload. Answers "compress image online free", "reduce image file size", or "JPEG compressor".',
    },
    'css-gradient-builder': {
        title: 'CSS Gradient Builder',
        description: 'Visual CSS gradient builder with angle control, color stops, and one-click CSS copy.',
        keywords: ['css gradient', 'gradient builder', 'gradient generator', 'linear gradient', 'radial gradient', 'css output'],
        aiSummary: 'Visual CSS gradient builder: set angle, add color stops, and copy the CSS output. Answers "CSS gradient generator online", "linear-gradient builder", or "CSS background gradient tool".',
    },
    'gitignore-generator': {
        title: '.gitignore Generator',
        description: 'Generate .gitignore files instantly for a specific tech stack (Node, Python, macOS, etc.) or combination.',
        keywords: ['gitignore', 'git ignore generator', 'ignore file', 'gitignore boilerplate', 'developer tools'],
        aiSummary: 'Generate .gitignore files for any tech stack (Node, Python, Go, macOS, JetBrains, etc.) or combination. Answers "gitignore generator", "create .gitignore online", or "gitignore for node and mac".',
    },
    'docker-compose-generator': {
        title: 'Docker Compose Generator',
        description:
            'Pick PostgreSQL, Redis, NGINX, Kafka, Elasticsearch, Prometheus, Grafana, and dozens of other images — get a ready-to-edit docker-compose.yml for local development.',
        keywords: [
            'docker compose generator',
            'docker compose generator online',
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
            'Free browser tool: tick databases (Postgres, MySQL, MongoDB, ClickHouse), caches (Redis, Valkey, Memcached), queues (RabbitMQ, NATS, Kafka, Redpanda), search (Elasticsearch, Meilisearch), proxies (Traefik, Caddy, NGINX), observability (Prometheus, Grafana, Jaeger, Loki), and admin UIs — then copy or download docker-compose.yml.',
    },
    'csv-excel-json': {
        title: 'CSV / Excel ↔ JSON Converter',
        description: 'Upload CSV or Excel files and convert to JSON, or export a JSON array of objects back to CSV and XLSX. Dates from Excel become ISO strings. Runs in your browser.',
        keywords: ['csv to json', 'excel to json', 'xlsx to json', 'json to csv', 'json to excel', 'spreadsheet converter', 'tabular data'],
        aiSummary: 'Convert CSV or Excel (.xlsx) files to JSON, or export JSON arrays back to CSV/Excel. Dates from Excel convert to ISO strings. Answers "CSV to JSON converter online", "Excel to JSON", or "JSON to CSV download".',
    },
    'snippet-manager': {
        title: 'Code Snippet Manager',
        description: 'Save, edit, and copy code snippets with Monaco syntax highlighting, auto-detect language, view and edit modes, and format JSON, SQL, and more. Stored locally in your browser.',
        keywords: ['code snippets', 'snippet manager', 'syntax highlighting', 'paste bin', 'developer snippets', 'monaco editor'],
        aiSummary: 'Save and organize code snippets with Monaco syntax highlighting and auto language detection. Format JSON/SQL, copy with one click. Answers "code snippet manager online" or "developer snippet organizer".',
    },
    'markdown-preview-html': {
        title: 'Markdown Preview & HTML Converter',
        description: 'Live Markdown renderer with syntax highlighting, HTML export, and HTML → Markdown conversion. Runs entirely in your browser.',
        keywords: ['markdown preview', 'markdown to html', 'html to markdown', 'markdown renderer', 'markdown editor', 'export html', 'markdown converter'],
        aiSummary: 'Live Markdown preview with syntax highlighting; export to HTML or convert HTML back to Markdown. Answers "markdown preview online", "markdown to HTML converter", or "HTML to markdown tool".',
    },
    'format-converter': {
        title: 'Format Converter',
        description: 'Convert between JSON, YAML, TOML, and XML in any direction. All 12 combinations supported. Runs entirely in your browser.',
        keywords: ['json to yaml', 'yaml to json', 'json to toml', 'toml to json', 'xml to json', 'json to xml', 'yaml to toml', 'toml to yaml', 'format converter', 'data format'],
        aiSummary: 'Convert between JSON, YAML, TOML, and XML in any direction (all 12 combinations). Runs in browser. Answers "JSON to YAML converter", "YAML to TOML online", or "XML to JSON converter".',
    },
    'mime-type-lookup': {
        title: 'MIME Type Lookup',
        description: 'Look up MIME types by file extension or filename and copy the result instantly. Runs entirely in your browser.',
        keywords: ['mime type', 'content-type', 'media type', 'file extension', 'mime lookup', 'http headers'],
        aiSummary: 'Look up MIME / Content-Type for any file extension or filename instantly. Answers "MIME type for .svg", "what is Content-Type for JSON", or "file extension to MIME type".',
    },
    'user-agent-parser': {
        title: 'User-Agent Parser',
        description: 'Paste a User-Agent string to see browser, OS, engine, device, and CPU breakdown instantly. Runs entirely in your browser.',
        keywords: ['user agent', 'ua parser', 'browser detection', 'os detection', 'device detection', 'client hints', 'http headers'],
        aiSummary: 'Paste a User-Agent header string to get browser name/version, OS, rendering engine, device type, and CPU. Answers "user agent parser online", "parse UA string", or "what browser is this user agent".',
    },
    'sql-client': {
        title: 'SQL Client',
        description: 'Connect to PostgreSQL, MySQL, and MariaDB databases from your browser. Run queries, explore schemas, and export results. Credentials encrypted with AES-256 before storage.',
        keywords: ['sql client', 'postgresql client', 'mysql client', 'mariadb client', 'sql query', 'database browser', 'sql explorer'],
        aiSummary: 'Browser SQL client for PostgreSQL, MySQL, and MariaDB: run queries, browse schemas, and export results. Credentials AES-256 encrypted. Answers "browser SQL client", "PostgreSQL GUI online", or "MySQL client no install".',
    },
    'mock-data-generator': {
        title: 'Mock Data Generator',
        description: 'Build a field schema with dozens of data types, optional blanks, sequences, and export JSON, CSV, SQL, or XML up to thousands of rows — all locally in your browser.',
        keywords: ['mock data', 'test data generator', 'fake data', 'json fixtures', 'csv generator', 'sql insert generator', 'api testing', 'mockaroo'],
        aiSummary: 'Schema-based fake data for APIs and tests: export JSON, CSV, SQL, or XML (similar to “Mockaroo online” but in-browser). Good for “generate sample users JSON” or “CSV test data”.',
    },
    'unit-converter': {
        title: 'Unit Converter',
        description: 'Convert between 323 units across 43 scientific and engineering categories including length, mass, pressure, viscosity, thermal, electrical, polymer, and materials science units.',
        keywords: ['unit converter', 'unit conversion', 'measurement converter', 'scientific units', 'engineering units', 'SI units', 'metric converter'],
        aiSummary: '323 units across 43 categories: length, mass, pressure, temperature, viscosity, electrical, polymer, and materials science. Answers "unit converter online", "convert km to miles", or "engineering unit conversion".',
    },
    'svg-optimizer': {
        title: 'SVG Optimizer / Minifier',
        description: 'Paste SVG markup and minify it in the browser with SVGO: drop comments, editor metadata, default attributes, and whitespace—then compare UTF-8 size before and after.',
        keywords: ['svg optimizer', 'svg minify', 'svgo online', 'compress svg', 'optimize svg', 'remove svg metadata', 'svg file size'],
        aiSummary: 'Minify SVG with SVGO in the browser: removes comments, editor metadata, and whitespace. Shows size before/after. Answers "SVGO online", "optimize SVG file", or "compress SVG markup".',
    },
    'break-room/2048': {
        title: '2048',
        description: 'Slide and merge tiles to reach the 2048 tile. A classic number puzzle to clear your head between coding sessions.',
        keywords: ['2048 game', '2048 puzzle', 'number puzzle', 'tile game', 'brain game', 'relaxing game', 'developer break'],
        aiSummary: 'Play 2048 in your browser: arrow keys to slide tiles, merge matching numbers, reach 2048. Score and best score tracked locally.',
    },
    'break-room/sudoku': {
        title: 'Sudoku',
        description: 'Play Sudoku in your browser with 3 difficulty levels and 150 stages each. Scores saved to your account. A perfect brain break between coding sessions.',
        keywords: ['sudoku', 'sudoku online', 'sudoku game', 'sudoku puzzle', 'easy sudoku', 'hard sudoku', 'brain game', 'developer break'],
        aiSummary: 'Play Sudoku with 450 unique puzzles (150 per difficulty: easy, medium, hard). Arrow-key navigation, conflict highlighting, timer, and score tracking — sign in to save progress.',
    },
    'break-room/snake': {
        title: 'Snake',
        description: 'Play the classic Snake game in your browser. Eat food, grow your snake, avoid walls and yourself. Speed increases as your score climbs.',
        keywords: ['snake game', 'snake online', 'classic snake', 'browser game', 'developer break', 'brain break'],
        aiSummary: 'Classic Snake game: arrow keys or WASD to move, eat food to grow, avoid walls and yourself. Speed ramps up every 50 points. Best score saved locally.',
    },
    'break-room/minesweeper': {
        title: 'Minesweeper',
        description: 'Play classic Minesweeper in your browser. Three difficulty levels: beginner, intermediate, and expert. Left click to reveal, right click to flag.',
        keywords: ['minesweeper', 'minesweeper online', 'classic minesweeper', 'browser game', 'developer break', 'puzzle game'],
        aiSummary: 'Classic Minesweeper: left click to reveal, right click to flag. Beginner (9×9, 10 mines), intermediate (16×16, 40 mines), expert (30×16, 99 mines). First click is always safe.',
    },
    'break-room/tetris': {
        title: 'Tetris',
        description: 'Play classic Tetris in your browser. Stack falling pieces, clear lines, and level up. Arrow keys to move, Space for hard drop.',
        keywords: ['tetris', 'tetris online', 'classic tetris', 'browser game', 'developer break', 'block puzzle'],
        aiSummary: 'Classic Tetris: arrow keys to move and rotate, Space for hard drop, P to pause. Ghost piece preview, speed increases per level. Best score saved locally.',
    },
}

function toolMetaDescription(tool: ToolMetadataEntry): string {
    const primary = tool.aiSummary ?? tool.description
    const suffix = ' Online developer tools on MyDevTools; runs in your browser.'
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
    return `Free ${label} Online`
}

// Generate metadata for a tool page
export function generateToolMetadata(toolSlug: string): Metadata {
    const tool = toolsMetadata[toolSlug]

    if (!tool) {
        return {
            title: 'Developer Tool - MyDevTools',
            description: 'Online developer tools and utilities.',
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
    title: 'MyDevTools — Online Developer Tools & Developer Toolkit',
    description: '50+ online developer tools in one browser-based toolkit: JSON formatter, JWT decoder, API client, regex tester, UUID generator, base64 encoder, and more. Open source and self-hostable.',
    url: baseUrl,
    ogImage: ogImageUrl('MyDevTools — Online Developer Tools', 'A browser-based developer toolkit with JSON, JWT, API, regex, UUID, Base64, and 50+ more tools.'),
}
