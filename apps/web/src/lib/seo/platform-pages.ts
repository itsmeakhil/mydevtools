export type PlatformSeoPage = {
  slug: string
  title: string
  description: string
  keywords: string[]
  eyebrow: string
  heading: string
  intro: string
  primaryCta?: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
  sections: Array<{
    title: string
    body: string
    bullets: string[]
  }>
}

export const platformSeoPages: PlatformSeoPage[] = [
  {
    slug: 'developer-tools',
    title: 'Online Developer Tools Platform',
    description:
      'MyDevTools is an online developer tools platform with 50+ browser-based utilities for formatting, testing APIs, generating data, managing secrets, and shipping faster.',
    keywords: [
      'online developer tools',
      'developer tools online',
      'developer toolkit',
      'browser developer tools',
      'web developer tools',
    ],
    eyebrow: 'Developer Tools Platform',
    heading: 'One online developer toolkit for everyday engineering work',
    intro:
      'MyDevTools brings the utilities developers reach for every day into one browser-based workspace: format data, test APIs, generate tokens, inspect encodings, manage secure notes, and stay in flow.',
    primaryCta: { href: '/tools', label: 'Browse all tools' },
    secondaryCta: { href: '/login', label: 'Open dashboard' },
    sections: [
      {
        title: 'Built for search-worthy developer workflows',
        body:
          'The platform is organized around real engineering jobs instead of disconnected one-off utilities.',
        bullets: [
          'Formatters and validators for JSON, SQL, GraphQL, Markdown, CSV, and more.',
          'Network and API utilities including an API client, HTTP status reference, MIME lookup, and IP subnet calculator.',
          'Generators for UUIDs, API keys, QR codes, mock data, cron expressions, and Docker Compose files.',
        ],
      },
      {
        title: 'Why use a unified toolkit',
        body:
          'A single toolkit reduces the switching cost of jumping between browser tabs, npm packages, desktop apps, and random pastebin-style websites.',
        bullets: [
          'Use related tools from one dashboard and command palette.',
          'Keep common developer utilities available on any machine with a browser.',
          'Self-host the same open-source codebase when you want complete infrastructure control.',
        ],
      },
      {
        title: 'Designed for public discovery',
        body:
          'Public tool landing pages explain what each utility does before sending users into the app experience.',
        bullets: [
          'Canonical public pages live under /tools for indexing and sharing.',
          'Auth-gated app pages stay out of the sitemap to preserve crawl budget.',
          'Structured data and llms.txt help search engines and AI assistants understand the toolkit.',
        ],
      },
    ],
  },
  {
    slug: 'features',
    title: 'Developer Toolkit Features',
    description:
      'Explore MyDevTools features: unified dashboard, command palette, favorites, browser-based tools, secure sync, self-hosting, and managed cloud hosting.',
    keywords: [
      'developer toolkit features',
      'browser developer tools features',
      'online developer dashboard',
      'developer tools command palette',
    ],
    eyebrow: 'Features',
    heading: 'Features built for fast, private developer workflows',
    intro:
      'MyDevTools combines small daily utilities with a dashboard, search, privacy controls, and self-hosting options so developers can work without installing another desktop app.',
    primaryCta: { href: '/tools', label: 'See tools' },
    secondaryCta: { href: '/security', label: 'Review security' },
    sections: [
      {
        title: 'Unified dashboard',
        body:
          'Launch formatters, API tools, database helpers, generators, and productivity utilities from one place.',
        bullets: [
          'Search tools quickly with a command palette.',
          'Group everyday utilities into one dashboard instead of scattered bookmarks.',
          'Use public tool pages for discovery, then open the full app when ready.',
        ],
      },
      {
        title: 'Browser-based utilities',
        body:
          'Many tools run locally in the browser, which keeps common formatting and generation work fast.',
        bullets: [
          'No desktop installer for common utilities.',
          'Immediate access from shared, temporary, or new machines.',
          'Local-first processing for many formatter, parser, and generator workflows.',
        ],
      },
      {
        title: 'Open source and cloud options',
        body:
          'Choose the deployment model that matches your team: self-host the codebase or use the managed cloud.',
        bullets: [
          'GPL-3.0 source code is available for audit and contribution.',
          'Self-hosting gives you control over data and infrastructure.',
          'Cloud hosting removes deployment work while keeping sensitive sync encrypted.',
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security and Privacy',
    description:
      'Learn how MyDevTools handles security, client-side encryption, zero-knowledge vault data, local browser processing, account sync, and self-hosted control.',
    keywords: [
      'developer tools security',
      'zero knowledge developer tools',
      'encrypted developer toolkit',
      'secure online developer tools',
    ],
    eyebrow: 'Security',
    heading: 'Security and privacy for browser-based developer tools',
    intro:
      'MyDevTools is built around a simple principle: keep local work local where possible, and encrypt sensitive synced data before it leaves the browser.',
    primaryCta: { href: '/help', label: 'Read help docs' },
    secondaryCta: { href: '/open-source', label: 'Audit the code' },
    sections: [
      {
        title: 'What runs locally',
        body:
          'Formatter, parser, converter, and generator workflows are designed to run directly in the browser whenever the tool does not need a network service.',
        bullets: [
          'JSON formatting, Base64 encoding, UUID generation, and similar operations avoid server round-trips.',
          'Tools that connect to external services, such as API or database clients, necessarily send requests to the targets you choose.',
          'The help docs explain tool-specific data behavior for sensitive workflows.',
        ],
      },
      {
        title: 'Encrypted sync',
        body:
          'Sensitive persisted data such as vault-style records is encrypted in the browser before sync.',
        bullets: [
          'The server stores ciphertext and metadata required for sync, not readable vault plaintext.',
          'Your master password is not transmitted for vault unlock flows.',
          'Self-hosting lets you control the backend and storage environment.',
        ],
      },
      {
        title: 'Honest limits',
        body:
          'Security depends on the browser, the deployment, and the external services you choose to connect.',
        bullets: [
          'Do not paste highly sensitive production secrets into tools you do not control.',
          'Use self-hosting for regulated, internal, or highly sensitive workflows.',
          'Review the open-source code and deployment configuration before team-wide adoption.',
        ],
      },
    ],
  },
  {
    slug: 'open-source',
    title: 'Open Source Developer Tools',
    description:
      'MyDevTools is a GPL-3.0 open-source developer tools platform. Audit the code, contribute features, fork it, or self-host your own developer toolkit.',
    keywords: [
      'open source developer tools',
      'open source developer toolkit',
      'self hosted open source developer tools',
      'GPL developer tools',
    ],
    eyebrow: 'Open Source',
    heading: 'Open-source developer tools you can audit and self-host',
    intro:
      'MyDevTools is built in public so developers can inspect the implementation, contribute improvements, and run the toolkit on their own infrastructure.',
    primaryCta: {
      href: 'https://github.com/itsmeakhil/mydevtools.tech',
      label: 'View GitHub',
    },
    secondaryCta: { href: '/self-host', label: 'Self-host guide' },
    sections: [
      {
        title: 'GPL-3.0 codebase',
        body:
          'The source is available for developers who want transparency and control instead of a black-box utility site.',
        bullets: [
          'Audit how tools process data and how sensitive sync is implemented.',
          'Fork the project for private or internal workflows.',
          'Contribute bug fixes, new tools, documentation, and quality improvements.',
        ],
      },
      {
        title: 'Why open source matters for dev tools',
        body:
          'Developer utilities often touch source code, payloads, credentials, requests, and generated data.',
        bullets: [
          'Readable source builds trust for privacy-sensitive tools.',
          'Self-hosting avoids vendor lock-in for teams with strict policies.',
          'Community review improves reliability over time.',
        ],
      },
      {
        title: 'Cloud without losing transparency',
        body:
          'The hosted service runs the same product direction while preserving an open-source foundation.',
        bullets: [
          'Use managed cloud when convenience matters.',
          'Use self-hosting when infrastructure control matters.',
          'Move between models without adopting a separate proprietary toolkit.',
        ],
      },
    ],
  },
  {
    slug: 'self-host',
    title: 'Self-Hosted Developer Tools',
    description:
      'Self-host MyDevTools for a private online developer toolkit with 50+ tools, open-source code, browser-based workflows, and control over your infrastructure.',
    keywords: [
      'self hosted developer tools',
      'self hosted dev toolkit',
      'self hosted online developer tools',
      'private developer toolkit',
    ],
    eyebrow: 'Self-Host',
    heading: 'Self-host your own online developer toolkit',
    intro:
      'Run MyDevTools on infrastructure you control when you want a private developer tools hub for personal use, internal teams, labs, or security-sensitive workflows.',
    primaryCta: {
      href: 'https://github.com/itsmeakhil/mydevtools.tech',
      label: 'Get source code',
    },
    secondaryCta: { href: '/security', label: 'Review security model' },
    sections: [
      {
        title: 'When self-hosting makes sense',
        body:
          'Self-hosting is best when your team has internal workflows, strict data policies, or a preference for owning infrastructure.',
        bullets: [
          'Keep the web app and backend inside your chosen environment.',
          'Control deployment, access, logs, data storage, and network boundaries.',
          'Avoid relying on a public hosted utility site for sensitive developer work.',
        ],
      },
      {
        title: 'What you get',
        body:
          'Self-hosted MyDevTools uses the same product surface: tool directory, dashboard, secure workflows, and developer utilities.',
        bullets: [
          'Access the full GPL-3.0 codebase.',
          'Use all included tools without a license fee from MyDevTools.',
          'Customize deployment and operations for your own environment.',
        ],
      },
      {
        title: 'When cloud is better',
        body:
          'Managed cloud is better when you want the product without owning deployment and maintenance.',
        bullets: [
          'Use cloud for quick personal access and hosted sync.',
          'Use self-hosting for private infrastructure or compliance needs.',
          'Both options keep the same platform story instead of separate products.',
        ],
      },
    ],
  },
  {
    slug: 'pricing',
    title: 'Pricing',
    description:
      'Compare MyDevTools self-hosted and cloud options. Self-host the open-source developer toolkit for free or use managed cloud hosting for convenience.',
    keywords: [
      'mydevtools pricing',
      'developer tools pricing',
      'self hosted developer tools pricing',
      'online developer toolkit pricing',
    ],
    eyebrow: 'Pricing',
    heading: 'Self-host free. Use cloud when you want managed convenience.',
    intro:
      'MyDevTools keeps the open-source toolkit self-hostable while offering a managed cloud path for developers who prefer not to run infrastructure.',
    primaryCta: { href: '/login', label: 'Start with cloud' },
    secondaryCta: {
      href: 'https://github.com/itsmeakhil/mydevtools.tech',
      label: 'Self-host for free',
    },
    sections: [
      {
        title: 'Self-hosted',
        body:
          'Use the GPL-3.0 source code on your own infrastructure with no license fee from MyDevTools.',
        bullets: [
          '$0 license fee from MyDevTools.',
          'All included tools and features remain available.',
          'You own hosting, operations, backups, and access controls.',
        ],
      },
      {
        title: 'MyDevTools Cloud',
        body:
          'Managed hosting for developers who want the toolkit available without deployment work.',
        bullets: [
          'Hosted dashboard and account sync.',
          'Secure sync for sensitive data using browser-side encryption where supported.',
          'Subscription details will be shown clearly before paid billing is required.',
        ],
      },
      {
        title: 'Premium add-ons',
        body:
          'Future paid capabilities will focus on power-user and team workflows without removing the core self-hosted toolkit.',
        bullets: [
          'Advanced workflows for heavy users.',
          'Team-oriented collaboration features.',
          'The open-source self-hosted path remains a first-class option.',
        ],
      },
    ],
  },
  {
    slug: 'use-cases',
    title: 'Developer Tool Use Cases',
    description:
      'See how frontend developers, backend developers, DevOps engineers, students, and teams use MyDevTools as an online developer toolkit.',
    keywords: [
      'developer tool use cases',
      'tools for frontend developers',
      'tools for backend developers',
      'devops developer tools',
      'developer toolkit for students',
    ],
    eyebrow: 'Use Cases',
    heading: 'How different developers use MyDevTools',
    intro:
      'MyDevTools supports everyday workflows across frontend, backend, DevOps, security, data, and learning use cases without requiring a local desktop toolbox.',
    primaryCta: { href: '/tools', label: 'Browse by tool' },
    secondaryCta: { href: '/developer-tools', label: 'View platform' },
    sections: [
      {
        title: 'Frontend developers',
        body:
          'Quickly format payloads, inspect URLs, test colors, check contrast, preview Markdown, and generate assets.',
        bullets: [
          'Use JSON, URL, Base64, color, SVG, and image utilities from one place.',
          'Validate API payloads while building UI integrations.',
          'Keep small design and data tasks out of heavyweight desktop tools.',
        ],
      },
      {
        title: 'Backend and API developers',
        body:
          'Test HTTP requests, generate IDs and tokens, inspect encodings, parse timestamps, and manage API-related data.',
        bullets: [
          'Use the API client, UUID generator, cron builder, JWT decoder, and hash tools.',
          'Create mock data and compare payload changes.',
          'Keep references like HTTP status codes and MIME types close to the workflow.',
        ],
      },
      {
        title: 'DevOps, students, and teams',
        body:
          'Use MyDevTools for repeatable operational checks, secure workflow notes, and learning-friendly utilities.',
        bullets: [
          'Generate Docker Compose starters, secrets, and environment helpers.',
          'Self-host for internal team workflows or classrooms.',
          'Use one searchable toolkit instead of a long list of single-purpose websites.',
        ],
      },
    ],
  },
]

export const platformSeoPageSlugs = platformSeoPages.map((page) => page.slug)

export function getPlatformSeoPage(slug: string): PlatformSeoPage | undefined {
  return platformSeoPages.find((page) => page.slug === slug)
}
