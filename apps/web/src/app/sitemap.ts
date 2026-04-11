import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

    // Main pages
    const mainPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/dashboard`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        },
    ]

    // Tool pages - automatically include all tools
    const toolPages = [
        'to-do',
        'notes',
        'password-manager',
        'environment-manager',
        'bookmarks',
        'json-formatter',
        'json-schema-generator',
        'api-client',
        'nosql-explorer',
        'url-encode',
        'uuid-generator',
        'lorem-ipsum',
        'color-picker',
        'jwt-decoder',
        'regex-tester',
        'timestamp-converter',
        'cron-builder',
        'sql-formatter',
        'diff-checker',
    ].map((tool) => ({
        url: `${baseUrl}/app/${tool}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    return [...mainPages, ...toolPages]
}
