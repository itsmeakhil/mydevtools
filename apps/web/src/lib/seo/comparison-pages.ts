export type ComparisonPage = {
  slug: string
  title: string
  description: string
  eyebrow: string
  heading: string
  intro: string
  competitor?: string
  toolSlug?: string
  primaryCta: { href: string; label: string }
  sections: Array<{
    title: string
    body: string
    bullets: string[]
  }>
  faqs: Array<{ q: string; a: string }>
}

export const comparisonPages: ComparisonPage[] = [
  {
    slug: 'best-online-developer-tools',
    title: 'Best Online Developer Tools',
    description:
      'Compare MyDevTools with single-purpose online developer tools and see why a unified, open-source developer toolkit is better for everyday engineering workflows.',
    eyebrow: 'Best Developer Tools',
    heading: 'Best online developer tools for fast browser-based workflows',
    intro:
      'Most developers collect dozens of single-purpose formatter, decoder, generator, and API testing websites. MyDevTools brings those daily utilities into one searchable toolkit with public tool pages, an app dashboard, and a self-hostable open-source codebase.',
    primaryCta: { href: '/tools', label: 'Browse MyDevTools' },
    sections: [
      {
        title: 'Why a toolkit beats a bookmark folder',
        body:
          'Single-purpose sites are useful, but they create tab sprawl and inconsistent privacy expectations. A unified toolkit gives developers one place to start.',
        bullets: [
          'Use JSON, JWT, regex, UUID, Base64, API, hashing, timestamp, and generator tools from one domain.',
          'Move between related utilities without searching for another website.',
          'Use public landing pages for discovery and the app dashboard for daily work.',
        ],
      },
      {
        title: 'When single-purpose tools still win',
        body:
          'A dedicated website can be best when it has one highly specialized feature, a familiar interface, or team muscle memory.',
        bullets: [
          'Use regex101 when you need its specific regex explanation workflow.',
          'Use Postman or Insomnia when you need full team API lifecycle management.',
          'Use MyDevTools when you need broad, fast browser utilities in one open-source workspace.',
        ],
      },
      {
        title: 'Why developers choose MyDevTools',
        body:
          'MyDevTools is strongest as an everyday browser toolkit for quick operations, learning, debugging, and self-hosted control.',
        bullets: [
          'Open-source GPL-3.0 codebase for auditability.',
          'Public SEO pages for each tool, plus authenticated workspace features when needed.',
          'Self-hosting path for developers and teams that want infrastructure control.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is MyDevTools a replacement for every developer tool?',
        a: 'No. It is best for everyday browser-based utilities and quick workflows. Specialized desktop or enterprise tools can still be better for deep team workflows.',
      },
      {
        q: 'Why use MyDevTools instead of separate tool websites?',
        a: 'It reduces context switching and gives you one searchable toolkit for common developer tasks like formatting JSON, decoding JWTs, testing regexes, generating UUIDs, and more.',
      },
    ],
  },
  {
    slug: 'mydevtools-vs-jsonformatter-org',
    title: 'MyDevTools vs JSONFormatter.org',
    description:
      'Compare MyDevTools with JSONFormatter.org for JSON formatting, validation, and broader developer toolkit workflows.',
    eyebrow: 'Comparison',
    heading: 'MyDevTools vs JSONFormatter.org',
    intro:
      'JSONFormatter.org is useful for focused JSON formatting. MyDevTools includes JSON formatting as part of a broader online developer toolkit for API, encoding, security, generator, and productivity workflows.',
    competitor: 'JSONFormatter.org',
    toolSlug: 'json-formatter',
    primaryCta: { href: '/tools/json-formatter', label: 'Try JSON Formatter' },
    sections: [
      {
        title: 'Choose JSONFormatter.org when',
        body:
          'A single-purpose JSON formatter can be enough for a quick paste, format, and copy workflow.',
        bullets: [
          'You only need to format or inspect JSON.',
          'You already know its interface and do not need other developer utilities.',
          'You do not need an open-source toolkit or self-hosting path.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'JSON work rarely happens alone. Developers often need to decode tokens, inspect URLs, test APIs, generate IDs, compare diffs, and transform formats in the same session.',
        bullets: [
          'Use JSON formatting alongside JWT, API client, URL parser, Base64, hash, UUID, and mock data tools.',
          'Stay in one browser-based developer toolkit instead of opening multiple unrelated sites.',
          'Self-host the open-source codebase when you want control over the environment.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Use JSONFormatter.org for a narrowly focused JSON task. Use MyDevTools when JSON formatting is one part of a larger developer workflow.',
        bullets: [
          'Best single-purpose fit: JSONFormatter.org.',
          'Best multi-tool workflow fit: MyDevTools.',
          'Best open-source/self-hostable option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does MyDevTools include a JSON formatter?',
        a: 'Yes. MyDevTools includes a JSON formatter/editor landing page and app tool, plus related tools for JWT, APIs, URLs, Base64, diffs, and schema workflows.',
      },
      {
        q: 'Is MyDevTools only for JSON?',
        a: 'No. JSON is one tool in a larger online developer toolkit with 50+ utilities.',
      },
    ],
  },
  {
    slug: 'mydevtools-vs-jwt-io',
    title: 'MyDevTools vs jwt.io',
    description:
      'Compare MyDevTools with jwt.io for JWT decoding and broader browser-based security and developer workflows.',
    eyebrow: 'Comparison',
    heading: 'MyDevTools vs jwt.io',
    intro:
      'jwt.io is a well-known JWT debugger. MyDevTools includes JWT decoding as part of a broader developer toolkit for tokens, certificates, hashing, HMAC, encryption, API requests, and data formatting.',
    competitor: 'jwt.io',
    toolSlug: 'jwt-decoder',
    primaryCta: { href: '/tools/jwt-decoder', label: 'Try JWT Decoder' },
    sections: [
      {
        title: 'Choose jwt.io when',
        body:
          'jwt.io is familiar and focused for quickly reading JWT header and payload fields.',
        bullets: [
          'You want a dedicated JWT debugger experience.',
          'Your workflow is limited to token inspection.',
          'Your team already references jwt.io in documentation.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'JWT debugging often connects to API testing, timestamp inspection, hashing, HMAC signatures, and certificate review.',
        bullets: [
          'Decode JWTs and then test API calls in the same toolkit.',
          'Use timestamp, HMAC, hash, certificate, and encryption tools nearby.',
          'Use an open-source, self-hostable developer toolkit for broader security workflows.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'jwt.io is strong for a familiar dedicated JWT page. MyDevTools is stronger when JWT decoding is one step in a broader developer or API workflow.',
        bullets: [
          'Best dedicated JWT page: jwt.io.',
          'Best multi-step API/security workflow: MyDevTools.',
          'Best self-hostable option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can MyDevTools decode JWTs?',
        a: 'Yes. The JWT Decoder lets you inspect JWT header and payload fields in the browser.',
      },
      {
        q: 'Does MyDevTools verify JWT signatures?',
        a: 'The JWT tool is focused on decoding and inspection. For signature-related workflows, pair it with HMAC, hashing, certificate, or API testing tools as needed.',
      },
    ],
  },
  {
    slug: 'mydevtools-vs-regex101',
    title: 'MyDevTools vs regex101',
    description:
      'Compare MyDevTools with regex101 for regex testing and broader online developer toolkit workflows.',
    eyebrow: 'Comparison',
    heading: 'MyDevTools vs regex101',
    intro:
      'regex101 is excellent for deep regex explanation and pattern sharing. MyDevTools includes regex testing as part of a larger online toolkit for formatting, parsing, generating, and debugging developer data.',
    competitor: 'regex101',
    toolSlug: 'regex-tester',
    primaryCta: { href: '/tools/regex-tester', label: 'Try Regex Tester' },
    sections: [
      {
        title: 'Choose regex101 when',
        body:
          'A specialized regex site is best when you need detailed explanations, flavor-specific behavior, and pattern sharing.',
        bullets: [
          'You need advanced regex explanations.',
          'You want a dedicated regex-focused workspace.',
          'You are debugging a complex expression in depth.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'Regex testing is often part of larger cleanup or validation work with URLs, JSON payloads, logs, encoded strings, and generated test data.',
        bullets: [
          'Test regex patterns alongside JSON, URL, Base64, timestamp, and mock data tools.',
          'Use one browser toolkit for common developer utilities.',
          'Self-host the toolkit for internal workflows.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Use regex101 for deep regex education and explanation. Use MyDevTools when regex testing is part of a broader development task.',
        bullets: [
          'Best advanced regex explanation: regex101.',
          'Best multi-tool developer workflow: MyDevTools.',
          'Best open-source toolkit context: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does MyDevTools have a regex tester?',
        a: 'Yes. MyDevTools includes an online regex tester for checking JavaScript regular expressions in the browser.',
      },
      {
        q: 'Is MyDevTools better than regex101?',
        a: 'It depends. regex101 is stronger for advanced regex explanation. MyDevTools is better when regex testing is one part of a broader developer toolkit workflow.',
      },
    ],
  },
  {
    slug: 'cyberchef-alternative',
    title: 'CyberChef Alternative',
    description:
      'Looking for a CyberChef alternative for everyday browser developer utilities? Compare MyDevTools for formatting, decoding, encoding, hashing, and generator workflows.',
    eyebrow: 'Alternative',
    heading: 'CyberChef alternative for everyday developer workflows',
    intro:
      'CyberChef is powerful for chained transformations and forensic-style recipes. MyDevTools is built for everyday developer utility workflows: format JSON, decode JWTs, encode Base64, hash data, parse URLs, generate UUIDs, and test APIs from one toolkit.',
    competitor: 'CyberChef',
    primaryCta: { href: '/tools', label: 'Browse MyDevTools' },
    sections: [
      {
        title: 'Choose CyberChef when',
        body:
          'CyberChef is excellent for chaining operations, recipes, analysis, and advanced transformation workflows.',
        bullets: [
          'You need multi-step transformation recipes.',
          'You work on forensic or security analysis tasks.',
          'You need the specific CyberChef operation model.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'MyDevTools is aimed at common engineering workflows where you want named tools, landing pages, app navigation, and self-hosted control.',
        bullets: [
          'Use dedicated tools for JSON, JWT, regex, UUID, Base64, hashing, timestamps, and APIs.',
          'Keep everyday developer utilities discoverable in one dashboard.',
          'Use an open-source toolkit designed for general developer productivity.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'CyberChef is best for advanced chained operations. MyDevTools is best as a broad daily developer toolkit.',
        bullets: [
          'Best recipe-based transformations: CyberChef.',
          'Best everyday developer toolkit: MyDevTools.',
          'Best product-style tool directory: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is MyDevTools a CyberChef clone?',
        a: 'No. MyDevTools focuses on individual developer utilities and a unified dashboard rather than recipe-based chained operations.',
      },
      {
        q: 'When should I use MyDevTools instead of CyberChef?',
        a: 'Use MyDevTools for common developer tasks like formatting JSON, decoding JWTs, testing APIs, generating UUIDs, hashing values, and parsing URLs.',
      },
    ],
  },
  {
    slug: 'postman-alternative-online',
    title: 'Online Postman Alternative',
    description:
      'Compare MyDevTools as a lightweight online Postman alternative for quick API testing alongside JSON, JWT, URL, encoding, and generator tools.',
    eyebrow: 'Alternative',
    heading: 'Online Postman alternative for quick API testing',
    intro:
      'Postman is a full API platform. MyDevTools is a lightweight online developer toolkit with an API client plus surrounding utilities developers often need during API debugging.',
    competitor: 'Postman',
    toolSlug: 'api-client',
    primaryCta: { href: '/tools/api-client', label: 'Try API Client' },
    sections: [
      {
        title: 'Choose Postman when',
        body:
          'Postman is better for full API lifecycle management, team collaboration, mock servers, collections, and governance.',
        bullets: [
          'You need enterprise API collaboration.',
          'You manage large shared API collections.',
          'You rely on Postman-specific test automation and governance.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'Sometimes you just need to send a request, inspect a response, decode a token, format JSON, and generate test data without opening a heavy desktop workflow.',
        bullets: [
          'Use the API client for quick request testing.',
          'Pair API testing with JSON, JWT, URL, Base64, timestamp, and mock data tools.',
          'Use the browser-based toolkit when speed and context switching matter more than enterprise API management.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Postman is stronger as a full API platform. MyDevTools is useful as a fast online toolkit around lightweight API debugging.',
        bullets: [
          'Best enterprise API platform: Postman.',
          'Best quick browser toolkit around API debugging: MyDevTools.',
          'Best open-source self-hostable toolkit path: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is MyDevTools a full Postman replacement?',
        a: 'No. MyDevTools is better described as a lightweight online API client inside a broader developer toolkit.',
      },
      {
        q: 'Why use MyDevTools for API debugging?',
        a: 'It keeps API requests close to related tools like JSON formatter, JWT decoder, URL parser, timestamp converter, and mock data generator.',
      },
    ],
  },
]

export const comparisonPageSlugs = comparisonPages.map((page) => page.slug)

export function getComparisonPage(slug: string): ComparisonPage | undefined {
  return comparisonPages.find((page) => page.slug === slug)
}

export function getComparisonPagesForTool(toolSlug: string): ComparisonPage[] {
  return comparisonPages.filter((page) => page.toolSlug === toolSlug)
}
