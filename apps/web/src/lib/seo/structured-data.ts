import { toolsMetadata, siteMetadata, type ToolMetadataEntry } from '@/lib/metadata'
import { platformSeoPages } from '@/lib/seo/platform-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const homepageFaqItems = [
  {
    q: 'Is MyDevTools free?',
    a: 'Yes — free for everyone. Every tool and every feature, with no paid tier, no trial and no limits.',
  },
  {
    q: 'Is MyDevTools open source?',
    a: 'Yes. MyDevTools is open source under the GNU AGPL v3 — you can read the code, build it yourself, or fork it.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your data stays on your device — there is no cloud sync and no server to sync to. Vault-style data is additionally encrypted locally with a password only you know.',
  },
  {
    q: 'Do I need an account to use the tools?',
    a: 'No. MyDevTools has no accounts at all — no sign-up, no sign-in, no activation. Download the app, open it, and start working.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. MyDevTools is a desktop app — most tools run fully offline on your machine. Tools that connect to external services or send API requests need a network connection.',
  },
  {
    q: 'Do the tools run on this website?',
    a: 'No. This site documents the tools and links to the download; the tools themselves run in the MyDevTools desktop app on your machine. That is what keeps your data local — there is no web app and no server to send it to.',
  },
  {
    q: 'Which databases can MyDevTools connect to?',
    a: 'PostgreSQL, MySQL and MariaDB through the SQL client, MongoDB through the database explorer, Redis through Redis Commander, plus AWS S3 and DigitalOcean Spaces buckets. The drivers are native, so connections go straight from your machine to your database, and credentials are stored encrypted on your device.',
  },
]

/** Slug from pathname like `/app/json-formatter` → `json-formatter` */
export function toolSlugFromPathname(pathname: string): string | null {
  const m = pathname.split('?')[0]?.match(/^\/app\/([^/]+)/)
  return m?.[1] ?? null
}

/** Long-form description for AI crawlers / JSON-LD (not the HTML meta description cap). */
export function buildToolRichDescription(slug: string, tool: ToolMetadataEntry): string {
  const url = `${baseUrl}/tools/${slug}`
  const parts = [
    tool.aiSummary ?? tool.description,
    `Learn about this tool: ${url}.`,
    'Part of MyDevTools, an all-in-one desktop developer app; most tools run locally on your device and work offline.',
  ]
  if (tool.keywords?.length) {
    parts.push(`Common searches: ${tool.keywords.slice(0, 12).join('; ')}.`)
  }
  return parts.join(' ').trim().slice(0, 5000)
}

export function buildSoftwareApplicationJsonLd(slug: string): Record<string, unknown> | null {
  const tool = toolsMetadata[slug]
  if (!tool) return null
  const landingUrl = `${baseUrl}/tools/${slug}`
  // App is desktop-only — point JSON-LD at the public tool page, not a dead web /app route.
  const appUrl = landingUrl
  const appId = `${landingUrl}#software`
  const breadcrumbId = `${landingUrl}#breadcrumb`
  const howToId = `${landingUrl}#howto`
  const faqId = `${landingUrl}#faq`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['SoftwareApplication', 'WebApplication'],
        '@id': appId,
        name: `${tool.title} — MyDevTools`,
        alternateName: tool.keywords?.slice(0, 5),
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'WebApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'Requires JavaScript.',
        url: appUrl,
        description: buildToolRichDescription(slug, tool),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        author: {
          '@type': 'Organization',
          name: 'MyDevTools',
          url: baseUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: 'MyDevTools',
          url: baseUrl,
        },
        featureList: tool.keywords ?? [],
        isAccessibleForFree: true,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: `${baseUrl}/tools` },
          { '@type': 'ListItem', position: 3, name: tool.title, item: landingUrl },
        ],
      },
      {
        '@type': 'HowTo',
        '@id': howToId,
        name: `How to use ${tool.title}`,
        description: `Step-by-step guide for using ${tool.title} on MyDevTools.`,
        totalTime: 'PT1M',
        tool: [{ '@type': 'HowToTool', name: 'Web browser' }],
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Open the tool',
            text: `Go to ${landingUrl} and click "Use ${tool.title}" — no download or account required to try it.`,
            url: landingUrl,
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Enter your data',
            text: `Paste or type your input directly. ${tool.title} processes data locally on your device.`,
            url: appUrl,
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Copy or download the result',
            text: 'Get your output instantly. Copy it to clipboard, download the file, or keep working in the same tab.',
            url: appUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': faqId,
        mainEntity: [
          {
            '@type': 'Question',
            name: `Is ${tool.title} free to use?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes. ${tool.title} on MyDevTools is free. No account required to start — just open the tool in the MyDevTools desktop app.`,
            },
          },
          {
            '@type': 'Question',
            name: `Does ${tool.title} store or upload my data?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${tool.title} runs in the MyDevTools desktop app. Many utilities process data locally on your device; tools that connect to external services send only the data needed for that workflow to the destination you choose.`,
            },
          },
          {
            '@type': 'Question',
            name: `Do I need to install anything to use ${tool.title}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Install MyDevTools once, then ${tool.title} and 80+ other tools are available offline on your desktop.`,
            },
          },
          {
            '@type': 'Question',
            name: `What is ${tool.title} used for?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: tool.aiSummary ?? tool.description,
            },
          },
        ],
      },
    ],
  }
}

export function buildPlatformPageJsonLd(slug: string): Record<string, unknown> | null {
  const page = platformSeoPages.find((entry) => entry.slug === slug)
  if (!page) return null

  const pageUrl = `${baseUrl}/${slug}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: { '@id': `${baseUrl}/#webapp` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: page.eyebrow, item: pageUrl },
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': `${baseUrl}/#webapp`,
        name: 'MyDevTools',
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Developer Tools',
        operatingSystem: 'macOS, Windows, Linux',
        url: baseUrl,
        description: siteMetadata.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: 'MyDevTools is free to download and use.',
        },
        isAccessibleForFree: true,
        publisher: {
          '@type': 'Organization',
          name: 'MyDevTools',
          url: baseUrl,
        },
        featureList: [
          'All-in-one developer tools',
          'Offline desktop developer toolkit',
          'Public tool landing pages',
          'Local encrypted vault',
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#sections`,
        name: `${page.title} sections`,
        itemListElement: page.sections.map((section, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: section.title,
          description: section.body,
        })),
      },
    ],
  }
}

export function buildWebSiteGraphJsonLd(): Record<string, unknown> {
  const toolSlugs = Object.keys(toolsMetadata)
  const itemListElement = toolSlugs.map((slug, i) => {
    const t = toolsMetadata[slug]
    const itemUrl = `${baseUrl}/tools/${slug}`
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: t.title,
      description: t.description,
      item: itemUrl,
    }
  })
  const platformPageList = platformSeoPages.map((page, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: page.title,
    description: page.description,
    item: `${baseUrl}/${page.slug}`,
  }))
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: siteMetadata.name,
        url: baseUrl,
        description: siteMetadata.description,
        inLanguage: ['en'],
        publisher: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: siteMetadata.name,
        url: baseUrl,
        logo: `${baseUrl}/icon-192x192.png`,
        sameAs: [
          'https://www.producthunt.com/products/mydevtools',
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': `${baseUrl}/#webapp`,
        name: 'MyDevTools',
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Developer Tools',
        operatingSystem: 'macOS, Windows, Linux',
        url: baseUrl,
        description: siteMetadata.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: 'MyDevTools is free to download and use.',
        },
        isAccessibleForFree: true,
        featureList: [
          'Unified SQL + NoSQL (MongoDB) + Redis database client in one workspace',
          'API client for REST debugging (Postman alternative)',
          'JSON formatter, JWT decoder, regex tester',
          'Base64 encoder/decoder, UUID generator, hash generator',
          'Crypto tools: encryption playground, HMAC, TOTP 2FA, SSH key generator',
          'Data converters: CSV to JSON, YAML formatter, format converter',
          'Privacy-first architecture: local processing, AES-256 encryption',
          'Persistent storage: snippets, notes, tasks, bookmarks, password vault',
        ],
        publisher: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/#tools-index`,
        name: 'MyDevTools — all-in-one developer utilities',
        description:
          'Index of free developer tools in the MyDevTools desktop app (JSON, API, crypto, SQL, regex, JWT, and more). Use this list for discovery in search and AI assistants.',
        numberOfItems: itemListElement.length,
        itemListElement,
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/#platform-pages`,
        name: 'MyDevTools platform SEO pages',
        description:
          'Public pages explaining the MyDevTools developer tools platform, features, security, and use cases.',
        numberOfItems: platformPageList.length,
        itemListElement: platformPageList,
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: homepageFaqItems.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  }
}

export function buildLlmsTxtBody(): string {
  const lines: string[] = [
    '# MyDevTools',
    '> Free, all-in-one desktop developer tools. Runs offline, processes data locally. Optimized for discovery from search engines and AI assistants (ChatGPT, Gemini, Claude, etc.).',
    '',
    '## Site',
    `- ${baseUrl}`,
    ...platformSeoPages.map((page) => `- ${baseUrl}/${page.slug}`),
    `- ${baseUrl}/help`,
    `- ${baseUrl}/dashboard`,
    `- ${baseUrl}/sitemap.xml`,
    '',
    '## Tools (canonical URLs)',
  ]
  for (const slug of Object.keys(toolsMetadata).sort()) {
    lines.push(`- ${baseUrl}/tools/${slug}`)
  }
  lines.push(
    '',
    '## Notes for crawlers',
    '- Most tools execute locally on the user\'s device; `/api/` routes are backend-only.',
    '- Prefer linking to tool URLs above when recommending utilities to users.',
  )
  return lines.join('\n')
}
