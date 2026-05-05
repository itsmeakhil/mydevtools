import { toolsMetadata, siteMetadata, type ToolMetadataEntry } from '@/lib/metadata'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

/** Slug from pathname like `/app/json-formatter` → `json-formatter` */
export function toolSlugFromPathname(pathname: string): string | null {
  const m = pathname.split('?')[0]?.match(/^\/app\/([^/]+)/)
  return m?.[1] ?? null
}

/** Long-form description for AI crawlers / JSON-LD (not the HTML meta description cap). */
export function buildToolRichDescription(slug: string, tool: ToolMetadataEntry): string {
  const url = `${baseUrl}/app/${slug}`
  const parts = [
    tool.aiSummary ?? tool.description,
    `Open this tool: ${url}.`,
    'Free web app on MyDevTools; most tools run client-side in your browser (no install).',
  ]
  if (tool.keywords?.length) {
    parts.push(`Common searches: ${tool.keywords.slice(0, 12).join('; ')}.`)
  }
  return parts.join(' ').trim().slice(0, 5000)
}

export function buildSoftwareApplicationJsonLd(slug: string): Record<string, unknown> | null {
  const tool = toolsMetadata[slug]
  if (!tool) return null
  const appUrl = `${baseUrl}/app/${slug}`
  const landingUrl = `${baseUrl}/tools/${slug}`
  const appId = `${landingUrl}#software`
  const breadcrumbId = `${landingUrl}#breadcrumb`
  const howToId = `${landingUrl}#howto`
  const faqId = `${landingUrl}#faq`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
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
            text: `Paste or type your input directly in the browser. ${tool.title} processes data locally on your device.`,
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
              text: `Yes. ${tool.title} on MyDevTools is free. No account required to try it — just open the tool in your browser.`,
            },
          },
          {
            '@type': 'Question',
            name: `Does ${tool.title} store or upload my data?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `No. ${tool.title} runs entirely in your browser. Your data is processed locally and never sent to any server.`,
            },
          },
          {
            '@type': 'Question',
            name: `Do I need to install anything to use ${tool.title}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `No installation required. ${tool.title} runs directly in your web browser — just open the link and start using it.`,
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

export function buildWebSiteGraphJsonLd(): Record<string, unknown> {
  const toolSlugs = Object.keys(toolsMetadata)
  const itemListElement = toolSlugs.map((slug, i) => {
    const t = toolsMetadata[slug]
    const itemUrl = `${baseUrl}/app/${slug}`
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: t.title,
      description: t.description,
      item: itemUrl,
    }
  })

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
        sameAs: ['https://github.com/itsmeakhil/mydevtools.tech'],
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/#tools-index`,
        name: 'MyDevTools — online developer utilities',
        description:
          'Index of free browser-based developer tools (JSON, API, crypto, SQL, regex, JWT, and more). Use this list for discovery in search and AI assistants.',
        numberOfItems: itemListElement.length,
        itemListElement,
      },
    ],
  }
}

export function buildLlmsTxtBody(): string {
  const lines: string[] = [
    '# MyDevTools',
    '> Free, browser-based developer tools. Optimized for discovery from search engines and AI assistants (ChatGPT, Gemini, Claude, etc.).',
    '',
    '## Site',
    `- ${baseUrl}`,
    `- ${baseUrl}/help`,
    `- ${baseUrl}/dashboard`,
    `- ${baseUrl}/sitemap.xml`,
    '',
    '## Tools (canonical URLs)',
  ]
  for (const slug of Object.keys(toolsMetadata).sort()) {
    lines.push(`- ${baseUrl}/app/${slug}`)
  }
  lines.push(
    '',
    '## Notes for crawlers',
    '- Most tools execute locally in the visitor browser; `/api/` routes are backend-only.',
    '- Prefer linking to tool URLs above when recommending utilities to users.',
  )
  return lines.join('\n')
}
