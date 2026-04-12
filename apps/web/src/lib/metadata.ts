import { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

function ogImageUrl(title: string, description: string): string {
    return `${baseUrl}/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
}

// Tool metadata definitions
export const toolsMetadata: Record<string, {
    title: string
    description: string
    keywords: string[]
}> = {
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
        keywords: ['json editor', 'json formatter', 'json validator', 'edit json', 'jsonpath']
    },
    'json-schema-generator': {
        title: 'JSON Schema Generator',
        description: 'Generate JSON Schema (Draft 2020-12) and typed models for Python, TypeScript, Go, Rust, Java, C#, Dart, and Swift from sample JSON.',
        keywords: ['json schema', 'jsonschema', 'pydantic', 'typescript types', 'go struct from json', 'serde', 'openapi']
    },
    'api-client': {
        title: 'API Client',
        description: 'Test and debug HTTP requests with headers, body, and auth support. A lightweight Postman alternative in your browser.',
        keywords: ['api client', 'http client', 'rest api tester', 'debug api', 'postman alternative']
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
    'uuid-generator': {
        title: 'UUID / ULID Generator',
        description: 'Generate UUID v1–v7 or ULIDs with namespace options and bulk copy or download.',
        keywords: ['uuid generator', 'ulid generator', 'guid', 'uuid v4', 'uuid v7', 'bulk uuid']
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
    'jwt-decoder': {
        title: 'JWT Decoder',
        description: 'Decode JSON Web Tokens in the browser: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload']
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
    'image-to-base64': {
        title: 'Image to Base64 Converter',
        description: 'Convert images to Data URI or raw Base64 strings instantly. Drops local images and encodes them purely in the browser.',
        keywords: ['image to base64', 'base64 image', 'data uri generator', 'image converter', 'base64 formatter']
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

    return {
        title: tool.title,
        description: tool.description,
        keywords: tool.keywords,
        openGraph: {
            title: `${tool.title} | MyDevTools`,
            description: tool.description,
            url: `${baseUrl}/app/${toolSlug}`,
            siteName: 'MyDevTools',
            type: 'website',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: tool.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${tool.title} | MyDevTools`,
            description: tool.description,
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
        'json editor',
        'api client',
        'nosql explorer',
        'password manager',
        'productivity tools',
    ],
}
