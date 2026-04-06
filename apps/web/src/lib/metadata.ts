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
