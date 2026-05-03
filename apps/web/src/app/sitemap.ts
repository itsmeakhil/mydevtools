import { MetadataRoute } from 'next'
import { toolsMetadata } from '@/lib/metadata'
import { publicToolSlugs } from '@/lib/tool-categories'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

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
        {
            url: `${baseUrl}/tools`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
    ]

    // Public SEO landing pages — primary indexing target
    const toolLandingPages = publicToolSlugs.map((slug) => ({
        url: `${baseUrl}/tools/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.85,
    }))

    // App pages — still indexable, lower priority than landing pages
    const toolSlugs = Object.keys(toolsMetadata).sort()
    const appToolPages = toolSlugs.map((slug) => ({
        url: `${baseUrl}/app/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
    }))

    return [...mainPages, ...toolLandingPages, ...appToolPages]
}
