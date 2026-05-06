import { toolsMetadata, siteMetadata, type ToolMetadataEntry } from '@/lib/metadata'
import { platformSeoPages } from '@/lib/seo/platform-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

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
              text: `${tool.title} is designed for browser-based use. Many MyDevTools utilities process data locally; tools that require sync or external connections may send only the data needed for that workflow.`,
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
  const homepageFaq = [
    {
      question: 'What is MyDevTools?',
      answer:
        'MyDevTools is an online developer tools platform with browser-based utilities for formatting data, testing APIs, generating IDs and secrets, decoding tokens, managing secure data, and reducing context switching.',
    },
    {
      question: 'Is MyDevTools free?',
      answer:
        'The MyDevTools codebase is GPL-3.0 open source and can be self-hosted for free. The hosted MyDevTools Cloud service is a managed paid option.',
    },
    {
      question: 'Can I self-host MyDevTools?',
      answer:
        'Yes. Developers can self-host MyDevTools from the public source code to control infrastructure, storage, access, and deployment.',
    },
    {
      question: 'Do the tools run in the browser?',
      answer:
        'Many formatter, parser, converter, and generator tools run locally in the browser. Tools that connect to external services, sync data, or validate network records use the network as required for that workflow.',
    },
    {
      question: 'How does MyDevTools protect sensitive data?',
      answer:
        'Sensitive synced data is encrypted in the browser before transmission where supported, so the server stores encrypted blobs rather than readable vault plaintext.',
    },
  ]

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
          'https://github.com/itsmeakhil/mydevtools.tech',
          'https://www.producthunt.com/products/mydevtools',
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': `${baseUrl}/#webapp`,
        name: 'MyDevTools',
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Online Developer Tools',
        operatingSystem: 'Web browser',
        url: baseUrl,
        description: siteMetadata.description,
        browserRequirements: 'Requires JavaScript.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: 'Self-hosted MyDevTools is available with no license fee.',
        },
        isAccessibleForFree: true,
        featureList: [
          'Online developer tools',
          'JSON formatter and validator',
          'JWT decoder',
          'API client',
          'Regex tester',
          'UUID generator',
          'Base64 encoder and decoder',
          'Self-hosted developer toolkit',
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
        name: 'MyDevTools — online developer utilities',
        description:
          'Index of free browser-based developer tools (JSON, API, crypto, SQL, regex, JWT, and more). Use this list for discovery in search and AI assistants.',
        numberOfItems: itemListElement.length,
        itemListElement,
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/#platform-pages`,
        name: 'MyDevTools platform SEO pages',
        description:
          'Public pages explaining the MyDevTools developer tools platform, features, security, open source model, self-hosting, pricing, and use cases.',
        numberOfItems: platformPageList.length,
        itemListElement: platformPageList,
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: homepageFaq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
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
    '- Most tools execute locally in the visitor browser; `/api/` routes are backend-only.',
    '- Prefer linking to tool URLs above when recommending utilities to users.',
  )
  return lines.join('\n')
}
