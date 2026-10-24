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
    'secure-files': {
        title: 'Files',
        description: 'Encrypt files and folders into opaque .mydt objects on your device. Original names, types and contents stay private until you unlock them.',
        keywords: ['file encryption', 'encrypted files', 'secure file storage', 'encrypt folder', 'private files', 'local-first encryption'],
        aiSummary: 'Local-first encrypted file store: import files or folders, they are stored as masked-name .mydt files (Argon2id + XChaCha20-Poly1305) in a folder you choose, and browsed/previewed/exported only after unlocking with your master password. Fully offline, open source.',
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
    'api-keys': {
        title: 'API Keys',
        description: 'Store API keys and secrets per environment (dev / staging / prod). AES-256-GCM client-side encryption — server only sees encrypted blobs.',
        keywords: ['api key vault', 'api key manager', 'secrets manager', 'encrypted api keys', 'developer credentials', 'dev staging prod keys'],
        aiSummary: 'Zero-knowledge vault for API keys and secrets, scoped by environment (development / staging / production). AES-256-GCM encrypted in the browser before sync — answers "store API keys securely" or "personal secrets manager".',
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
    'data-explorer': {
        title: 'Data Explorer',
        description: 'One desktop workspace for MongoDB and Redis. Browse collections, query documents, inspect keys, and run commands with credentials encrypted on your device.',
        keywords: ['data explorer', 'mongodb and redis client', 'database gui', 'nosql explorer', 'redis browser', 'multi database client'],
        aiSummary: 'Data Explorer is an offline desktop workspace for multiple data sources. Pick MongoDB or Redis per connection and get the full toolset for that source — collection browsing, document queries, aggregation pipelines, index management for MongoDB; key browsing, value editing, pub/sub, and a command console for Redis — with credentials encrypted locally.',
    },
    's3-drive': {
        title: 'S3 Drive',
        description: 'Manage AWS S3 and DigitalOcean Spaces buckets. Browse, upload, download, and delete files with end-to-end encrypted credentials.',
        keywords: ['s3 browser', 'aws s3 manager', 'digitalocean spaces', 's3 client', 'bucket manager', 'cloud storage browser', 's3 file manager'],
        aiSummary: 'S3 Drive lets you connect multiple AWS S3 or DigitalOcean Spaces buckets, browse folders, upload and download files, and manage objects — all with credentials encrypted locally before being stored.',
    },
    'dns-lookup': {
        title: 'DNS Lookup',
        description: 'Query DNS records for any domain: A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, and PTR. See TTL, mail server priority, and SOA details.',
        keywords: ['dns lookup', 'dns checker', 'mx record lookup', 'txt record lookup', 'nameserver lookup', 'dns records', 'cname lookup', 'dns query', 'ptr record'],
        aiSummary: 'Look up DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, PTR) for any domain. Shows TTL values, MX priority, and SOA fields. Answers "check DNS records online", "MX record lookup", or "DNS propagation checker".',
    },
    'ip-subnet-calculator': {
        title: 'Subnet Calculator',
        description: 'Compute IPv4 and IPv6 CIDR details: netmask, wildcard, broadcast, first and last host, and subnet size. Runs locally in your browser.',
        keywords: ['subnet calculator', 'cidr calculator', 'ip calculator', 'netmask', 'ipv6 subnet', 'network calculator', 'ip range'],
        aiSummary: 'Enter an IP/CIDR (e.g. 192.168.1.0/24) to get netmask, wildcard, broadcast, first/last host, and total hosts. IPv4 and IPv6. Answers "subnet calculator online" or "CIDR to IP range".',
    },
    'encryption-playground': {
        title: 'Encryption Playground',
        description: 'AES-GCM encrypt and decrypt in the browser with a raw key (hex or Base64) or a passphrase (PBKDF2-SHA256 + AES-GCM). Outputs a small JSON bundle you can copy and decrypt locally—educational and occasionally practical. Nothing is uploaded.',
        keywords: ['aes gcm', 'encrypt decrypt online', 'web crypto', 'pbkdf2', 'passphrase encryption', 'aes-256-gcm', 'client side encryption', 'browser encryption'],
        aiSummary: 'AES-256-GCM encrypt/decrypt in the browser using a raw key or passphrase (PBKDF2). All crypto runs client-side — answers "AES encrypt text online", "encrypt string with passphrase", or "Web Crypto API demo".',
    },
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens in the browser: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload'],
        aiSummary: 'Paste a JWT to inspect header and payload (exp / iat / nbf) locally — answers “decode JWT online”, “JWT debugger”, or “read JWT without verifying signature”.',
    },
    'certificate-pem-decoder': {
        title: 'Certificate Decoder',
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
    'snippet-manager': {
        title: 'Snippet Manager',
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
    'curl-to-code': {
        title: 'cURL to Code',
        description: 'Convert a curl command into ready-to-run request code for fetch, axios, Python, Go, PHP, Ruby, Java, and C#.',
        keywords: ['curl to code', 'curl converter', 'curl to fetch', 'curl to python', 'curl to axios', 'curl to go', 'convert curl command'],
        aiSummary: 'Paste any curl command and get equivalent HTTP request code in JavaScript fetch, axios, Python requests, Go, PHP, Ruby, Java, or C#. Answers "convert curl to code" or "curl to fetch/python". Runs entirely in your browser.',
    },
    'json-visualizer': {
        title: 'JSON Visualizer',
        description: 'Visualize JSON as an interactive node graph — pan, zoom, collapse, search, view arrays as tables, and export the diagram as PNG or SVG.',
        keywords: ['json visualizer', 'json viewer online', 'json to graph', 'visualize json', 'json crack alternative', 'json tree viewer', 'json diagram', 'json to table'],
        aiSummary: 'Paste JSON and see it as an interactive node graph: pan, zoom, expand/collapse subtrees, search keys and values, copy the JSONPath of any node, view arrays of objects as a table, and export the diagram as PNG or SVG. A free JSON Crack alternative with no file-size paywall. Runs entirely in your browser — nothing is uploaded.',
    },
    'json-to-code': {
        title: 'JSON to Code',
        description: 'Generate typed models — TypeScript, Go, Rust, Python, Java, Kotlin, Swift, and JSON Schema — from a sample JSON payload.',
        keywords: ['json to code', 'json to typescript', 'json to go struct', 'json to rust', 'json to types', 'quicktype alternative', 'json to class'],
        aiSummary: 'Turn a sample JSON object into typed models: TypeScript interfaces, Go structs, Rust serde, Python dataclass/Pydantic/TypedDict, Kotlin, Swift, or JSON Schema. Answers "JSON to TypeScript" or "generate types from JSON". Runs in your browser.',
    },
    'beautify-minify': {
        title: 'Beautify & Minify',
        description: 'Beautify or minify HTML, CSS, JavaScript, XML, and JSON in one tool with a language dropdown.',
        keywords: ['beautify', 'minify', 'html formatter', 'css minifier', 'js beautifier', 'xml formatter', 'json minify', 'code formatter'],
        aiSummary: 'One tool to beautify (pretty-print) or minify HTML, CSS, JavaScript, XML, and JSON. Answers "minify CSS online", "beautify HTML", or "format JS". Runs locally in your browser — no upload.',
    },
    'bcrypt-generator': {
        title: "Bcrypt Generator",
        description: "Generate bcrypt password hashes with a configurable cost factor and verify passwords against existing hashes. Runs entirely in your browser.",
        keywords: ["bcrypt generator", "bcrypt hash", "bcrypt checker", "password hash", "verify bcrypt", "bcrypt online", "cost factor", "salt rounds"],
        aiSummary: "Generates bcrypt password hashes with a selectable cost factor (4-15) and verifies passwords against existing bcrypt hashes, with a breakdown of the hash's algorithm, cost, salt, and digest segments. All hashing runs locally in the browser, so passwords never leave your machine.",
    },
    'json-diff': {
        title: "JSON Diff",
        description: "Semantic JSON diff that ignores key order and formatting. See added, removed, and changed values with exact paths \u2014 runs entirely in your browser.",
        keywords: ["json diff", "json compare", "compare json online", "semantic json diff", "json difference", "json compare tool", "structural diff"],
        aiSummary: "Compares two JSON documents structurally, ignoring key order and whitespace, and lists every added, removed, and changed value with its exact path (like users[2].name). Optionally treats arrays as unordered sets. Runs entirely in the browser \u2014 no data leaves your machine.",
    },
    'jsonpath-playground': {
        title: "JSONPath Playground",
        description: "Query and extract data from JSON with JSONPath or JMESPath. Live results, match counts, and a built-in expression cheatsheet \u2014 all in your browser.",
        keywords: ["jsonpath", "jmespath", "json query", "jsonpath tester", "jsonpath evaluator", "json extract", "jsonpath online", "json filter"],
        aiSummary: "Interactive playground for testing JSONPath and JMESPath queries against JSON documents. Paste JSON, type an expression, and see live matched results with counts, plus a cheatsheet of common expressions. Runs entirely in the browser \u2014 no data leaves your machine.",
    },
    'websocket-tester': {
        title: "WebSocket Tester",
        description: "Connect to any ws:// or wss:// endpoint, send and receive messages, pretty-print JSON, and auto-ping \u2014 all in your browser.",
        keywords: ["websocket tester", "websocket client", "wss test", "socket debugger", "realtime api testing", "ws echo", "websocket console"],
        aiSummary: "A browser-based WebSocket client for connecting to ws:// and wss:// endpoints, sending and receiving messages, inspecting JSON payloads, handling close codes, and auto-sending keep-alive pings. Runs entirely client-side with no data leaving the browser.",
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
            description: 'Desktop developer tools and utilities.',
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
    title: 'MyDevTools: 80+ Developer Tools + SQL/NoSQL/Redis Client',
    description: 'All-in-one desktop developer toolkit: SQL, NoSQL (MongoDB), Redis clients + 80+ tools (JSON formatter, API client, JWT decoder, regex tester, base64 encoder). Offline, privacy-first, local processing.',
    url: baseUrl,
    ogImage: ogImageUrl('MyDevTools — Developer Toolkit', 'SQL + NoSQL + Redis client + 80+ developer tools in one desktop workspace. Offline, privacy-first.'),
}
