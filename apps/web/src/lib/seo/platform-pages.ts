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
    title: 'All-in-One Developer Tools Platform',
    description:
      'MyDevTools is an all-in-one desktop developer platform with 80+ tools for formatting, testing APIs, generating data, managing secrets, and shipping faster — offline and local-first.',
    keywords: [
      'all-in-one developer tools',
      'desktop developer tools',
      'developer toolkit',
      'offline developer tools',
      'local-first developer tools',
    ],
    eyebrow: 'Developer Tools Platform',
    heading: 'One all-in-one developer toolkit for everyday engineering work',
    intro:
      'MyDevTools brings the utilities developers reach for every day into one desktop workspace that runs offline: format data, test APIs, generate tokens, inspect encodings, manage secure notes, and stay in flow — with everything processed locally.',
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
          'Keep every utility available offline on your machine — no network required.',
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
      'Explore MyDevTools features: unified dashboard, command palette, team workspaces with role-based access, offline desktop tools, secure sync, and managed cloud hosting.',
    keywords: [
      'developer toolkit features',
      'desktop developer tools features',
      'offline developer dashboard',
      'developer tools command palette',
      'team workspaces developer tools',
      'role based access developer tools',
    ],
    eyebrow: 'Features',
    heading: 'Features built for fast, private developer workflows',
    intro:
      'MyDevTools combines small daily utilities with a dashboard, search, privacy controls, and cloud sync in one desktop app — so developers stop juggling a dozen scattered websites and single-purpose apps.',
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
        title: 'Offline, local-first utilities',
        body:
          'Most tools run locally on your machine and work fully offline, which keeps common formatting and generation work instant.',
        bullets: [
          'Every utility ships in one desktop app — no chasing a dozen websites.',
          'Works offline on a plane, behind a locked-down network, or air-gapped.',
          'Local-first processing for formatter, parser, and generator workflows.',
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
      'Learn how MyDevTools handles security, client-side encryption, zero-knowledge vault data, local on-device processing, account sync, and encrypted data handling.',
    keywords: [
      'developer tools security',
      'zero knowledge developer tools',
      'encrypted developer toolkit',
      'secure offline developer tools',
    ],
    eyebrow: 'Security',
    heading: 'Security and privacy for a local-first developer toolkit',
    intro:
      'MyDevTools is built around a simple principle: keep local work local where possible, and encrypt sensitive synced data before it leaves your device.',
    primaryCta: { href: '/help', label: 'Read help docs' },
    secondaryCta: { href: '/features', label: 'Explore features' },
    sections: [
      {
        title: 'What runs locally',
        body:
          'Formatter, parser, converter, and generator workflows are designed to run directly on your device whenever the tool does not need a network service.',
        bullets: [
          'JSON formatting, Base64 encoding, UUID generation, and similar operations avoid server round-trips.',
          'Tools that connect to external services, such as API or database clients, necessarily send requests to the targets you choose.',
          'The help docs explain tool-specific data behavior for sensitive workflows.',
        ],
      },
      {
        title: 'Encrypted sync',
        body:
          'Sensitive persisted data such as vault-style records is encrypted on your device before sync.',
        bullets: [
          'The server stores ciphertext and metadata required for sync, not readable vault plaintext.',
          'Your master password is not transmitted for vault unlock flows.',
          'Encryption keys derive from your master password, which the server never receives.',
        ],
      },
      {
        title: 'Honest limits',
        body:
          'Security depends on your device, the deployment, and the external services you choose to connect.',
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
      'desktop developer toolkit pricing',
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
      'See how frontend developers, backend developers, DevOps engineers, students, and teams use MyDevTools as an all-in-one desktop developer toolkit.',
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
      'MyDevTools supports everyday workflows across frontend, backend, DevOps, security, data, and learning use cases in one desktop toolbox instead of a dozen scattered websites.',
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
