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
          'Organize work into per-project workspaces, all stored locally on your device.',
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
      'Explore MyDevTools features: unified dashboard, command palette, per-project workspaces, offline desktop tools, and a local encrypted vault for sensitive data.',
    keywords: [
      'developer toolkit features',
      'desktop developer tools features',
      'offline developer dashboard',
      'developer tools command palette',
      'local first developer tools',
      'private developer tools',
    ],
    eyebrow: 'Features',
    heading: 'Features built for fast, private developer workflows',
    intro:
      'MyDevTools combines small daily utilities with a dashboard, search, and privacy controls in one offline desktop app — so developers stop juggling a dozen scattered websites and single-purpose apps.',
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
        title: 'Per-project workspaces',
        body:
          'Keep each project in its own workspace — separate tools, notes, snippets, and vaults — and switch between them in a click. Everything stays local on your device.',
        bullets: [
          'Bookmarks, notes, snippets, and connections are scoped per workspace.',
          'Switch between personal and project context instantly.',
          'Shared team workspaces and collaboration are on the roadmap.',
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
        title: 'Private by default',
        body:
          'Local-first tools process your data on your machine, and sensitive records live in a local encrypted vault.',
        bullets: [
          'Formatters, parsers, and generators run on-device with no server round-trip.',
          'Secrets and credentials are AES-256 encrypted in a local vault.',
          'Tools that reach a network only contact the destinations you choose.',
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security and Privacy',
    description:
      'Learn how MyDevTools handles security: local on-device processing, a local encrypted vault, and clear boundaries for tools that reach the destinations you choose.',
    keywords: [
      'developer tools security',
      'zero knowledge developer tools',
      'encrypted developer toolkit',
      'secure offline developer tools',
    ],
    eyebrow: 'Security',
    heading: 'Security and privacy for a local-first developer toolkit',
    intro:
      'MyDevTools is built around a simple principle: your work stays local. Everything runs offline on your device, there is no account and no server to hold anything, and sensitive data is encrypted in a local vault. The source is open under the GNU AGPL v3, so none of this has to be taken on trust.',
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
        title: 'Local encrypted vault',
        body:
          'Sensitive persisted data such as vault-style records is encrypted at rest on your device.',
        bullets: [
          'Vault contents are AES-256 encrypted on your machine, not stored on a server.',
          'Your master password is never transmitted and never leaves your device.',
          'Encryption keys derive from your master password, which nothing else receives.',
        ],
      },
      {
        title: 'No account, and open source',
        body:
          'There is nothing to sign up for and nothing to sign in to, so there is no account data to leak, and the code that makes those claims is public.',
        bullets: [
          'No sign-up, no sign-in, no activation and no license key — the app has no user accounts at all.',
          'The app ships with no backend: there is no server for your data to reach even by mistake.',
          'The source is released under the GNU AGPL v3, so you can audit the encryption and network behavior yourself, or build it from source.',
        ],
      },
      {
        title: 'Honest limits',
        body:
          'Security depends on your device and the external services you choose to connect.',
        bullets: [
          'Do not paste highly sensitive production secrets into tools you do not control.',
          'API and database tools send requests to the destinations you point them at.',
          'Review our security model and data handling before team-wide adoption.',
        ],
      },
    ],
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
          'Keep each project in its own local workspace with separate tools, notes, and secrets.',
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
