import { MetadataRoute } from 'next'
import { publicToolSlugs } from '@/lib/tool-categories'
import { platformSeoPageSlugs } from '@/lib/seo/platform-pages'
import { comparisonPageSlugs } from '@/lib/seo/comparison-pages'

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
        {
            url: `${baseUrl}/help`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        },
    ]

    const platformPages = platformSeoPageSlugs.map((slug) => ({
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: slug === 'developer-tools' ? 0.92 : 0.82,
    }))

    const comparisonPages = comparisonPageSlugs.map((slug) => ({
        url: `${baseUrl}/compare/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.78,
    }))

    // Public SEO landing pages — primary indexing target
    const toolLandingPages = publicToolSlugs.map((slug) => ({
        url: `${baseUrl}/tools/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.85,
    }))

    // /app/* pages require authentication — excluded to preserve crawl budget
    return [...mainPages, ...platformPages, ...comparisonPages, ...toolLandingPages]
}
