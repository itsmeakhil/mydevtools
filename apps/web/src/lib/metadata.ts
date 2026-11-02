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
    'snippet-manager': {
        title: 'Code Snippet Manager',
        description: 'Save, edit, and copy code snippets with Monaco syntax highlighting, auto-detect language, view and edit modes, and format JSON, SQL, and more. Stored locally on your device.',
        keywords: ['code snippets', 'snippet manager', 'syntax highlighting', 'paste bin', 'developer snippets', 'monaco editor'],
        aiSummary: 'Save and organize code snippets with Monaco syntax highlighting and auto language detection. Format JSON/SQL, copy with one click — a code snippet manager and developer snippet organizer.',
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
