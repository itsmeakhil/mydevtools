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
        keywords: ['to do list', 'task manager', 'todo app', 'task list', 'productivity']
    },
    'notes': {
        title: 'Notes',
        description: 'Create and manage notes quickly. Markdown-supported note-taking for developers.',
        keywords: ['notes app', 'note taking', 'quick notes', 'developer notes', 'markdown notes']
    },
    'bookmarks': {
        title: 'Bookmarks',
        description: 'Save and organize your favorite links and developer resources in one place.',
        keywords: ['bookmarks manager', 'link organizer', 'developer resources', 'save links', 'favorites']
    },
    'password-manager': {
        title: 'Password Manager',
        description: 'Securely store and manage passwords with client-side AES-256 encryption. Zero-knowledge vault.',
        keywords: ['password manager', 'password vault', 'secure passwords', 'password storage', 'encrypted vault']
    },
    'environment-manager': {
        title: 'Environment Manager',
        description: 'Organize environment variables by project and environment. Encrypted on your device with AES-256-GCM before sync.',
        keywords: ['environment variables', 'env file', 'secrets manager', 'dotenv', 'encrypted env', 'devops']
    },
    'email-validator': {
        title: 'Email Validator',
        description: 'Verify and validate email addresses with MX record checks and RFC 5322 syntax validation.',
        keywords: ['email validator', 'email verification', 'mx record check', 'email syntax', 'validate email']
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
        keywords: ['http status codes', 'status code list', 'http response codes', '200 ok', '404 not found', '500 internal server error', 'rfc 9110']
    },
    'nosql-explorer': {
        title: 'NoSQL Explorer',
        description: 'Explore and manage your MongoDB databases directly from your browser.',
        keywords: ['nosql explorer', 'mongodb manager', 'database explorer', 'mongo ui', 'mongodb browser']
    },
    'url-encode': {
        title: 'URL Encoder / Decoder',
        description: 'Percent-encode or decode text for query strings and URI components with UTF-8 support.',
        keywords: ['url encode', 'url decode', 'percent encode', 'uri encode', 'encodeURIComponent']
    },
    'url-parser': {
        title: 'URL Parser',
        description: 'Parse any URL into protocol, host, path, query parameters, and hash. Runs locally in your browser.',
        keywords: ['url parser', 'parse url', 'url components', 'query params', 'hash fragment', 'protocol', 'hostname']
    },
    'uuid-generator': {
        title: 'UUID / ULID Generator',
        description: 'Generate UUID v1–v7 or ULIDs with namespace options and bulk copy or download.',
        keywords: ['uuid generator', 'ulid generator', 'guid', 'uuid v4', 'uuid v7', 'bulk uuid']
    },
    'secret-api-key-generator': {
        title: 'Secret / API Key Generator',
        description: 'Generate cryptographically random strings with a configurable alphabet and length. Bulk copy or download; pairs with the UUID generator.',
        keywords: ['api key generator', 'secret generator', 'random string', 'crypto random', 'token generator', 'getrandomvalues']
    },
    'qr-code-generator': {
        title: 'QR Code Generator',
        description: 'Create PNG QR codes from any text or URL with error correction, colors, and margin. Runs entirely in your browser.',
        keywords: ['qr code', 'qr generator', 'qrcode', 'png qr', 'wifi qr', 'vcard qr', 'offline qr']
    },
    'ip-subnet-calculator': {
        title: 'IP / Subnet Calculator',
        description: 'Compute IPv4 and IPv6 CIDR details: netmask, wildcard, broadcast, first and last host, and subnet size. Runs locally in your browser.',
        keywords: ['subnet calculator', 'cidr calculator', 'ip calculator', 'netmask', 'ipv6 subnet', 'network calculator', 'ip range']
    },
    'hash-generator': {
        title: 'Hash Generator',
        description: 'Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 digests for text or files with hex output. All hashing runs locally in your browser.',
        keywords: ['hash generator', 'sha256', 'md5', 'sha512', 'checksum', 'digest', 'file hash', 'crypto hash']
    },
    'hmac-generator': {
        title: 'HMAC Generator',
        description: 'Compute HMAC-SHA1, HMAC-SHA256, HMAC-SHA384, and HMAC-SHA512 signatures in hex or Base64 for webhook signing and API integration testing. Runs entirely in your browser.',
        keywords: ['hmac', 'hmac sha256', 'webhook signature', 'api signing', 'stripe webhook', 'github webhook', 'message authentication']
    },
    'lorem-ipsum': {
        title: 'Lorem Ipsum Generator',
        description: 'Generate classical Lorem Ipsum as paragraphs, sentences, words, or lists. Export plain text or HTML.',
        keywords: ['lorem ipsum', 'placeholder text', 'dummy text', 'latin filler', 'mockup text']
    },
    'color-picker': {
        title: 'Color Picker & Converter',
        description: 'Pick colors, convert between HEX, RGB, and HSL, and explore harmonic palettes — shades, complementary, triadic, and more.',
        keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'palette generator']
    },
    'contrast-checker': {
        title: 'WCAG Contrast Checker',
        description: 'Measure WCAG 2.1 contrast between two HEX colors, see AA and AAA pass/fail for normal and large text, and preview typography on the background.',
        keywords: ['wcag contrast', 'contrast ratio', 'aa aaa', 'accessibility checker', 'color contrast', 'text contrast', 'wcag 2.1']
    },
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens in the browser: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload'],
        aiSummary: 'Paste a JWT to inspect header and payload (exp / iat / nbf) locally — answers “decode JWT online”, “JWT debugger”, or “read JWT without verifying signature”.',
    },
    'certificate-pem-decoder': {
        title: 'Certificate / PEM Decoder',
        description: 'Paste an X.509 PEM certificate or PKCS#10 CSR to inspect subject, issuer, validity, serial, SHA-256 fingerprint, and Subject Alternative Names. Runs locally in your browser.',
        keywords: ['x509 decoder', 'pem decoder', 'certificate parser', 'csr decoder', 'subject alternative name', 'san', 'ssl certificate', 'pkcs10']
    },
    'regex-tester': {
        title: 'Regex Tester',
        description: 'Test JavaScript regular expressions with live match highlighting, flags (g, i, m, s, u), and match counts. Client-side only.',
        keywords: ['regex tester', 'regular expression', 'javascript regex', 'regex debug', 'pattern match']
    },
    'timestamp-converter': {
        title: 'Timestamp Converter',
        description: 'Convert Unix seconds or milliseconds, ISO-8601, and date strings. See UTC, local, and relative time with one-click copy.',
        keywords: ['unix timestamp', 'epoch converter', 'iso 8601', 'relative time', 'date converter']
    },
    'cron-builder': {
        title: 'Cron Expression Builder',
        description: 'Build 5-field cron jobs with presets and quick picks, edit raw expressions, read plain-English schedules, and preview next run times.',
        keywords: ['cron builder', 'crontab', 'cron expression', 'schedule parser', 'cron parser']
    },
    'sql-formatter': {
        title: 'SQL Formatter',
        description: 'Pretty-print SQL in the browser with dialect-aware formatting for MySQL, PostgreSQL, and SQLite.',
        keywords: ['sql formatter', 'pretty print sql', 'postgresql format', 'mysql sql', 'sqlite sql']
    },
    'graphql-formatter': {
        title: 'GraphQL Formatter',
        description: 'Format and minify GraphQL queries, mutations, and subscriptions with Monaco syntax highlighting and a simple query builder. Runs locally in your browser.',
        keywords: ['graphql formatter', 'graphql pretty print', 'graphql query builder', 'graphql minify', 'graphql syntax']
    },
    'diff-checker': {
        title: 'Text Diff Checker',
        description: 'Compare two texts side by side with additions and removals highlighted. Runs entirely in your browser.',
        keywords: ['text diff', 'diff checker', 'side by side compare', 'line diff', 'text compare']
    },
    'base64': {
        title: 'Base64 Encoder / Decoder',
        description: 'Encode text to Base64 or decode Base64 strings instantly, with UTF-8 support. Runs entirely in your browser.',
        keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'encode text', 'decode base64']
    },
    'number-base-converter': {
        title: 'Number Base Converter',
        description: 'Convert integers between number bases 2 through 36 with optional 0x/0b/0o prefixes. Runs entirely in your browser.',
        keywords: ['number base converter', 'radix converter', 'binary to hex', 'decimal to binary', 'base36', 'integer converter']
    },
    'image-to-base64': {
        title: 'Image to Base64 Converter',
        description: 'Convert images to Data URI or raw Base64 strings instantly. Drops local images and encodes them purely in the browser.',
        keywords: ['image to base64', 'base64 image', 'data uri generator', 'image converter', 'base64 formatter']
    },
    'image-compressor': {
        title: 'Image Compressor',
        description: 'Compress JPEG, PNG, and WebP images locally in your browser with an adjustable quality slider. No uploads.',
        keywords: ['compress image', 'jpeg compressor', 'webp compressor', 'png optimize', 'reduce image size', 'client side image compression', 'quality slider']
    },
    'css-gradient-builder': {
        title: 'CSS Gradient Builder',
        description: 'Visual CSS gradient builder with angle control, color stops, and one-click CSS copy.',
        keywords: ['css gradient', 'gradient builder', 'gradient generator', 'linear gradient', 'radial gradient', 'css output']
    },
    'gitignore-generator': {
        title: '.gitignore Generator',
        description: 'Generate .gitignore files instantly for a specific tech stack (Node, Python, macOS, etc.) or combination.',
        keywords: ['gitignore', 'git ignore generator', 'ignore file', 'gitignore boilerplate', 'developer tools']
    },
    'csv-excel-json': {
        title: 'CSV / Excel ↔ JSON Converter',
        description: 'Upload CSV or Excel files and convert to JSON, or export a JSON array of objects back to CSV and XLSX. Dates from Excel become ISO strings. Runs in your browser.',
        keywords: ['csv to json', 'excel to json', 'xlsx to json', 'json to csv', 'json to excel', 'spreadsheet converter', 'tabular data']
    },
    'snippet-manager': {
        title: 'Code Snippet Manager',
        description: 'Save, edit, and copy code snippets with Monaco syntax highlighting, auto-detect language, view and edit modes, and format JSON, SQL, and more. Stored locally in your browser.',
        keywords: ['code snippets', 'snippet manager', 'syntax highlighting', 'paste bin', 'developer snippets', 'monaco editor']
    },
    'markdown-preview-html': {
        title: 'Markdown Preview & HTML Converter',
        description: 'Live Markdown renderer with syntax highlighting, HTML export, and HTML → Markdown conversion. Runs entirely in your browser.',
        keywords: ['markdown preview', 'markdown to html', 'html to markdown', 'markdown renderer', 'markdown editor', 'export html', 'markdown converter']
    },
    'format-converter': {
        title: 'Format Converter',
        description: 'Convert between JSON, YAML, TOML, and XML in any direction. All 12 combinations supported. Runs entirely in your browser.',
        keywords: ['json to yaml', 'yaml to json', 'json to toml', 'toml to json', 'xml to json', 'json to xml', 'yaml to toml', 'toml to yaml', 'format converter', 'data format']
    },
    'mime-type-lookup': {
        title: 'MIME Type Lookup',
        description: 'Look up MIME types by file extension or filename and copy the result instantly. Runs entirely in your browser.',
        keywords: ['mime type', 'content-type', 'media type', 'file extension', 'mime lookup', 'http headers']
    },
    'user-agent-parser': {
        title: 'User-Agent Parser',
        description: 'Paste a User-Agent string to see browser, OS, engine, device, and CPU breakdown instantly. Runs entirely in your browser.',
        keywords: ['user agent', 'ua parser', 'browser detection', 'os detection', 'device detection', 'client hints', 'http headers']
    },
    'sql-client': {
        title: 'SQL Client',
        description: 'Connect to PostgreSQL, MySQL, and MariaDB databases from your browser. Run queries, explore schemas, and export results. Credentials encrypted with AES-256 before storage.',
        keywords: ['sql client', 'postgresql client', 'mysql client', 'mariadb client', 'sql query', 'database browser', 'sql explorer']
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
        keywords: ['unit converter', 'unit conversion', 'measurement converter', 'scientific units', 'engineering units', 'SI units', 'metric converter']
    },
    'svg-optimizer': {
        title: 'SVG Optimizer / Minifier',
        description: 'Paste SVG markup and minify it in the browser with SVGO: drop comments, editor metadata, default attributes, and whitespace—then compare UTF-8 size before and after.',
        keywords: ['svg optimizer', 'svg minify', 'svgo online', 'compress svg', 'optimize svg', 'remove svg metadata', 'svg file size']
    },
}

function toolMetaDescription(tool: ToolMetadataEntry): string {
    const primary = tool.aiSummary ?? tool.description
    const suffix = ' Free online on MyDevTools; runs in your browser.'
    const max = 165
    if (primary.length + suffix.length <= max) return primary + suffix
    return (primary.slice(0, max - suffix.length - 1).trimEnd() + '…' + suffix).slice(0, max)
}

// Generate metadata for a tool page
export function generateToolMetadata(toolSlug: string): Metadata {
    const tool = toolsMetadata[toolSlug]

    if (!tool) {
        return {
            title: 'Developer Tool - MyDevTools',
            description: 'Free online developer tools and utilities.',
        }
    }

    const image = ogImageUrl(tool.title, tool.description)
    const metaDescription = toolMetaDescription(tool)
    const keywordStr = [...tool.keywords, 'online developer tool', 'free', 'browser', 'MyDevTools'].join(', ')

    return {
        title: tool.title,
        description: metaDescription,
        keywords: keywordStr,
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
            title: `${tool.title} | MyDevTools`,
            description: metaDescription,
            url: `${baseUrl}/app/${toolSlug}`,
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
            title: `${tool.title} | MyDevTools`,
            description: metaDescription,
            images: [image],
            creator: '@mydevtools',
        },
        alternates: {
            canonical: `${baseUrl}/app/${toolSlug}`,
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
    title: 'MyDevTools - Essential Tools for Developers',
    description: 'Your Ultimate Developer Toolkit. Access free online tools including JSON editor, API client, password manager, and more. Boost productivity with client-side processing.',
    url: baseUrl,
    ogImage: ogImageUrl('MyDevTools', 'Essential Tools for Developers'),
    keywords: [
        'developer tools',
        'online tools',
        'free developer tools online',
        'browser based devtools',
        'json editor',
        'api client',
        'nosql explorer',
        'password manager',
        'productivity tools',
        'ChatGPT developer tools',
        'Gemini tools for developers',
    ],
}
