import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

    return {
        rules: [
            // All crawlers: allow everything except private API routes
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // OpenAI — ChatGPT web search and browsing
            {
                userAgent: 'GPTBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                userAgent: 'OAI-SearchBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                userAgent: 'ChatGPT-User',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // Anthropic — Claude web features
            {
                userAgent: 'ClaudeBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            {
                userAgent: 'anthropic-ai',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // Perplexity AI search
            {
                userAgent: 'PerplexityBot',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // Google — AI Overviews and Gemini
            {
                userAgent: 'Google-Extended',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // Cohere AI
            {
                userAgent: 'cohere-ai',
                allow: '/',
                disallow: ['/api/', '/private/'],
            },
            // Block Common Crawl (training data scraper) while allowing search AI bots
            {
                userAgent: 'CCBot',
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    }
}
