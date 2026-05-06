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
  {
    slug: 'uuid-generator-online',
    title: 'Best Free UUID Generator Online',
    description:
      'Generate UUID v4, v7, and other versions instantly in your browser. Compare online UUID generators and learn when to use each UUID version.',
    eyebrow: 'UUID Generator',
    heading: 'Best free online UUID generator: v4, v7, bulk generation',
    intro:
      'Most UUID generator sites produce a single v4 UUID. MyDevTools UUID Generator lets you choose the version (v4, v7, ULID), generate in bulk, and stay inside a broader developer toolkit for API keys, hashing, QR codes, and other generator workflows.',
    toolSlug: 'uuid-generator',
    primaryCta: { href: '/tools/uuid-generator', label: 'Generate UUIDs' },
    sections: [
      {
        title: 'UUID v4 vs v7: which to generate',
        body:
          'UUID v4 is fully random and works everywhere. UUID v7 is time-ordered, which makes it better for database primary keys where insert order matters for index performance.',
        bullets: [
          'UUID v4: stateless, random, maximum compatibility with existing systems.',
          'UUID v7: time-ordered, better B-tree locality, recommended for new database schemas.',
          'ULID: shorter, URL-safe, lexicographically sortable alternative to UUID.',
        ],
      },
      {
        title: 'Why use a toolkit instead of a single-purpose generator',
        body:
          'After generating UUIDs you often need to build a request body, format JSON, or generate an API key — all in the same session.',
        bullets: [
          'Generate UUIDs and API keys from the same generator section.',
          'Paste generated IDs into the API client or JSON formatter without switching tabs.',
          'Use mock data generator when you need multiple IDs alongside other test fields.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Any UUID generator produces valid v4 UUIDs. Choose one that integrates into your broader workflow.',
        bullets: [
          'Best single v4: any online generator.',
          'Best version choice + bulk + context: MyDevTools.',
          'Best open-source/self-hosted: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is it safe to use an online UUID generator?',
        a: 'UUID v4 generators use cryptographically random bytes and do not transmit anything sensitive. MyDevTools UUID Generator runs in your browser with no server round-trip.',
      },
      {
        q: 'Can I generate UUIDs in bulk online?',
        a: 'Yes. MyDevTools UUID Generator lets you set a count and generate multiple UUIDs at once, ready to copy as a list.',
      },
    ],
  },
  {
    slug: 'base64-encoder-decoder-online',
    title: 'Free Online Base64 Encoder and Decoder',
    description:
      'Encode text or binary to Base64 and decode Base64 back to text instantly in your browser. Compare online Base64 tools and understand when to use Base64URL.',
    eyebrow: 'Base64 Encoder / Decoder',
    heading: 'Free online Base64 encoder and decoder — text, file, and URL-safe',
    intro:
      'Base64 encoding is a daily task for developers working with APIs, JWTs, images, and authentication headers. MyDevTools Base64 tool handles standard encoding, URL-safe Base64, and file input — all in the browser, no install.',
    toolSlug: 'base64',
    primaryCta: { href: '/tools/base64', label: 'Open Base64 Tool' },
    sections: [
      {
        title: 'Standard Base64 vs Base64URL',
        body:
          'Standard Base64 uses + and / which are unsafe in URLs. Base64URL substitutes - and _ and drops padding — essential for JWTs, OAuth tokens, and URL query parameters.',
        bullets: [
          'Standard Base64: use for email attachments, binary in JSON, image data URIs.',
          'Base64URL: use for JWTs, URL parameters, and any context where + and / break parsing.',
          'MyDevTools Base64 tool handles both modes in one place.',
        ],
      },
      {
        title: 'When Base64 encoding appears in developer workflows',
        body:
          'Base64 shows up in API authentication, JWT payloads, data URIs, and binary field serialization.',
        bullets: [
          'HTTP Basic Auth encodes credentials as Base64 in the Authorization header.',
          'JWT header and payload are Base64URL-encoded sections.',
          'Image data URIs embed Base64-encoded bytes directly in HTML or CSS.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Any online Base64 encoder produces correct output for text input. MyDevTools adds file input, URL-safe mode, and related tools in one place.',
        bullets: [
          'Best for text encoding: any online tool.',
          'Best for file + URL-safe + toolkit context: MyDevTools.',
          'Best open-source option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is Base64 the same as encryption?',
        a: 'No. Base64 is a reversible encoding that anyone can decode without a key. Use it to make binary data text-safe, not to protect secrets.',
      },
      {
        q: 'Why does my Base64 output end with == ?',
        a: 'Base64 works on 3-byte groups. = padding fills out the last group when the input length is not divisible by 3.',
      },
    ],
  },
  {
    slug: 'online-diff-checker',
    title: 'Online Diff Checker — Compare Text, Code, and JSON',
    description:
      'Compare two blocks of text, code, or JSON side by side and highlight differences instantly in the browser. Find the best online diff tool for your workflow.',
    eyebrow: 'Diff Checker',
    heading: 'Online diff checker: compare text, code, and JSON side by side',
    intro:
      'Online diff tools let you paste two versions of a file and instantly see additions, deletions, and changes highlighted. MyDevTools Diff Checker works in the browser alongside JSON formatting, URL parsing, and other utilities developers use in the same session.',
    toolSlug: 'diff-checker',
    primaryCta: { href: '/tools/diff-checker', label: 'Try Diff Checker' },
    sections: [
      {
        title: 'When to use an online diff checker',
        body:
          'Online diff is fastest for one-off comparisons: reviewing a config change, checking a response before and after a fix, or comparing two API payloads.',
        bullets: [
          'Compare JSON responses before and after an API change.',
          'Check .env files or config differences without a local IDE.',
          'Review copied text for hidden differences (whitespace, encoding).',
        ],
      },
      {
        title: 'When to use a local diff tool',
        body:
          'For large files, version history, and repository diffs, local tools like git diff or VS Code built-in diff are better suited.',
        bullets: [
          'Use git diff for code review of committed changes.',
          'Use VS Code diff for large files where browser performance matters.',
          'Use online diff for quick one-off comparisons without opening a project.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Online diff checkers are best for quick, one-off comparisons. MyDevTools adds JSON formatting and related tools in the same workspace.',
        bullets: [
          'Best for quick text/JSON diff: MyDevTools or diffchecker.com.',
          'Best for repository diffs: git diff / VS Code.',
          'Best for open-source browser toolkit: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I diff JSON with an online diff checker?',
        a: 'Yes. Paste two JSON objects and the diff checker highlights the changed fields line by line. For better readability, format the JSON first using the JSON formatter.',
      },
      {
        q: 'Is my text safe in an online diff tool?',
        a: 'MyDevTools Diff Checker runs the comparison in your browser with no server upload. Avoid pasting credentials or private keys into any online tool.',
      },
    ],
  },
  {
    slug: 'hash-generator-online',
    title: 'Online Hash Generator — MD5, SHA-1, SHA-256, SHA-512',
    description:
      'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from any text instantly in your browser. Compare online hash generators and understand which algorithm to use.',
    eyebrow: 'Hash Generator',
    heading: 'Online hash generator: MD5, SHA-1, SHA-256, SHA-512 in the browser',
    intro:
      'Hashing is used for checksums, data integrity verification, password storage (with salt), API signatures, and fingerprinting content. MyDevTools Hash Generator runs all major algorithms in the browser without sending your data to a server.',
    toolSlug: 'hash-generator',
    primaryCta: { href: '/tools/hash-generator', label: 'Generate Hashes' },
    sections: [
      {
        title: 'Which hash algorithm to use',
        body:
          'Algorithm choice depends on the use case. MD5 and SHA-1 are broken for security purposes but still used for checksums. SHA-256 and SHA-512 are the current standard for security-sensitive contexts.',
        bullets: [
          'MD5: file checksums, cache keys, non-security fingerprinting only.',
          'SHA-1: deprecated for TLS and signing; avoid for new security work.',
          'SHA-256: standard for HMAC, JWT signatures, data integrity, and API auth.',
          'SHA-512: higher security margin; used when SHA-256 feels insufficient for the threat model.',
        ],
      },
      {
        title: 'Hash generator vs HMAC generator',
        body:
          'A plain hash has no secret key and is not authentication-safe. HMAC (Hash-based Message Authentication Code) combines hashing with a secret key, making it resistant to length-extension attacks and safe for API authentication.',
        bullets: [
          'Use hash for checksums and content fingerprinting.',
          'Use HMAC for API request signing, webhook signature verification, and authentication.',
          'MyDevTools has both a Hash Generator and a dedicated HMAC Generator.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Any online hash tool generates correct hashes. MyDevTools adds HMAC, encryption, JWT, and password tools in the same security-focused section.',
        bullets: [
          'Best single-hash generation: any online tool.',
          'Best hash + HMAC + encryption toolkit: MyDevTools.',
          'Best open-source option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is MD5 still safe to use?',
        a: 'MD5 is broken for cryptographic security — collisions can be generated. It is still acceptable for non-security purposes like cache keys and file checksums. Never use MD5 for password hashing or digital signatures.',
      },
      {
        q: 'Can I reverse a hash to get the original text?',
        a: 'No. Hashing is a one-way function. You cannot reverse a hash to recover the original input — only compare it against a known hash of a candidate input.',
      },
    ],
  },
  {
    slug: 'mydevtools-vs-transform-tools',
    title: 'MyDevTools vs transform.tools',
    description:
      'Compare MyDevTools with transform.tools for data conversion and transformation workflows. See which tool fits everyday developer needs.',
    eyebrow: 'Comparison',
    heading: 'MyDevTools vs transform.tools',
    intro:
      'transform.tools offers a focused set of data transformation utilities. MyDevTools covers data conversion as part of a broader developer toolkit that also includes API testing, security tools, generators, and productivity features.',
    competitor: 'transform.tools',
    primaryCta: { href: '/tools', label: 'Browse MyDevTools' },
    sections: [
      {
        title: 'Choose transform.tools when',
        body:
          'transform.tools is a clean, purpose-built site for specific format transformations.',
        bullets: [
          'You need specific transforms like JSON to TypeScript or GraphQL to Flow.',
          'You want a focused single-purpose interface.',
          'Your workflow is entirely about converting between data formats.',
        ],
      },
      {
        title: 'Choose MyDevTools when',
        body:
          'Transformations are rarely isolated. Most developers also need to format, validate, test an API, decode a token, or generate test data in the same session.',
        bullets: [
          'Use format converter, JSON formatter, and CSV tools alongside API client and JWT decoder.',
          'Stay in one toolkit instead of bookmarking 10 different sites.',
          'Self-host the open-source codebase for team or internal use.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'transform.tools wins for narrow format conversion tasks. MyDevTools wins when conversions are part of a broader development workflow.',
        bullets: [
          'Best narrow data transformation: transform.tools.',
          'Best broad developer toolkit: MyDevTools.',
          'Best open-source self-hostable option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does MyDevTools support JSON to TypeScript conversion?',
        a: 'MyDevTools includes a JSON Schema Generator that infers schema from JSON. For direct JSON-to-TypeScript type generation, pair it with the JSON formatter to clean the input first.',
      },
      {
        q: 'Is MyDevTools open source like transform.tools?',
        a: 'Yes. MyDevTools is open source under GPL-3.0. You can inspect, fork, and self-host the entire codebase.',
      },
    ],
  },
  {
    slug: 'qr-code-generator-online',
    title: 'Free Online QR Code Generator',
    description:
      'Generate QR codes from URLs, text, or contact info instantly in your browser. No watermarks, no account required. Download as PNG or SVG.',
    eyebrow: 'QR Code Generator',
    heading: 'Free online QR code generator: URL, text, vCard — download as PNG or SVG',
    intro:
      'QR code generators are a common developer utility for sharing links, embedding URLs in print materials, and testing mobile deep links. MyDevTools QR Code Generator runs in the browser with no ads, no watermarks, and no account required.',
    toolSlug: 'qr-code-generator',
    primaryCta: { href: '/tools/qr-code-generator', label: 'Generate QR Code' },
    sections: [
      {
        title: 'What to look for in a QR code generator',
        body:
          'Most online generators add watermarks or require sign-up for PNG downloads. Browser-based generation avoids the data being sent to a third-party server.',
        bullets: [
          'No watermarks on downloaded codes.',
          'No account required for basic generation.',
          'Runs locally so no URL or text data is transmitted to a backend.',
        ],
      },
      {
        title: 'QR code use cases for developers',
        body:
          'Developers generate QR codes for testing mobile deep links, embedding URLs in documentation, sharing Wi-Fi credentials, and linking print materials to web resources.',
        bullets: [
          'Test mobile app deep links by scanning QR codes during development.',
          'Embed a URL QR code in slides, docs, or print without a design tool.',
          'Share a staging URL quickly with a phone scan instead of typing.',
        ],
      },
      {
        title: 'Verdict',
        body:
          'Any browser-based QR generator works for basic needs. MyDevTools adds QR generation alongside API client, URL parser, and other daily developer tools in one workspace.',
        bullets: [
          'Best for quick generation: MyDevTools or qr-code-generator.com.',
          'Best for developer toolkit context: MyDevTools.',
          'Best open-source option: MyDevTools.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Are QR codes generated online safe?',
        a: 'The safety concern is whether your URL or text is sent to a server. MyDevTools QR Code Generator renders the code in your browser using a local library — your input is not transmitted.',
      },
      {
        q: 'What file formats can I download QR codes in?',
        a: 'MyDevTools QR Code Generator supports PNG download. SVG output preserves crispness at any print size.',
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
