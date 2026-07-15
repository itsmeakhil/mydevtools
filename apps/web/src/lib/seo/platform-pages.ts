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
          'Sync your work across devices with an account when you want continuity.',
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
      'Explore MyDevTools features: unified dashboard, command palette, team workspaces with role-based access, browser-based tools, secure sync, and managed cloud hosting.',
    keywords: [
      'developer toolkit features',
      'browser developer tools features',
      'online developer dashboard',
      'developer tools command palette',
      'team workspaces developer tools',
      'role based access developer tools',
    ],
    eyebrow: 'Features',
    heading: 'Features built for fast, private developer workflows',
    intro:
      'MyDevTools combines small daily utilities with a dashboard, search, privacy controls, and cloud sync so developers can work without installing another desktop app.',
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
        title: 'Team workspaces with roles',
        body:
          'Create organizations and shared workspaces, invite teammates, and give each person the right level of access — no more pasting secrets over chat.',
        bullets: [
          'Organizations group your workspaces; switch between personal and team context in one click.',
          'Four roles — owner, admin, developer, viewer — control who can manage members and which tools each role can use.',
          'Bookmarks, notes, snippets, and connections are scoped per workspace, so team data stays with the team.',
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
        title: 'Cloud that scales with you',
        body:
          'Start free, then upgrade when you need unlimited usage and team features.',
        bullets: [
          'Free tier with capped usage — no card required to start.',
          'Pro unlocks unlimited usage, cross-device sync, and private history.',
          'Team plans add shared workspaces, roles, and centralized billing.',
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security and Privacy',
    description:
      'Learn how MyDevTools handles security, client-side encryption, zero-knowledge vault data, local browser processing, account sync, and encrypted data handling.',
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
    secondaryCta: { href: '/features', label: 'Explore features' },
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
          'Encryption keys derive from your master password, which the server never receives.',
        ],
      },
      {
        title: 'Honest limits',
        body:
          'Security depends on the browser, the deployment, and the external services you choose to connect.',
        bullets: [
          'Do not paste highly sensitive production secrets into tools you do not control.',
          'Sensitive vault data is encrypted client-side before it syncs to our cloud.',
          'Review our security model and data handling before team-wide adoption.',
        ],
      },
    ],
  },
  {
    slug: 'pricing',
    title: 'Pricing',
    description:
      'Compare MyDevTools Free, Pro, Team, and Enterprise plans. Start free, then upgrade for unlimited cloud usage and team features.',
    keywords: [
      'mydevtools pricing',
      'developer tools pricing',
      'developer tools subscription pricing',
      'online developer toolkit pricing',
    ],
    eyebrow: 'Pricing',
    heading: 'Start free. Upgrade when you want more.',
    intro:
      'MyDevTools gives you a free tier to start, with paid plans that unlock unlimited cloud usage, sync, and team features.',
    primaryCta: { href: '/login', label: 'Start with cloud' },
    secondaryCta: { href: '/features', label: 'See features' },
    sections: [],
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
          'Share team workspaces with role-based access for internal workflows or classrooms.',
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
