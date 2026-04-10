import { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

// Tool metadata definitions
export const toolsMetadata: Record<string, {
    title: string
    description: string
    keywords: string[]
}> = {
    'to-do': {
        title: 'To-Do List - Task Management App',
        description: 'Manage tasks and to-do lists efficiently. Free to-do list app for developers.',
        keywords: ['to do list', 'task manager', 'todo app', 'task list', 'productivity']
    },
    'notes': {
        title: 'Notes - Quick Note Taking App',
        description: 'Create and manage notes quickly. Simple note-taking app for developers.',
        keywords: ['notes app', 'note taking', 'quick notes', 'developer notes', 'text notes']
    },
    'password-manager': {
        title: 'Password Manager - Secure Password Vault',
        description: 'Securely store and manage passwords with client-side encryption. Free password manager with vault protection.',
        keywords: ['password manager', 'password vault', 'secure passwords', 'password storage', 'encrypted vault']
    },
    'json-formatter': {
        title: 'JSON Editor - Advanced JSON Tool',
        description: 'Format, validate, and edit JSON data with our powerful JSON editor.',
        keywords: ['json editor', 'json formatter', 'json validator', 'edit json']
    },
    'api-client': {
        title: 'API Client - Test HTTP Requests',
        description: 'Test and debug HTTP requests with our easy-to-use API client.',
        keywords: ['api client', 'http client', 'rest api tester', 'debug api']
    },
    'nosql-explorer': {
        title: 'NoSQL Explorer - Manage MongoDB',
        description: 'Explore and manage your MongoDB databases directly from your browser.',
        keywords: ['nosql explorer', 'mongodb manager', 'database explorer', 'mongo ui']
    },
    'url-encode': {
        title: 'URL Encoder / Decoder - Percent Encoding',
        description: 'Percent-encode or decode text for query strings and URI components with UTF-8.',
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
        title: 'Color Picker & HEX RGB HSL Converter',
        description: 'Pick colors, convert between HEX, RGB, and HSL, and copy CSS. Explore harmonic palettes in the browser.',
        keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'palette generator']
    },
    'jwt-decoder': {
        title: 'JWT Decoder - Header, Payload & Expiry',
        description: 'Decode JSON Web Tokens in the browser: header, payload, exp, iat, and nbf. No server upload; signature not verified.',
        keywords: ['jwt decode', 'jwt debugger', 'json web token', 'jwt exp', 'jwt payload']
    },
    'regex-tester': {
        title: 'Regex Tester - Live Match Highlighting',
        description: 'Test JavaScript regular expressions with live highlights, flags (g, i, m, s, u), and match counts. Client-side only.',
        keywords: ['regex tester', 'regular expression', 'javascript regex', 'regex debug', 'pattern match']
    },
    'timestamp-converter': {
        title: 'Timestamp Converter - Unix, ISO & Relative',
        description: 'Convert Unix seconds or milliseconds, ISO-8601, and date strings. See UTC, local, and relative time with one-click copy.',
        keywords: ['unix timestamp', 'epoch converter', 'iso 8601', 'relative time', 'date converter']
    },
    'cron-builder': {
        title: 'Cron Expression Builder & Parser',
        description: 'Build 5-field cron jobs with presets and quick picks, edit raw expressions, read plain-English schedules, and preview next run times in the browser.',
        keywords: ['cron builder', 'crontab', 'cron expression', 'schedule parser', 'cron parser']
    },
    'sql-formatter': {
        title: 'SQL Formatter - MySQL, PostgreSQL, SQLite',
        description: 'Pretty-print SQL in the browser with dialect-aware formatting for MySQL, PostgreSQL, and SQLite.',
        keywords: ['sql formatter', 'pretty print sql', 'postgresql format', 'mysql sql', 'sqlite sql']
    },
    'diff-checker': {
        title: 'Text Diff Checker - Side-by-Side Compare',
        description: 'Compare two texts line by side with additions and removals highlighted. Runs entirely in your browser.',
        keywords: ['text diff', 'diff checker', 'side by side compare', 'line diff', 'text compare']
    }
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

    return {
        title: tool.title,
        description: tool.description,
        keywords: tool.keywords,
        openGraph: {
            title: tool.title,
            description: tool.description,
            url: `${baseUrl}/app/${toolSlug}`,
            siteName: 'MyDevTools',
            type: 'website',
            images: [
                {
                    url: `${baseUrl}/og-image.png`,
                    width: 1200,
                    height: 630,
                    alt: tool.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: tool.title,
            description: tool.description,
            images: [`${baseUrl}/og-image.png`],
            creator: '@mydevtools',
        },
        alternates: {
            canonical: `${baseUrl}/app/${toolSlug}`,
        },
    }
}

// Base site metadata
export const siteMetadata = {
    name: 'MyDevTools',
    title: 'MyDevTools - Essential Tools for Developers',
    description: 'Your Ultimate Developer Toolkit. Access free online tools including JSON editor, API client, password manager, and more. Boost productivity with client-side processing.',
    url: baseUrl,
    ogImage: `${baseUrl}/og-image.png`,
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
