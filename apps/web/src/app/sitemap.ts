import { MetadataRoute } from 'next'
import { toolsMetadata } from '@/lib/metadata'

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

    const toolSlugs = Object.keys(toolsMetadata).sort()
    const toolPages = toolSlugs.map((tool) => ({
        url: `${baseUrl}/app/${tool}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.75,
    }))

    return [...mainPages, ...toolPages]
}
