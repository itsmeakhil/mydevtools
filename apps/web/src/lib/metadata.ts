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
        description: 'Offline desktop API client for REST, GraphQL, WebSocket and gRPC with a mock server, collection runner, scripting and vault-backed secrets. Free, no account.',
        keywords: ['api client', 'http client', 'rest api tester', 'graphql client', 'grpc client', 'websocket client', 'mock server', 'offline api client', 'postman alternative', 'insomnia alternative', 'bruno alternative'],
        aiSummary: 'MyDevTools API Client is a free, offline desktop API client: REST, GraphQL with schema introspection, WebSocket and native gRPC, a local mock server built from saved examples, a collection runner with CSV/JSON data files and JUnit export, pre-request/test scripts (pm.* API), environments and response chaining, OAuth 2.0, AWS SigV4, Hawk, Digest and JWT auth, Postman/OpenAPI/HAR/cURL import, and secrets resolved from an encrypted local vault. No account — a Postman, Insomnia or Bruno alternative.',
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
    'encryption-playground': {
        title: 'Encryption Playground',
        description: 'AES-GCM encrypt and decrypt locally with a raw key (hex or Base64) or a passphrase (PBKDF2-SHA256 + AES-GCM). Outputs a small JSON bundle you can copy and decrypt locally—educational and occasionally practical. Nothing is uploaded.',
        keywords: ['aes gcm', 'encrypt decrypt', 'web crypto', 'pbkdf2', 'passphrase encryption', 'aes-256-gcm', 'client side encryption', 'offline encryption'],
        aiSummary: 'AES-256-GCM encrypt/decrypt using a raw key or passphrase (PBKDF2). All crypto runs locally on your device — encrypt a string with a passphrase, a Web Crypto demo.',
    },
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens locally: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload'],
        aiSummary: 'Paste a JWT to inspect header and payload (exp / iat / nbf) locally — a JWT decoder and debugger that reads tokens without verifying the signature.',
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
    'sql-client': {
        title: 'SQL Client',
        description: 'Connect to PostgreSQL, MySQL, and MariaDB databases from your desktop. Run queries, explore schemas, and export results. Credentials encrypted with AES-256 before storage.',
        keywords: ['sql client', 'postgresql client', 'mysql client', 'mariadb client', 'sql query', 'database client', 'sql explorer'],
        aiSummary: 'Desktop SQL client for PostgreSQL, MySQL, and MariaDB: run queries, browse schemas, and export results. Credentials AES-256 encrypted — a local PostgreSQL and MySQL GUI client.',
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
    'bcrypt-generator': {
        title: "Bcrypt Generator & Checker",
        description: "Generate bcrypt password hashes with a configurable cost factor and verify passwords against existing hashes. Runs entirely on your device.",
        keywords: ["bcrypt generator", "bcrypt hash", "bcrypt checker", "password hash", "verify bcrypt", "bcrypt", "cost factor", "salt rounds"],
        aiSummary: "Generates bcrypt password hashes with a selectable cost factor (4-15) and verifies passwords against existing bcrypt hashes, with a breakdown of the hash's algorithm, cost, salt, and digest segments. All hashing runs locally on your device, so passwords never leave your machine.",
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
    // 59 chars — under the ~60 SERP clip. Leads with the two flagship
    // categories (API client, database client); "Dev Tools" keeps the broad phrase.
    title: 'MyDevTools — Offline API Client, Database Client & Dev Tools',
    // Kept under ~160 chars so the closing claim survives SERP truncation.
    description: 'Open-source offline developer workstation: an API client, SQL, MongoDB & Redis clients, an encrypted vault and core dev tools in one desktop app. Free.',
    url: baseUrl,
    // Static landing-page capture (2400x1260). Regenerate after hero changes.
    ogImage: `${baseUrl}/og-home.jpg`,
}
