export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  category: string
  toolSlug?: string
  keywords: string[]
  readingTimeMin: number
  sections: Array<{
    heading: string
    body: string
    code?: string
    codeLanguage?: string
  }>
  faqs: Array<{ q: string; a: string }>
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-decode-a-jwt',
    title: 'How to Decode a JWT Token Online',
    description:
      'Learn what a JSON Web Token (JWT) is, how to read its header and payload, and how to decode one instantly in the browser without installing anything.',
    publishedAt: '2025-10-15',
    category: 'Security',
    toolSlug: 'jwt-decoder',
    keywords: ['decode jwt', 'jwt decoder online', 'how to read jwt', 'jwt header payload', 'json web token'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is a JWT?',
        body: `A JSON Web Token (JWT) is a compact, URL-safe way to represent claims between two parties. JWTs are widely used for authentication and authorization in APIs, single-page apps, and microservices. When a user logs in, the server typically returns a JWT that the client sends back on every subsequent request inside the Authorization header.\n\nA JWT has three parts separated by dots: the header, the payload, and the signature. Each part is Base64URL-encoded, which is why a raw token looks like a long string of random characters. Understanding how to decode and read that string is an essential debugging skill.`,
      },
      {
        heading: 'The three parts of a JWT',
        body: `**Header** — Describes the token type and signing algorithm. Typical values are \`{"alg": "HS256", "typ": "JWT"}\`. The algorithm field tells you how the signature was generated (e.g., HMAC-SHA256 or RS256).\n\n**Payload** — Contains the claims, which are statements about the user or context. Registered claims like \`sub\` (subject), \`iat\` (issued at), and \`exp\` (expiration) are standardized. Custom claims like \`userId\` or \`role\` are added by the application.\n\n**Signature** — A cryptographic signature that proves the token has not been tampered with. It is computed by signing the encoded header and payload with a secret or private key. You cannot verify the signature without the key, but you can still decode the header and payload to read their contents.`,
        code: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNzE2MjM5MDIyLCJleHAiOjE3MTYyNDI2MjJ9
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
        codeLanguage: 'text',
      },
      {
        heading: 'How to decode a JWT manually',
        body: `Because each part is Base64URL-encoded (not encrypted), you can decode the header and payload without any secret key. Base64URL is Base64 with \`+\` replaced by \`-\` and \`/\` replaced by \`_\`, with padding removed.\n\nTo decode manually in a terminal:`,
        code: `# Split on dots and decode the first two parts
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" | base64 -d
# Output: {"alg":"HS256","typ":"JWT"}`,
        codeLanguage: 'bash',
      },
      {
        heading: 'How to decode a JWT online (instant, no install)',
        body: `The fastest way to read a JWT during debugging is to paste it into an online decoder. MyDevTools JWT Decoder runs entirely in your browser — your token is never sent to a server. The tool splits the token into its three parts, decodes the header and payload to readable JSON, and highlights the expiration time (\`exp\`) as a human-readable date so you can instantly see whether a token is still valid.\n\nWhen to use an online decoder: during API debugging to check which claims a token carries, after a login flow to verify the payload matches expected user data, and when reviewing third-party tokens to understand their structure.`,
      },
      {
        heading: 'Common JWT claim fields',
        body: `- \`sub\` — Subject: the user or entity the token represents.\n- \`iat\` — Issued At: Unix timestamp when the token was created.\n- \`exp\` — Expiration: Unix timestamp after which the token is invalid.\n- \`aud\` — Audience: intended recipient(s) of the token.\n- \`iss\` — Issuer: who created and signed the token.\n- \`jti\` — JWT ID: a unique identifier for the token, useful for revocation.\n\nCustom claims like \`role\`, \`email\`, or \`permissions\` are added by the application and are not standardized but follow the same structure.`,
      },
      {
        heading: 'Decoding vs verifying a JWT',
        body: `Decoding reads the contents. Verifying proves the token is authentic and unmodified. For decoding (reading claims), no key is needed — the header and payload are just Base64URL. For verification, you need the signing key or public key that matches the algorithm in the header.\n\nAlways verify JWTs in backend services before trusting their claims. Use decoding only for debugging and inspection on the client side.`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to paste my JWT into an online decoder?',
        a: 'Use a browser-based decoder that processes the token locally without sending it to a server. MyDevTools JWT Decoder works entirely in your browser — the token never leaves your machine. Avoid decoders that require submitting the token to an external endpoint.',
      },
      {
        q: 'Can I decode a JWT without the secret key?',
        a: 'Yes. The header and payload are Base64URL-encoded, not encrypted. You can decode them to plain JSON without any key. You cannot verify the signature without the signing key, but decoding and reading the claims requires no secret.',
      },
      {
        q: 'What does it mean when a JWT is expired?',
        a: 'The exp claim holds a Unix timestamp. If the current time is past that timestamp, the token is expired and backend services should reject it. A decoder converts the exp value to a human-readable date so you can quickly see whether a token is still valid.',
      },
      {
        q: 'Why does my JWT look different each time even for the same user?',
        a: 'JWTs typically include an iat (issued at) timestamp and sometimes a jti (JWT ID). These fields change with every token issued, so even identical claims produce a different token string each time.',
      },
    ],
  },
  {
    slug: 'how-to-format-json-online',
    title: 'How to Format JSON Online: Beautify, Validate & Minify',
    description:
      'Format messy JSON into readable, indented output instantly in the browser. Learn JSON formatting best practices, common errors, and how to minify JSON for production.',
    publishedAt: '2025-10-22',
    category: 'Formatters',
    toolSlug: 'json-formatter',
    keywords: ['format json online', 'json formatter', 'json beautifier', 'json validator', 'json minifier', 'pretty print json'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why JSON formatting matters',
        body: `JSON (JavaScript Object Notation) is the lingua franca of web APIs. When you receive raw API responses, log output, or configuration files, JSON is often minified into a single line to save bandwidth. That makes it fast to transmit but nearly impossible to read at a glance.\n\nFormatting (or "pretty-printing") JSON adds consistent indentation and line breaks so nested structures are immediately visible. A well-formatted JSON payload is faster to debug, easier to review in code, and simpler to diff between versions.`,
      },
      {
        heading: 'JSON formatting rules',
        body: `Valid JSON follows strict rules that differ from JavaScript object literals:\n\n- Keys must be double-quoted strings — single quotes are not valid.\n- Strings must use double quotes.\n- Trailing commas after the last element in objects or arrays are not allowed.\n- \`undefined\`, functions, and symbols are not valid JSON values.\n- Numbers must not have leading zeros.\n\nA JSON formatter also acts as a validator — it catches these syntax errors immediately and tells you exactly which line caused the problem.`,
        code: `// Invalid JSON (trailing comma, single-quoted key)
{'name': "Alice", "age": 30,}

// Valid JSON
{"name": "Alice", "age": 30}`,
        codeLanguage: 'json',
      },
      {
        heading: 'How to format JSON online',
        body: `The quickest path is to paste your JSON into a browser-based formatter. MyDevTools JSON Formatter parses and indents your JSON with 2-space indentation, highlights syntax errors with line numbers, and lets you copy the formatted result with one click. It runs locally in your browser — no API call, no data upload.\n\nUseful scenarios: formatting API responses during debugging, cleaning up configuration files before committing, comparing two JSON payloads in a diff tool, and quickly checking whether a response is valid JSON before parsing it in code.`,
      },
      {
        heading: 'Minifying JSON',
        body: `Minifying is the reverse of formatting — it strips whitespace to produce the smallest possible JSON string. Minified JSON is preferred in HTTP responses (where every byte counts), in localStorage values, and in build artifacts where you control the output.\n\nA typical minifier reduces JSON size by 20-40% depending on the amount of whitespace. For large deeply-nested objects the savings are even greater.`,
        code: `// Formatted (73 bytes)
{
  "id": 1,
  "name": "Alice",
  "active": true
}

// Minified (37 bytes)
{"id":1,"name":"Alice","active":true}`,
        codeLanguage: 'json',
      },
      {
        heading: 'Common JSON errors and how to fix them',
        body: `**Unexpected token** — Usually a trailing comma or an unquoted key. Look at the character position in the error message and check one character before it.\n\n**Unexpected end of JSON input** — The JSON is cut off. Check that you copied the full response, including closing brackets and braces.\n\n**SyntaxError: JSON.parse** in JavaScript — Same root cause as above. Use a formatter to find the exact line before resorting to trial-and-error in code.\n\n**Numbers quoted as strings** — Not technically an error, but a common bug. \`"count": "42"\` is a string, not a number. Check your serialization layer if numeric fields are arriving as strings.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between JSON formatting and JSON validation?',
        a: 'Formatting adds indentation and line breaks to make JSON readable. Validation checks whether the JSON conforms to the JSON specification (valid syntax). A good formatter always validates first and rejects malformed input.',
      },
      {
        q: 'Is it safe to paste sensitive JSON (API keys, tokens) into an online formatter?',
        a: 'Use a formatter that runs locally in the browser with no server upload. MyDevTools JSON Formatter processes your JSON in-browser — nothing is sent to a backend. For highly sensitive data, consider running a local CLI formatter like jq instead.',
      },
      {
        q: 'What is the difference between JSON and JSON5?',
        a: 'JSON5 is a superset of JSON that allows comments, trailing commas, and single-quoted strings. It is useful in configuration files but is not valid JSON and cannot be parsed by standard JSON.parse(). Most online formatters target standard JSON.',
      },
      {
        q: 'Can I format nested JSON arrays inside a JSON formatter?',
        a: 'Yes. A formatter handles arbitrarily nested objects and arrays, applying consistent indentation at each level regardless of nesting depth.',
      },
    ],
  },
  {
    slug: 'regex-lookahead-lookbehind-examples',
    title: 'Regex Lookahead and Lookbehind: Practical Examples',
    description:
      'Master regex lookahead and lookbehind assertions with real-world examples. Test patterns in your browser and learn when to use each type of zero-width assertion.',
    publishedAt: '2025-11-01',
    category: 'Formatters',
    toolSlug: 'regex-tester',
    keywords: ['regex lookahead', 'regex lookbehind', 'regex examples', 'positive lookahead', 'negative lookbehind', 'javascript regex'],
    readingTimeMin: 7,
    sections: [
      {
        heading: 'What are zero-width assertions?',
        body: `Lookahead and lookbehind are zero-width assertions — they match a position in the string rather than consuming characters. A zero-width assertion says "match here only if this pattern appears ahead/behind the cursor," but the matched characters are not included in the overall match.\n\nThis makes them powerful for matching words in context: extract prices that follow a dollar sign, usernames that precede an @ symbol, or numbers not followed by a percent sign.`,
      },
      {
        heading: 'Positive lookahead: (?=...)',
        body: `A positive lookahead \`(?=pattern)\` succeeds only if the pattern appears immediately after the current position. Use it to match something that must be followed by something else without including the follower in the match.`,
        code: `// Match digits followed by "px"
/\\d+(?=px)/

// Input: "margin: 16px solid 8em"
// Matches: "16"  (the "px" is asserted but not captured)

// Match a word before a colon
/\\w+(?=:)/

// Input: "name: Alice, age: 30"
// Matches: "name", "age"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Negative lookahead: (?!...)',
        body: `A negative lookahead \`(?!pattern)\` succeeds only if the pattern does NOT appear immediately after the current position. Use it to exclude unwanted contexts.`,
        code: `// Match "file" not followed by ".exe"
/file(?!\\.exe)/i

// Input: "file.txt file.exe file.log"
// Matches: "file" in "file.txt" and "file.log" only

// Match numbers not followed by "%"
/\\d+(?!%)/

// Input: "score: 95% items: 42"
// Matches: "42" (95 is followed by %, so skipped)`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Positive lookbehind: (?<=...)',
        body: `A positive lookbehind \`(?<=pattern)\` matches only if the pattern appears immediately before the current position. Use it to match text that must be preceded by something specific.`,
        code: `// Match digits preceded by "$"
/(?<=\\$)\\d+(\\.\\d{2})?/

// Input: "prices: $19.99 and $5"
// Matches: "19.99", "5"

// Match word after "Dr. "
/(?<=Dr\\.\\s)\\w+/

// Input: "Patients: Dr. Smith and Dr. Jones"
// Matches: "Smith", "Jones"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Negative lookbehind: (?<!...)',
        body: `A negative lookbehind \`(?<!pattern)\` matches only if the pattern does NOT appear before the current position.`,
        code: `// Match "port" not preceded by "air"
/(?<!air)port/

// Input: "airport seaport"
// Matches: "port" in "seaport" only

// Match numbers not preceded by "-"
/(?<!-)\\d+/

// Input: "balance: -42 count: 100"
// Matches: "100"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Browser support and JavaScript notes',
        body: `Lookbehind (\`(?<=...)\` and \`(?<!...)\`) requires ES2018+ (Chrome 62+, Firefox 78+, Node 8+). Positive and negative lookahead have been supported in JavaScript since ES3 and work in all browsers.\n\nFor complex patterns, test them in an online regex tester before embedding them in code. MyDevTools Regex Tester lets you paste input, write the pattern, and see matches highlighted in real time with match groups, indices, and explanations.`,
      },
      {
        heading: 'Practical use cases',
        body: `- **Password validation**: require at least one digit \`(?=.*\\d)\`, one uppercase \`(?=.*[A-Z])\`, one special character.\n- **Log parsing**: extract error codes that appear after a specific prefix without capturing the prefix.\n- **URL slug generation**: strip characters not followed by alphanumerics.\n- **Currency extraction**: grab numeric amounts that follow \`$\`, \`€\`, or \`£\` without including the symbol in the capture.\n- **Negative filter**: find lines containing a word but not preceded by "not" or "no ".`,
      },
    ],
    faqs: [
      {
        q: 'Do lookbehind assertions work in JavaScript?',
        a: 'Yes, since ES2018. Positive lookbehind (?<=) and negative lookbehind (?<!) work in Node 8+ and all major browsers released after 2018. Lookahead has been supported since ES3.',
      },
      {
        q: 'What is the difference between lookahead and capturing groups?',
        a: 'A capturing group (parentheses without ?) includes its match in the result and consumes characters. A lookahead is zero-width — it checks for a pattern at that position but does not consume characters or include them in the match result.',
      },
      {
        q: 'Can I chain multiple lookaheads in one regex?',
        a: 'Yes. Multiple lookaheads can be applied at the same position: /(?=.*\\d)(?=.*[A-Z])(?=.*[^a-zA-Z0-9])/ is a common pattern for password validation that checks for a digit, an uppercase letter, and a special character.',
      },
    ],
  },
  {
    slug: 'base64-encoding-explained',
    title: 'Base64 Encoding Explained: How It Works and When to Use It',
    description:
      'Understand what Base64 encoding is, how it converts binary data to text, common use cases in web development, and how to encode or decode Base64 instantly online.',
    publishedAt: '2025-11-10',
    category: 'Converters',
    toolSlug: 'base64',
    keywords: ['base64 encoding', 'base64 decode', 'base64 encode online', 'what is base64', 'base64 url safe'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is Base64 encoding?',
        body: `Base64 is a binary-to-text encoding scheme that represents binary data as a string of ASCII characters. It uses a set of 64 printable characters (A–Z, a–z, 0–9, +, /) to encode every 3 bytes of binary data into 4 ASCII characters.\n\nThe result is about 33% larger than the original binary data but can be safely transmitted over systems designed to handle text — like HTTP headers, JSON fields, URLs, and email attachments.`,
      },
      {
        heading: 'How Base64 works',
        body: `The encoding process takes 3 bytes (24 bits) at a time and splits them into four 6-bit groups. Each 6-bit value (0–63) maps to a character in the Base64 alphabet. If the input is not divisible by 3, padding characters (\`=\`) are added to make the output length a multiple of 4.`,
        code: `// "Man" in ASCII is 77 97 110
// Binary: 01001101 01100001 01101110
// Split into 6-bit groups: 010011 010110 000101 101110
// Map to Base64 alphabet:   T      W      F      u
// Result: "TWFu"

btoa("Man") // → "TWFu"
atob("TWFu") // → "Man"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Common use cases in web development',
        body: `**Embedding images in HTML/CSS**: Data URLs use Base64 to embed image bytes directly without a separate HTTP request. Useful for small icons and inline SVGs in critical CSS.\n\n**Authentication**: HTTP Basic Auth encodes \`username:password\` as Base64 in the Authorization header. Note: this is encoding, not encryption — always use HTTPS.\n\n**JWT tokens**: The header and payload sections of a JWT are Base64URL-encoded (a variant that uses \`-\` and \`_\` instead of \`+\` and \`/\`).\n\n**Email attachments**: MIME encoding uses Base64 to attach binary files (images, PDFs) in email messages.\n\n**Binary data in JSON**: Since JSON only supports text, binary payloads (audio, images, file buffers) are often Base64-encoded before being embedded in a JSON field.`,
      },
      {
        heading: 'Base64 vs Base64URL',
        body: `Standard Base64 uses \`+\` and \`/\` which are special characters in URLs. Base64URL replaces them with \`-\` and \`_\` and omits the \`=\` padding. This makes Base64URL safe to use in URL query parameters and path segments without percent-encoding.\n\nJWTs always use Base64URL. When decoding a JWT payload manually, use Base64URL decoding, not standard Base64.`,
        code: `// Standard Base64 might produce: "a+b/c=="
// Base64URL equivalent:          "a-b_c"

// JavaScript (Node.js / modern browsers)
Buffer.from("hello world").toString("base64url")
// → "aGVsbG8gd29ybGQ"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Encoding vs encryption',
        body: `Base64 is not encryption. It is a reversible encoding that anyone can decode without a key. Never use Base64 to protect sensitive data. Always use proper encryption (AES, RSA) for secrets, and use Base64 only to make binary data text-safe for transport.`,
      },
    ],
    faqs: [
      {
        q: 'Is Base64 a form of encryption?',
        a: 'No. Base64 is a reversible encoding — anyone can decode it without a key. It is used to make binary data safe for text-based systems, not to protect data.',
      },
      {
        q: 'Why does Base64 end with == sometimes?',
        a: "Base64 works on groups of 3 bytes. If the input length isn't divisible by 3, = padding characters are added to the output to make it a multiple of 4 characters.",
      },
      {
        q: 'What is the difference between Base64 and Base64URL?',
        a: 'Base64URL replaces + with - and / with _ and omits = padding. This makes it safe to use in URLs and HTTP headers without percent-encoding. JWTs use Base64URL.',
      },
      {
        q: 'Can I encode a file to Base64 online?',
        a: 'Yes. MyDevTools Base64 encoder lets you paste text or load a file and produces the Base64 output in the browser without uploading anything to a server.',
      },
    ],
  },
  {
    slug: 'uuid-guide-generate-and-understand',
    title: 'UUID Guide: What They Are, Version Differences, and How to Generate Them',
    description:
      'Learn what UUIDs are, the difference between UUID v1, v4, and v7, when to use each, and how to generate UUIDs instantly online without any library.',
    publishedAt: '2025-11-20',
    category: 'Generators',
    toolSlug: 'uuid-generator',
    keywords: ['uuid generator', 'generate uuid online', 'uuid v4', 'uuid v7', 'uuid vs ulid', 'universally unique identifier'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is a UUID?',
        body: `A UUID (Universally Unique Identifier) is a 128-bit label used to uniquely identify information. The standard format is 32 hexadecimal digits in five groups: \`xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx\`, where M indicates the version and N indicates the variant.\n\nUUIDs are designed so that generating them independently — even across different machines without coordination — produces values that are statistically guaranteed to not collide. This makes them ideal as primary keys in distributed databases, resource IDs in APIs, session tokens, and file names for uploads.`,
        code: `// Standard UUID format
"550e8400-e29b-41d4-a716-446655440000"
//  8      4    4    4    12 hex chars
// └─ Groups separated by hyphens ─┘`,
        codeLanguage: 'text',
      },
      {
        heading: 'UUID v4: random (most common)',
        body: `UUID v4 is generated entirely from random (or pseudo-random) data. It is the default choice for most applications because it requires no state, no coordination, and produces values with an astronomically low collision probability (2^122 possible values).\n\nUsed for: database primary keys, API resource IDs, session IDs, file upload names, request correlation IDs.`,
        code: `// UUID v4 examples
"f47ac10b-58cc-4372-a567-0e02b2c3d479"
"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"

// Node.js
const { randomUUID } = require('crypto')
randomUUID() // → "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// Browser
crypto.randomUUID()`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'UUID v1: timestamp + MAC address',
        body: `UUID v1 embeds the current timestamp and the machine's MAC address. This means v1 UUIDs are sortable by creation time and traceable to the host that generated them — both of which can be privacy and security concerns.\n\nBecause the MAC address is embedded, v1 UUIDs from the same machine are predictable in pattern. Prefer v4 or v7 for new projects.`,
      },
      {
        heading: 'UUID v7: time-ordered (recommended for databases)',
        body: `UUID v7 is a modern UUID format that embeds a Unix timestamp in the most significant bits, making UUIDs naturally sortable by creation order. This is a significant advantage for database performance: sorted UUIDs cause far fewer B-tree page splits than random v4 UUIDs, leading to better index locality and faster inserts at scale.\n\nUsed for: database primary keys where you want both uniqueness and sortability without a separate \`created_at\` column acting as a tiebreaker.`,
        code: `// UUID v7 — timestamp in first 48 bits
"018e4b3c-d6ab-7000-8000-000000000001"
// └─ millisecond timestamp ─┘└── random ─┘

// Libraries
// Node: uuidv7 package
// Postgres 17: gen_random_uuid() still v4; use uuid-ossp or a custom function
// Rust: uuid crate with v7 feature`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'UUID vs ULID vs KSUID',
        body: `All three are 128-bit unique ID formats, but differ in sortability and encoding:\n\n- **UUID v4** — random, not sortable, hyphenated hex, universally supported.\n- **UUID v7** — time-ordered, sortable, same format as UUID, growing support.\n- **ULID** — Universally Unique Lexicographically Sortable Identifier. Base32-encoded (26 chars), monotonically sortable within the same millisecond, no hyphens. Good for distributed systems that need compact sortable IDs.\n- **KSUID** — K-Sortable Unique IDentifier. Base62-encoded (27 chars), sortable by second precision.\n\nFor most new projects: use UUID v7 for database PKs, ULID when a shorter and URL-friendly format matters.`,
      },
    ],
    faqs: [
      {
        q: 'Can two UUIDs ever be the same?',
        a: 'Theoretically yes, but the probability is negligible. UUID v4 has 2^122 possible values (~5.3 × 10^36). Generating a billion UUIDs per second for 85 years gives a 50% chance of a single collision — effectively impossible in practice.',
      },
      {
        q: 'Should I use UUID v4 or v7 for database primary keys?',
        a: 'UUID v7 is generally better for database primary keys because its time-ordered structure produces sequential inserts that avoid B-tree fragmentation. UUID v4 causes random page splits under high insert load. If your database or ORM does not yet support v7, v4 is still perfectly correct.',
      },
      {
        q: 'Is a UUID the same as a GUID?',
        a: 'Yes. GUID (Globally Unique Identifier) is Microsoft\'s term for UUID. They use the same 128-bit format and are interchangeable.',
      },
      {
        q: 'How do I generate a UUID without a library in the browser?',
        a: 'Modern browsers expose crypto.randomUUID() which generates a cryptographically secure UUID v4. In Node.js 15+ use require("crypto").randomUUID().',
      },
    ],
  },
  {
    slug: 'cron-expression-syntax-guide',
    title: 'Cron Expression Syntax: Complete Guide with Examples',
    description:
      'Learn cron expression syntax field by field with practical examples. Covers standard 5-field cron, extended 6-field formats, special strings, and common patterns for scheduling jobs.',
    publishedAt: '2025-12-01',
    category: 'Generators',
    toolSlug: 'cron-builder',
    keywords: ['cron expression', 'cron syntax', 'cron examples', 'cron schedule', 'crontab guide', 'cron expression generator'],
    readingTimeMin: 7,
    sections: [
      {
        heading: 'What is a cron expression?',
        body: `A cron expression is a string of fields that defines a schedule for repeating tasks. The name comes from the Unix cron daemon, which reads a crontab file and executes commands at the specified times. Today cron syntax is used far beyond Unix: in Kubernetes CronJobs, AWS EventBridge rules, GitHub Actions workflows, task queues, and cloud functions.`,
      },
      {
        heading: 'The five standard fields',
        body: `A standard cron expression has five space-separated fields:`,
        code: `┌───────────── minute (0–59)
│ ┌─────────────── hour (0–23)
│ │ ┌───────────────── day of month (1–31)
│ │ │ ┌─────────────────── month (1–12)
│ │ │ │ ┌───────────────────── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *`,
        codeLanguage: 'text',
      },
      {
        heading: 'Special characters',
        body: `- \`*\` — any value (wildcard)\n- \`,\` — value list: \`1,15\` means 1st and 15th\n- \`-\` — range: \`9-17\` means every hour from 9 to 17\n- \`/\` — step: \`*/5\` means every 5 units, \`0/15\` means every 15 units starting at 0\n- \`L\` — last (day-of-month or day-of-week) — supported in Quartz/Spring but not standard cron\n- \`?\` — no specific value — used in day-of-month/day-of-week when the other is specified (Quartz/Spring)`,
      },
      {
        heading: 'Common cron expressions with explanations',
        body: `Here are the most frequently used patterns:`,
        code: `# Every minute
* * * * *

# Every 5 minutes
*/5 * * * *

# Every hour at minute 0
0 * * * *

# Every day at midnight
0 0 * * *

# Every day at 9:30 AM
30 9 * * *

# Every Monday at 8 AM
0 8 * * 1

# Every weekday (Mon–Fri) at 6 PM
0 18 * * 1-5

# First day of every month at midnight
0 0 1 * *

# Every 15 minutes
*/15 * * * *

# Twice a day: midnight and noon
0 0,12 * * *

# Every Sunday at 2 AM
0 2 * * 0`,
        codeLanguage: 'bash',
      },
      {
        heading: '6-field cron (with seconds)',
        body: `Many modern schedulers (Quartz, Spring, AWS EventBridge) add a seconds field as the first field, giving six total fields. The second field (0–59) precedes the standard five.`,
        code: `# Quartz/Spring 6-field format (seconds first)
# ┌─────────────── second (0–59)
# │ ┌───────────── minute (0–59)
# │ │ ┌─────────── hour (0–23)
# │ │ │ ┌───────── day of month (1–31)
# │ │ │ │ ┌─────── month (1–12)
# │ │ │ │ │ ┌───── day of week (0–7)
# │ │ │ │ │ │
  0 */5 * * * *    # every 5 minutes exactly at second 0`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Special @strings',
        body: `Many cron implementations support named shortcuts:`,
        code: `@yearly    # = 0 0 1 1 *   — once a year on Jan 1 at midnight
@monthly   # = 0 0 1 * *   — once a month on the 1st at midnight
@weekly    # = 0 0 * * 0   — once a week on Sunday at midnight
@daily     # = 0 0 * * *   — once a day at midnight
@hourly    # = 0 * * * *   — once an hour
@reboot    # — run once at startup (Linux cron only)`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Validating cron expressions',
        body: `Off-by-one errors and ambiguous day-of-week numbering are the most common cron mistakes. Some systems use 0 for Sunday, some use 7, and some accept both. Use an online cron builder to preview the next 10 scheduled runs before deploying. MyDevTools Cron Builder shows a human-readable description ("At 9:30 AM, every Monday") and lists the next occurrences so you can confirm the schedule is exactly what you intend.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between */5 and 0/5 in a cron expression?',
        a: '*/5 means every 5 units starting from the minimum (0). 0/5 explicitly starts at 0. In practice they produce the same result for most fields, but 0/5 is more explicit.',
      },
      {
        q: 'How do I run a cron job every 30 seconds?',
        a: 'Standard 5-field cron has minute precision. To run every 30 seconds, use a 6-field cron scheduler (like Quartz) or schedule two jobs in standard cron: * * * * * cmd && sleep 30 && cmd.',
      },
      {
        q: 'Does cron use UTC or local time?',
        a: "Standard Unix cron uses the system's local timezone. Cloud schedulers (AWS EventBridge, GCP Cloud Scheduler) default to UTC. Always verify the timezone setting in your scheduler to avoid unexpected 1-hour shifts during daylight saving changes.",
      },
      {
        q: 'Why does my cron expression work in one tool but not another?',
        a: 'Different schedulers support different field counts (5 vs 6), different special characters (L, W, #, ?), and different day-of-week numbering. Always check the documentation for the specific scheduler you are using.',
      },
    ],
  },
  {
    slug: 'unix-timestamp-to-date-converter',
    title: 'Unix Timestamp to Date: Converter, Format Guide, and Common Pitfalls',
    description:
      'Learn what Unix timestamps are, how to convert them to human-readable dates in JavaScript, Python, and SQL, and how to avoid the most common timestamp bugs.',
    publishedAt: '2025-12-10',
    category: 'Converters',
    toolSlug: 'timestamp-converter',
    keywords: ['unix timestamp', 'timestamp to date', 'epoch time converter', 'unix time', 'convert timestamp online'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is a Unix timestamp?',
        body: `A Unix timestamp (also called epoch time or POSIX time) is the number of seconds that have elapsed since January 1, 1970 00:00:00 UTC (the Unix epoch). It is a single integer that uniquely identifies any moment in time, making it ideal for storing, transmitting, and comparing datetimes in APIs, databases, and logs.\n\nBecause it is timezone-agnostic (always UTC-based), timestamps avoid the ambiguity of local time strings across regions and daylight saving changes.`,
        code: `// Right now (seconds since epoch)
1716240000

// As a human-readable date (UTC)
// 2024-05-21 00:00:00 UTC`,
        codeLanguage: 'text',
      },
      {
        heading: 'Seconds vs milliseconds',
        body: `The biggest source of timestamp bugs is confusing seconds and milliseconds. Unix timestamps are traditionally in seconds. JavaScript's \`Date.now()\` and many modern APIs return milliseconds. A timestamp of \`1716240000000\` (13 digits) is milliseconds; \`1716240000\` (10 digits) is seconds.\n\nAlways check whether an API returns seconds or milliseconds before storing or displaying a timestamp.`,
        code: `// Seconds (10 digits) — Unix standard
1716240000

// Milliseconds (13 digits) — JavaScript Date.now()
1716240000000

// Rule of thumb
if (timestamp > 1e12) {
  // milliseconds — divide by 1000 for seconds
}`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Converting timestamps in JavaScript',
        body: `JavaScript's Date accepts milliseconds in its constructor. Multiply seconds-based timestamps by 1000 before passing them.`,
        code: `const ts = 1716240000 // seconds

// To Date object
const date = new Date(ts * 1000)

// To ISO string (UTC)
date.toISOString() // "2024-05-21T00:00:00.000Z"

// To locale string (local timezone)
date.toLocaleString() // "5/21/2024, 8:00:00 AM" (varies by locale)

// Current timestamp in seconds
const now = Math.floor(Date.now() / 1000)`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Converting timestamps in Python',
        body: `Python's \`datetime\` module uses the \`fromtimestamp()\` function (local time) or \`utcfromtimestamp()\` (UTC). For timezone-aware datetimes, use \`datetime.fromtimestamp(ts, tz=timezone.utc)\`.`,
        code: `from datetime import datetime, timezone

ts = 1716240000  # seconds

# UTC datetime (naive)
dt_utc = datetime.utcfromtimestamp(ts)
print(dt_utc)  # 2024-05-21 00:00:00

# Timezone-aware (recommended)
dt_aware = datetime.fromtimestamp(ts, tz=timezone.utc)
print(dt_aware)  # 2024-05-21 00:00:00+00:00

# Current Unix timestamp
import time
print(int(time.time()))`,
        codeLanguage: 'python',
      },
      {
        heading: 'Common pitfalls',
        body: `**The year 2038 problem** — 32-bit signed integers overflow at 2^31 - 1 = 2,147,483,647 (January 19, 2038). Modern 64-bit systems are not affected, but legacy embedded systems and old databases using INT(11) columns may be. Migrate to BIGINT for timestamp columns.\n\n**Timezone display errors** — Timestamps are UTC internally. Displaying them requires converting to the user's timezone. Forgetting the conversion means users in different timezones see the wrong local time.\n\n**Daylight saving time** — Timestamps themselves are immune to DST because they are UTC-based. Problems arise when you convert to/from local time without a proper timezone library.\n\n**Floating-point precision** — Never store timestamps as IEEE 754 floats. Use integers (BIGINT in SQL, int in languages). Floats lose precision around the millisecond range for current timestamps.`,
      },
    ],
    faqs: [
      {
        q: 'What is epoch time?',
        a: 'Epoch time is another term for Unix timestamp — the number of seconds elapsed since January 1, 1970, 00:00:00 UTC.',
      },
      {
        q: 'How do I convert a timestamp to a readable date online?',
        a: 'Paste the timestamp into MyDevTools Timestamp Converter and it instantly shows the UTC datetime, local datetime, relative time ("3 days ago"), and ISO 8601 format without any sign-in or install.',
      },
      {
        q: 'Why is my timestamp 1000x too large?',
        a: 'You likely have a millisecond timestamp where seconds are expected. JavaScript Date.now() returns milliseconds. Divide by 1000 to get seconds.',
      },
      {
        q: 'Is Unix time the same in every timezone?',
        a: 'Yes. Unix time is always counted from the UTC epoch, independent of timezone. The same Unix timestamp represents the same absolute moment everywhere on Earth.',
      },
    ],
  },
  {
    slug: 'http-status-codes-guide',
    title: 'HTTP Status Codes Explained: A Developer\'s Reference',
    description:
      'Complete guide to HTTP status codes — 1xx, 2xx, 3xx, 4xx, and 5xx — with explanations, common causes, and how to fix the ones you will encounter most as a developer.',
    publishedAt: '2025-12-15',
    category: 'Network & API',
    toolSlug: 'http-status-codes',
    keywords: ['http status codes', '404 not found', '401 vs 403', '500 internal server error', 'http 200 ok', 'http error codes'],
    readingTimeMin: 8,
    sections: [
      {
        heading: 'The five classes of HTTP status codes',
        body: `HTTP status codes are three-digit numbers grouped into five classes by their first digit:\n\n- **1xx** — Informational: the request is being processed.\n- **2xx** — Success: the request was received, understood, and accepted.\n- **3xx** — Redirection: further action is needed to complete the request.\n- **4xx** — Client error: the request has an error that the client must fix.\n- **5xx** — Server error: the server failed to fulfill a valid request.`,
      },
      {
        heading: '2xx: Success codes',
        body: `**200 OK** — The standard success response. GET requests return 200 with the requested resource. PUT and PATCH may also return 200 with the updated resource.\n\n**201 Created** — A new resource was created. POST requests that create a record should return 201, usually with a Location header pointing to the new resource.\n\n**204 No Content** — The request succeeded but there is no body to return. Used for DELETE and sometimes PUT when the response body would be empty.\n\n**206 Partial Content** — Used for range requests (chunked file downloads, video streaming). The response body contains only the requested byte range.`,
      },
      {
        heading: '3xx: Redirection codes',
        body: `**301 Moved Permanently** — The resource has a new permanent URL. Search engines update their index. Browsers cache the redirect indefinitely. Use for permanent URL changes (HTTP to HTTPS, domain migrations).\n\n**302 Found** — Temporary redirect. Browsers follow it but do not cache it. The original URL is still the canonical one. Often misused when 301 or 307 would be more semantically correct.\n\n**304 Not Modified** — Used with caching. The server tells the client its cached copy is still fresh — no body is returned. Triggered by If-None-Match / If-Modified-Since headers.\n\n**307 Temporary Redirect** — Like 302 but guarantees the method is preserved (a POST stays a POST). Use 307 instead of 302 for non-GET redirects.\n\n**308 Permanent Redirect** — Like 301 but preserves the method. Use instead of 301 when redirecting POST or PUT requests permanently.`,
      },
      {
        heading: '4xx: Client error codes',
        body: `**400 Bad Request** — The server cannot process the request because of a client-side error: malformed syntax, invalid parameters, missing required fields.\n\n**401 Unauthorized** — Authentication is required and was not provided or failed. Despite the name, this means "unauthenticated." Return 401 when no credentials are present or they are invalid.\n\n**403 Forbidden** — The client is authenticated but does not have permission to access the resource. Return 403 when a valid user tries to access something they are not allowed to.\n\n**404 Not Found** — The resource does not exist at the requested URL. Also used intentionally to hide resource existence from unauthorized users.\n\n**405 Method Not Allowed** — The HTTP method is not supported for this endpoint (e.g., sending DELETE to a read-only endpoint). The response must include an Allow header listing supported methods.\n\n**409 Conflict** — The request conflicts with the current state of the resource (e.g., duplicate creation, concurrent edit conflict).\n\n**422 Unprocessable Entity** — The request is syntactically valid but semantically incorrect (e.g., validation errors in an otherwise well-formed JSON body). Widely used by REST APIs for field validation errors.\n\n**429 Too Many Requests** — Rate limit exceeded. The response typically includes a Retry-After header with the wait time.`,
      },
      {
        heading: '5xx: Server error codes',
        body: `**500 Internal Server Error** — A generic catch-all for unhandled server-side exceptions. Check server logs for the root cause — the response body rarely contains the actual error in production.\n\n**502 Bad Gateway** — A proxy or load balancer received an invalid response from an upstream server. Common during deploys when the upstream is momentarily unavailable.\n\n**503 Service Unavailable** — The server is temporarily unable to handle requests (overload, maintenance). Use this with a Retry-After header when you know recovery time.\n\n**504 Gateway Timeout** — The proxy timed out waiting for a response from the upstream server. Often seen during slow database queries or long-running background jobs that exceed the gateway timeout.`,
      },
      {
        heading: '401 vs 403: the key distinction',
        body: `These two are commonly confused:\n\n- **401** = "Who are you?" — no valid authentication credentials were provided.\n- **403** = "I know who you are, but you cannot access this." — authenticated but not authorized.\n\nThe correct code matters for API consumers: 401 tells them to re-authenticate or provide credentials; 403 tells them authentication succeeded but they need different permissions.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between 401 and 403?',
        a: '401 Unauthorized means authentication is required but was not provided or failed. 403 Forbidden means the request is authenticated but the user lacks permission to access the resource.',
      },
      {
        q: 'When should an API return 400 vs 422?',
        a: '400 Bad Request covers malformed syntax, invalid JSON, or missing required headers. 422 Unprocessable Entity is for valid syntax with semantic validation errors (e.g., "email field is required", "age must be a positive integer"). Many APIs use 400 for both.',
      },
      {
        q: 'Why does my API return 200 with an error in the body?',
        a: 'This is an antipattern known as "200 OK with error body." It breaks HTTP semantics and makes it impossible for HTTP clients, load balancers, and monitoring tools to detect failures. Always use the appropriate 4xx or 5xx status code.',
      },
      {
        q: 'What status code should I use for a successful DELETE request?',
        a: '204 No Content if you return no body. 200 OK if you return the deleted resource in the response body. 202 Accepted if deletion is asynchronous and will complete later.',
      },
    ],
  },

  // ── NEW POSTS ──────────────────────────────────────────────────────────────

  {
    slug: 'password-manager-for-developers',
    title: 'Password Manager for Developers: Secure Storage Without a SaaS Subscription',
    description:
      'Learn how developer-focused password managers work, why browser-based encrypted vaults are useful for local credential storage, and how to protect secrets without leaking them.',
    publishedAt: '2026-01-08',
    category: 'Security',
    toolSlug: 'password-manager',
    keywords: ['password manager developer', 'browser password vault', 'secure credential storage', 'encrypted passwords local', 'developer secrets manager'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why developers need a dedicated password manager',
        body: `Developers accumulate secrets faster than almost any other role: database credentials, API keys, staging logins, SSH passphrases, service accounts, .env values, and personal accounts all pile up across projects.\n\nUsing a browser autofill or a sticky note for these is a significant security risk. A proper password manager encrypts credentials at rest with a master password derived key — so even if the storage medium is compromised, the attacker gets ciphertext, not plaintext.`,
      },
      {
        heading: 'How password managers encrypt your data',
        body: `Most password managers use AES-256 encryption with a key derived from the master password using a slow key derivation function (KDF) like PBKDF2, bcrypt, or Argon2. The KDF makes brute-forcing the master password computationally expensive even with modern hardware.\n\nThe encryption and decryption happen on the client — the server (or file) only ever sees ciphertext. This is called zero-knowledge architecture: the service provider cannot decrypt your vault even if subpoenaed.`,
        code: `// Simplified: what happens when you unlock a vault
const masterPassword = "my-strong-passphrase"
const salt = getCryptographicSalt()  // stored alongside ciphertext

// Derive a key — slow by design (100,000+ iterations)
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(masterPassword),
  "PBKDF2",
  false,
  ["deriveKey"]
)
const aesKey = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
  key,
  { name: "AES-GCM", length: 256 },
  false,
  ["decrypt"]
)`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Browser-based vs cloud-synced password managers',
        body: `**Cloud-synced** (1Password, Bitwarden, Dashlane): your encrypted vault is stored on the provider's servers. Sync across devices is automatic. The trade-off is trusting the provider's infrastructure and zero-knowledge claims.\n\n**Local / self-hosted** (KeePass, Bitwarden self-hosted, browser-based vaults): the encrypted file lives on your machine or your own server. No third-party ever holds your ciphertext. Sync requires your own solution (e.g., Syncthing, a personal S3 bucket).\n\n**Browser-based vault tools** like MyDevTools Password Manager store credentials in your browser's encrypted local storage — useful for development credentials, staging tokens, and project-specific secrets that you do not want in a cloud service.`,
      },
      {
        heading: 'Best practices for developer secrets',
        body: `**Use a strong, unique master password** — at least 20 characters, ideally a passphrase. Never reuse it.\n\n**Never commit secrets to git** — use environment variables, .env files (in .gitignore), or a secrets manager like AWS Secrets Manager or HashiCorp Vault for production.\n\n**Rotate credentials after a breach** — if a service is compromised, assume all stored credentials for that service are exposed.\n\n**Separate personal and work vaults** — keep work credentials in an org-controlled manager; personal credentials in your own.\n\n**Enable 2FA on the password manager itself** — your manager is the master key to everything else. Protect it accordingly.`,
      },
      {
        heading: 'When to use a browser-based vault vs a full password manager',
        body: `A browser-based vault is ideal for: development environment credentials you access frequently during a session, staging and test account logins, tool-specific API keys used in the browser, and temporary project secrets.\n\nUse a full cross-device password manager (1Password, Bitwarden) for: personal login credentials, production secrets you need on mobile or multiple machines, and anything that must survive a browser profile wipe.`,
      },
    ],
    faqs: [
      {
        q: 'Is a browser-based password manager safe?',
        a: 'Yes, if the vault is encrypted with AES-256 and a master password before storing locally. The critical requirement is that plaintext credentials never leave the browser — all encryption and decryption must happen client-side.',
      },
      {
        q: 'Should I use a password manager for API keys?',
        a: 'Yes. API keys are credentials. Store them in a password manager or secrets manager rather than in code, config files committed to git, or browser autofill.',
      },
      {
        q: 'What is the difference between a password manager and a secrets manager?',
        a: 'A password manager (1Password, Bitwarden) is optimized for human-facing credentials with a UI for browsing and copying. A secrets manager (AWS Secrets Manager, HashiCorp Vault) is optimized for application-to-application authentication with API access, rotation, and audit logs.',
      },
      {
        q: 'What master password strength should I use?',
        a: 'A passphrase of 4–5 random words (e.g., from a wordlist) gives 50–65 bits of entropy — far stronger than a typical complex 10-character password. Length matters more than character variety for passphrases.',
      },
    ],
  },

  {
    slug: 'how-to-test-rest-api-online',
    title: 'How to Test a REST API Online Without Postman',
    description:
      'Learn how to send API requests, inspect responses, set headers, use authentication tokens, and debug REST endpoints directly in your browser — no desktop install required.',
    publishedAt: '2026-01-15',
    category: 'Network & API',
    toolSlug: 'api-client',
    keywords: ['test rest api online', 'api client browser', 'postman alternative online', 'send http request browser', 'rest api testing tool'],
    readingTimeMin: 7,
    sections: [
      {
        heading: 'Why test APIs directly in the browser',
        body: `Desktop API clients like Postman and Insomnia are powerful for team collaboration, collection management, and test automation. But for quick one-off requests — checking a public endpoint, debugging an auth header, or verifying a payload format — launching a desktop app adds friction.\n\nA browser-based API client lets you send requests immediately without installing anything, switching applications, or maintaining a collection. It is particularly useful when you are already debugging in the browser DevTools or working from a machine where you cannot install software.`,
      },
      {
        heading: 'Anatomy of a REST API request',
        body: `Every HTTP request has four key parts:\n\n**Method** — The verb: GET (fetch), POST (create), PUT (replace), PATCH (update), DELETE (remove).\n\n**URL** — The endpoint, e.g., \`https://api.example.com/users/42\`. May include query parameters: \`?page=1&limit=20\`.\n\n**Headers** — Metadata about the request. Common headers include \`Authorization\`, \`Content-Type\`, \`Accept\`, and custom API headers like \`X-API-Key\`.\n\n**Body** — The request payload for POST/PUT/PATCH. Usually JSON. Must match the \`Content-Type\` header (typically \`application/json\`).`,
        code: `// Example: POST request structure
POST https://api.example.com/users
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}`,
        codeLanguage: 'text',
      },
      {
        heading: 'Authentication types in API testing',
        body: `**Bearer token (JWT)**: Add \`Authorization: Bearer <token>\` as a header. Paste the token from your login response. Use a JWT decoder to inspect the claims and check the expiry before testing.\n\n**API key**: Usually sent as a header (\`X-API-Key: abc123\`) or a query parameter (\`?api_key=abc123\`), depending on the API's convention.\n\n**Basic Auth**: Base64-encoded \`username:password\` in the Authorization header: \`Authorization: Basic dXNlcjpwYXNz\`.\n\n**OAuth 2.0**: Obtain an access token via the token endpoint first, then use it as a Bearer token in subsequent requests.`,
        code: `// Bearer token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// API key in header
X-API-Key: sk_live_abc123xyz

// Basic Auth (base64 of "user:pass")
Authorization: Basic dXNlcjpwYXNz

// Query parameter
GET https://api.example.com/data?api_key=abc123`,
        codeLanguage: 'text',
      },
      {
        heading: 'Reading and debugging API responses',
        body: `A response has three parts:\n\n**Status code** — The three-digit HTTP status (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error). Always check this first — a 200 with an error in the body is an API antipattern.\n\n**Response headers** — Metadata from the server: \`Content-Type\`, \`X-RateLimit-Remaining\`, \`Retry-After\`, caching headers, and correlation IDs for log tracing.\n\n**Response body** — The payload, usually JSON. If it is minified, paste it into a JSON formatter to make it readable before inspecting field values.`,
      },
      {
        heading: 'Common API testing mistakes',
        body: `**Forgetting Content-Type** — POST/PUT requests with a JSON body must include \`Content-Type: application/json\`. Without it, many servers reject or misparse the body.\n\n**Sending expired tokens** — JWT access tokens expire (typically 15 minutes to 1 hour). Decode the token and check the \`exp\` claim before a test run.\n\n**Trailing slashes** — Some APIs treat \`/users\` and \`/users/\` differently. Check the API documentation.\n\n**Case-sensitive headers** — HTTP/2 requires lowercase headers. Some API gateways normalize these; others do not. Use lowercase when in doubt.\n\n**Ignoring CORS errors** — CORS is a browser security restriction, not a server-side API error. If you get a CORS error in the browser, the request may succeed from a server-side client (curl, Node). Check whether the API allows browser origins.`,
      },
      {
        heading: 'Testing with curl vs a browser API client',
        body: `curl is ideal for scripting, CI pipelines, and reproducing requests in documentation. A browser API client is faster for interactive exploration, header autocompletion, and working alongside other browser tools.\n\nMyDevTools API Client runs entirely in the browser, supports GET/POST/PUT/PATCH/DELETE, custom headers, authentication, JSON body editing, and shows the formatted response and status side by side.`,
        code: `# Equivalent curl command for the browser request
curl -X POST https://api.example.com/users \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice","email":"alice@example.com"}'`,
        codeLanguage: 'bash',
      },
    ],
    faqs: [
      {
        q: 'What is the difference between REST and GraphQL API testing?',
        a: 'REST uses multiple endpoints with specific HTTP methods. GraphQL uses a single endpoint (usually POST) with a query or mutation in the body. For GraphQL, use the GraphQL Formatter to write and validate queries, then send them via an API client.',
      },
      {
        q: 'Can I test APIs that require OAuth 2.0 in a browser API client?',
        a: 'Yes, if you manually obtain the access token first (via the token endpoint or a browser-based OAuth flow) and paste it into the Authorization header.',
      },
      {
        q: 'Why does my API request work in curl but fail in the browser?',
        a: 'Most likely a CORS issue. The browser blocks cross-origin requests if the server does not include the appropriate Access-Control-Allow-Origin header. This is a browser security policy, not an API error.',
      },
      {
        q: 'How do I test a paginated API?',
        a: 'Send the first request and check the response for pagination metadata (next page URL, cursor, or total pages). Then modify the query parameter (page=2, cursor=abc) and repeat. An API client makes this faster than curl for interactive exploration.',
      },
    ],
  },

  {
    slug: 'mongodb-browser-client-guide',
    title: 'How to Browse and Query MongoDB Online Without Installing a Client',
    description:
      'Connect to a MongoDB database, browse collections, run queries, and inspect documents directly in your browser. Learn the basics of NoSQL document querying.',
    publishedAt: '2026-01-22',
    category: 'Database',
    toolSlug: 'database-explorer',
    keywords: ['mongodb browser client', 'database explorer online', 'query mongodb online', 'mongodb gui browser', 'browse mongodb collections'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is a NoSQL database browser?',
        body: `A NoSQL database browser is a GUI or web interface that lets you connect to a document database (like MongoDB), explore its structure, and run queries without a local client installation.\n\nFor MongoDB specifically, the traditional options are the mongo shell, MongoDB Compass (desktop app), or Atlas UI (cloud-only). A browser-based NoSQL explorer is useful when you are on a machine without Compass installed, connecting to a shared staging database, or debugging a quick data issue during development.`,
      },
      {
        heading: 'MongoDB data model: databases, collections, documents',
        body: `MongoDB organizes data in three layers:\n\n**Database** — Top-level container, similar to a database in SQL. One MongoDB server hosts multiple databases.\n\n**Collection** — Equivalent to a SQL table. A database holds multiple collections. Collections do not enforce a schema by default.\n\n**Document** — The actual data record, stored as BSON (Binary JSON). Documents in the same collection can have different fields. Each document has an auto-generated \`_id\` field (ObjectId) that acts as the primary key.`,
        code: `// Example MongoDB document
{
  "_id": { "$oid": "507f1f77bcf86cd799439011" },
  "username": "alice",
  "email": "alice@example.com",
  "roles": ["admin", "editor"],
  "createdAt": { "$date": "2024-01-15T10:30:00Z" },
  "profile": {
    "firstName": "Alice",
    "lastName": "Smith"
  }
}`,
        codeLanguage: 'json',
      },
      {
        heading: 'Basic MongoDB query syntax',
        body: `MongoDB queries use a JSON-like filter syntax. The \`find()\` method accepts a filter object and an optional projection.`,
        code: `// Find all documents in a collection
db.users.find({})

// Find by exact match
db.users.find({ "username": "alice" })

// Find with comparison operators
db.users.find({ "age": { "$gt": 18 } })          // greater than
db.users.find({ "score": { "$gte": 90, "$lte": 100 } }) // between

// Find where array field contains a value
db.users.find({ "roles": "admin" })

// Projection: return only specific fields (1=include, 0=exclude)
db.users.find({ "active": true }, { "username": 1, "email": 1, "_id": 0 })

// Limit and sort
db.users.find({}).sort({ "createdAt": -1 }).limit(10)`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'MongoDB query operators cheat sheet',
        body: `**Comparison**: \`$eq\`, \`$ne\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\`\n\n**Array**: \`$in\`, \`$nin\`, \`$all\`, \`$elemMatch\`, \`$size\`\n\n**Logical**: \`$and\`, \`$or\`, \`$not\`, \`$nor\`\n\n**Element**: \`$exists\`, \`$type\`\n\n**Text**: \`$regex\` for pattern matching\n\n**Update**: \`$set\`, \`$unset\`, \`$push\`, \`$pull\`, \`$inc\`, \`$addToSet\``,
        code: `// $in: match any value in array
db.users.find({ "status": { "$in": ["active", "pending"] } })

// $exists: only return documents that have the field
db.users.find({ "phone": { "$exists": true } })

// $regex: pattern match (slow without index)
db.users.find({ "email": { "$regex": "@example.com$" } })

// $and: multiple conditions
db.users.find({
  "$and": [
    { "age": { "$gte": 18 } },
    { "active": true }
  ]
})`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Connecting to MongoDB securely',
        body: `Always use connection strings with authentication. MongoDB connection strings follow the format:\n\n\`mongodb://username:password@host:27017/dbname\`\n\nOr with SRV (Atlas/cloud):\n\n\`mongodb+srv://username:password@cluster.mongodb.net/dbname\`\n\nFor a browser-based NoSQL explorer, the connection is made through the server-side proxy to avoid exposing credentials in the browser. Only connect to databases you own or have explicit authorization to access.`,
        code: `// Standard connection string
mongodb://admin:secretpassword@localhost:27017/myapp

// MongoDB Atlas (cloud)
mongodb+srv://user:pass@cluster0.abc123.mongodb.net/myapp

// With options
mongodb://user:pass@host:27017/db?authSource=admin&ssl=true`,
        codeLanguage: 'text',
      },
    ],
    faqs: [
      {
        q: 'Is it safe to use a browser-based MongoDB client?',
        a: 'Use one where the connection is proxied server-side and credentials are not stored in the browser. MyDevTools NoSQL Explorer connects through a backend proxy — your connection string is not exposed in browser storage or network requests.',
      },
      {
        q: 'What is the difference between MongoDB and SQL databases?',
        a: 'SQL databases use tables with a fixed schema, rows, and columns. MongoDB stores flexible JSON-like documents in collections with no enforced schema. SQL uses JOIN for relations; MongoDB typically embeds related data in the document or uses application-level references.',
      },
      {
        q: 'How do I run an aggregation pipeline in a browser-based MongoDB client?',
        a: 'An aggregation pipeline is a series of stages ($match, $group, $sort, $project, $lookup) that transform documents. In a browser client that supports raw query input, you can enter the pipeline array directly.',
      },
      {
        q: 'Does MongoDB have transactions?',
        a: 'Yes, since MongoDB 4.0. Multi-document transactions work across collections and databases in replica sets. However, for many use cases, embedding related data in a single document avoids the need for transactions.',
      },
    ],
  },

  {
    slug: 'how-to-format-sql-online',
    title: 'How to Format and Beautify SQL Queries Online',
    description:
      'Format messy SQL into readable, indented queries instantly in the browser. Learn SQL formatting conventions, when to use uppercase keywords, and how formatting helps catch bugs.',
    publishedAt: '2026-01-29',
    category: 'Formatters',
    toolSlug: 'sql-formatter',
    keywords: ['format sql online', 'sql formatter', 'sql beautifier', 'sql pretty print', 'sql query formatter free'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Why SQL formatting matters',
        body: `SQL queries received from application logs, ORMs, or copy-pasted snippets are often a single line with no indentation. A 10-table JOIN with 15 conditions on one line is effectively unreadable.\n\nFormatting adds consistent indentation, line breaks at clause boundaries, and alignment that reveals query structure at a glance. A well-formatted query is faster to debug, easier to review in pull requests, and simpler to extend.`,
      },
      {
        heading: 'SQL formatting conventions',
        body: `There is no single official SQL style guide, but these conventions are widely adopted:\n\n**Uppercase keywords** — \`SELECT\`, \`FROM\`, \`WHERE\`, \`JOIN\`, \`GROUP BY\`, \`ORDER BY\`, \`HAVING\` in uppercase to distinguish them from column and table names.\n\n**Each major clause on its own line** — \`SELECT\`, \`FROM\`, \`WHERE\`, \`JOIN\`, and \`GROUP BY\` start at the left margin or with consistent indentation.\n\n**Column lists indented** — Each selected column on its own line, indented under \`SELECT\`.\n\n**JOIN conditions aligned** — The \`ON\` clause indented below its \`JOIN\`.`,
        code: `-- Unformatted
select u.id,u.name,o.total from users u join orders o on u.id=o.user_id where o.total>100 order by o.total desc limit 20

-- Formatted
SELECT
  u.id,
  u.name,
  o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100
ORDER BY o.total DESC
LIMIT 20;`,
        codeLanguage: 'sql',
      },
      {
        heading: 'How SQL formatting helps catch bugs',
        body: `Formatting reveals structure that is invisible in a single-line query:\n\n- Misplaced parentheses in complex WHERE conditions become obvious when each condition is on its own line.\n- Missing JOIN conditions stand out when each JOIN is its own block.\n- Accidental Cartesian products (JOINs without ON) are immediately visible.\n- Subqueries nested incorrectly show clearly when indented.\n\nA formatter that also validates syntax catches errors before the query ever reaches the database.`,
        code: `-- Bug hidden in a single line
SELECT * FROM a JOIN b WHERE b.val = 1  -- missing ON clause = cartesian product

-- Bug obvious when formatted
SELECT *
FROM a
JOIN b          -- ← missing ON clause clearly visible
WHERE b.val = 1`,
        codeLanguage: 'sql',
      },
      {
        heading: 'SQL dialects: MySQL, PostgreSQL, SQL Server, BigQuery',
        body: `SQL keywords are standardized in ANSI SQL, but each database has dialect-specific syntax. A good SQL formatter supports multiple dialects:\n\n- **MySQL**: backtick identifiers, \`LIMIT\`/\`OFFSET\`, \`AUTO_INCREMENT\`.\n- **PostgreSQL**: double-quoted identifiers, \`SERIAL\`, \`RETURNING\`, \`ILIKE\`, dollar-quoted strings.\n- **SQL Server**: bracket identifiers (\`[table]\`), \`TOP\`, \`NOLOCK\`, \`NVARCHAR\`.\n- **BigQuery**: backtick identifiers, \`ARRAY\`, \`STRUCT\`, \`UNNEST\`.\n\nMyDevTools SQL Formatter supports MySQL, PostgreSQL, SQL Server, and other dialects — specify the dialect to get accurate formatting for dialect-specific keywords.`,
      },
    ],
    faqs: [
      {
        q: 'Does SQL formatting affect query performance?',
        a: 'No. Formatting is purely cosmetic — the database engine receives the same logical query regardless of whitespace and capitalization. Performance is determined by query structure, indexes, and statistics, not formatting.',
      },
      {
        q: 'Should SQL keywords be uppercase?',
        a: 'By strong convention, yes. Most style guides and linters use uppercase keywords. It visually separates SQL keywords from identifiers (table and column names) and makes queries scannable.',
      },
      {
        q: 'Can I format a stored procedure with a SQL formatter?',
        a: 'Most formatters handle the SQL body of stored procedures, but the DDL wrapper (CREATE PROCEDURE ... BEGIN ... END) may need manual adjustment depending on dialect complexity.',
      },
      {
        q: 'What is the difference between a SQL formatter and a SQL linter?',
        a: 'A formatter applies style: indentation, keyword casing, line breaks. A linter checks for logic errors, anti-patterns (SELECT *, implicit conversions, missing indexes), and enforces naming conventions. Tools like SQLFluff combine both.',
      },
    ],
  },

  {
    slug: 'docker-compose-guide-with-examples',
    title: 'Docker Compose Guide: Syntax, Examples, and Common Patterns',
    description:
      'Learn Docker Compose file syntax field by field. Covers services, networks, volumes, environment variables, health checks, and real-world multi-container patterns.',
    publishedAt: '2026-02-05',
    category: 'Generators',
    toolSlug: 'docker-compose-generator',
    keywords: ['docker compose', 'docker-compose.yml', 'docker compose examples', 'docker compose syntax', 'multi container docker', 'docker compose tutorial'],
    readingTimeMin: 8,
    sections: [
      {
        heading: 'What is Docker Compose?',
        body: `Docker Compose is a tool for defining and running multi-container applications from a single YAML file (\`docker-compose.yml\` or \`compose.yml\`). Instead of running multiple \`docker run\` commands with ports, volumes, networks, and environment variables, you declare all services in one file and start everything with \`docker compose up\`.\n\nCompose is the standard for local development environments: spin up a web app, database, cache, and message broker with one command, and tear them all down with one command.`,
      },
      {
        heading: 'Basic docker-compose.yml structure',
        body: `A Compose file has four top-level keys: \`services\`, \`networks\`, \`volumes\`, and \`configs\`. The most used is \`services\`.`,
        code: `services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./static:/usr/share/nginx/html:ro
    depends_on:
      - api

  api:
    build: ./api          # build from local Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db_data:`,
        codeLanguage: 'yaml',
      },
      {
        heading: 'Services: the core building block',
        body: `Each key under \`services\` is a container definition. Key fields:\n\n- \`image\`: Docker Hub image name and tag.\n- \`build\`: path to a directory with a Dockerfile, or a build config object.\n- \`ports\`: host:container port mapping. \`"8080:80"\` exposes container port 80 on host port 8080.\n- \`environment\`: env vars as a list (\`- KEY=value\`) or map (\`KEY: value\`).\n- \`volumes\`: bind mounts (\`./local:container\`) or named volumes.\n- \`depends_on\`: start order. With \`condition: service_healthy\`, waits for the healthcheck.\n- \`restart\`: \`no\` (default), \`always\`, \`on-failure\`, \`unless-stopped\`.`,
      },
      {
        heading: 'Environment variables and .env files',
        body: `Compose automatically reads a \`.env\` file in the same directory and substitutes \`\${VARIABLE}\` references in the Compose file. Never hard-code secrets in \`docker-compose.yml\` committed to git.`,
        code: `# .env file (never commit to git)
POSTGRES_PASSWORD=supersecret
API_SECRET_KEY=myapikey

# docker-compose.yml references
services:
  db:
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
  api:
    environment:
      SECRET_KEY: \${API_SECRET_KEY}`,
        codeLanguage: 'yaml',
      },
      {
        heading: 'Networks: service-to-service communication',
        body: `By default, Compose creates a single \`default\` network and all services join it. Services reach each other by service name — \`api\` can connect to \`db\` using the hostname \`db\`.\n\nFor isolation, define custom networks. A service can join multiple networks.`,
        code: `services:
  web:
    networks: [frontend]
  api:
    networks: [frontend, backend]
  db:
    networks: [backend]

networks:
  frontend:
  backend:
    internal: true   # not reachable from host`,
        codeLanguage: 'yaml',
      },
      {
        heading: 'Common real-world patterns',
        body: `**Web + Database**: nginx/Caddy as reverse proxy, Node/Python/Go API, PostgreSQL or MySQL. The API uses the DB service name as hostname.\n\n**Web + Cache**: Same as above plus Redis as the cache service. The API connects to \`redis:6379\`.\n\n**Full stack**: Frontend (React/Next.js), backend API, database, Redis, background worker (Celery/BullMQ) — all defined as separate services with shared networks and a volume for the database.\n\n**Overrides**: Use \`docker-compose.override.yml\` for local dev customizations (bind mounts, debug ports) without modifying the base file.`,
      },
      {
        heading: 'Essential Compose commands',
        body: ``,
        code: `# Start all services (detached)
docker compose up -d

# Start and rebuild images
docker compose up -d --build

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove containers + volumes
docker compose down -v

# View logs (follow)
docker compose logs -f api

# Run a one-off command in a service container
docker compose exec api sh

# Scale a service to 3 replicas
docker compose up -d --scale worker=3`,
        codeLanguage: 'bash',
      },
    ],
    faqs: [
      {
        q: 'What is the difference between docker-compose and docker compose?',
        a: 'docker-compose (with a hyphen) is the older standalone Python binary (Compose v1). docker compose (space) is the newer Go plugin bundled with Docker Desktop and Docker Engine 20.10+ (Compose v2). Compose v2 is the current standard; v1 is deprecated.',
      },
      {
        q: 'How do I make one service wait for another to be ready?',
        a: 'Use depends_on with condition: service_healthy, and add a healthcheck to the dependency. Without a healthcheck, depends_on only waits for the container to start, not for the service inside to be ready.',
      },
      {
        q: 'Should I use Docker Compose in production?',
        a: 'Compose is designed for local development and single-host deployments. For multi-host production workloads, use Kubernetes, Docker Swarm, or a managed container service (ECS, Cloud Run). Compose is fine for small self-hosted apps on a single server.',
      },
      {
        q: 'What is the difference between volumes and bind mounts in Compose?',
        a: 'Named volumes (db_data:) are managed by Docker and persist data between container restarts independent of host paths. Bind mounts (./local:/container) sync a host directory into the container — used for live code reloading in development.',
      },
    ],
  },

  {
    slug: 'totp-two-factor-authentication-explained',
    title: 'TOTP Explained: How Time-Based One-Time Passwords Work',
    description:
      'Understand how TOTP (Time-Based One-Time Passwords) generate 6-digit 2FA codes, the cryptography behind them, how to implement TOTP, and how to generate test codes online.',
    publishedAt: '2026-02-12',
    category: 'Security',
    toolSlug: 'totp-generator',
    keywords: ['totp', 'time-based one-time password', 'how totp works', 'totp 2fa', 'totp implementation', 'totp generator online', 'authenticator app how it works'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is TOTP?',
        body: `TOTP (Time-Based One-Time Password) is the algorithm behind authenticator apps like Google Authenticator, Authy, and 1Password. It generates a new 6-digit code every 30 seconds using a shared secret and the current time.\n\nTOTP is defined in RFC 6238 and is built on top of HOTP (HMAC-Based One-Time Password, RFC 4226). It is a cornerstone of modern two-factor authentication (2FA) — even if an attacker captures your TOTP code, it expires in 30 seconds and is useless afterward.`,
      },
      {
        heading: 'How TOTP works: step by step',
        body: `1. **Setup**: The server generates a random secret key (typically 20 bytes, Base32-encoded). This secret is shared with the user via a QR code or manual entry into an authenticator app.\n\n2. **Time step**: TOTP divides Unix time into 30-second windows: \`T = floor(currentTime / 30)\`.\n\n3. **HMAC**: Compute \`HMAC-SHA1(secret, T)\`. The secret is the key; T is the 8-byte big-endian message.\n\n4. **Dynamic truncation**: Take the last byte of the HMAC, use its low 4 bits as an offset, and read 4 bytes starting at that offset.\n\n5. **Code**: Apply a bitmask and compute \`result mod 10^6\` to get a 6-digit code.\n\nBoth the authenticator app and the server perform this calculation independently. If they arrive at the same code (within a 1-window tolerance), authentication succeeds.`,
        code: `// TOTP in Node.js (simplified)
import { createHmac } from "crypto"

function generateTOTP(secret: string, digits = 6, period = 30): string {
  const key = Buffer.from(secret, "base32")
  const counter = Math.floor(Date.now() / 1000 / period)

  // Counter as 8-byte big-endian buffer
  const msg = Buffer.alloc(8)
  msg.writeBigInt64BE(BigInt(counter))

  const hmac = createHmac("sha1", key).update(msg).digest()

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits

  return code.toString().padStart(digits, "0")
}`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'The QR code and secret key',
        body: `When you scan a QR code to add an account to an authenticator app, the QR code encodes a \`otpauth://\` URI:\n\n\`otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp&algorithm=SHA1&digits=6&period=30\`\n\nThe secret is a Base32-encoded random byte string. The issuer and account name are display labels only — they do not affect code generation. The secret is what must be kept secure: anyone with the secret can generate valid TOTP codes.`,
        code: `# Example otpauth URI
otpauth://totp/GitHub:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub

# Fields:
# type:   totp (time-based)
# label:  GitHub:alice@example.com (display only)
# secret: JBSWY3DPEHPK3PXP (Base32-encoded shared secret)
# issuer: GitHub (display only)`,
        codeLanguage: 'text',
      },
      {
        heading: 'TOTP vs HOTP: what is the difference?',
        body: `**HOTP** (HMAC-Based OTP): uses a counter instead of time. The counter increments with each use. Codes do not expire — they are only valid once. Requires synchronizing the counter between server and client, which causes drift issues.\n\n**TOTP** (Time-Based OTP): uses the current time divided into 30-second windows instead of a counter. Codes expire automatically. More widely adopted because it does not require counter synchronization — just clock synchronization (NTP handles this automatically).`,
      },
      {
        heading: 'Security considerations',
        body: `**Protect the secret**: the shared secret is equivalent to a password. Store it encrypted at rest. Never log it.\n\n**Clock drift**: TOTP servers typically accept codes from the current window and one window on either side (±30 seconds) to tolerate minor clock drift.\n\n**Backup codes**: always provide backup codes when setting up TOTP. If a user loses their authenticator device, backup codes are the recovery path.\n\n**Phishing**: TOTP does not protect against real-time phishing (attacker proxies the code immediately). Passkeys (WebAuthn) are phishing-resistant; TOTP is not.\n\n**SMS 2FA vs TOTP**: SMS-based 2FA is weaker than TOTP because SMS can be intercepted via SIM swapping. Prefer TOTP authenticator apps over SMS.`,
      },
    ],
    faqs: [
      {
        q: 'Why do TOTP codes expire after 30 seconds?',
        a: 'The 30-second window is a design choice from RFC 6238 that balances usability (enough time to read and type the code) with security (short enough that intercepted codes are quickly useless).',
      },
      {
        q: 'Can I use TOTP for my own application?',
        a: 'Yes. Libraries exist for all major languages (speakeasy for Node.js, pyotp for Python, otplib for TypeScript). Generate a secret, show it as a QR code, verify codes server-side. The MyDevTools TOTP Generator can generate test codes from a secret for development and debugging.',
      },
      {
        q: 'What happens if I lose my TOTP device?',
        a: 'You need backup codes (which you should have saved during setup) or an account recovery process. This is why providing and storing backup codes is essential when implementing TOTP-based 2FA.',
      },
      {
        q: 'Is TOTP the same as the codes from Google Authenticator?',
        a: 'Yes. Google Authenticator, Authy, Microsoft Authenticator, and similar apps all implement RFC 6238 TOTP. The codes are interchangeable — you can use any compliant authenticator app with any TOTP-supporting service.',
      },
    ],
  },

  {
    slug: 'ip-subnet-calculator-guide',
    title: 'IP Subnet Calculator: CIDR Notation, Subnet Masks, and Network Ranges Explained',
    description:
      'Learn how IP subnetting works, how to read CIDR notation, calculate usable host ranges, and why subnetting matters for VPC design, firewalls, and network architecture.',
    publishedAt: '2026-02-19',
    category: 'Network & API',
    toolSlug: 'ip-subnet-calculator',
    keywords: ['subnet calculator', 'cidr notation', 'ip subnet', 'subnet mask', 'network range calculator', 'vpc subnet', 'how to subnet'],
    readingTimeMin: 7,
    sections: [
      {
        heading: 'What is a subnet?',
        body: `A subnet (subnetwork) is a logical division of an IP address space. Instead of one flat network where every device can reach every other device, subnetting divides the address space into smaller, isolated ranges. Each subnet has a network address, a broadcast address, and a range of usable host addresses.\n\nSubnetting is fundamental to VPC design in cloud providers (AWS, GCP, Azure), firewall rules, private network architecture, and understanding routing.`,
      },
      {
        heading: 'CIDR notation explained',
        body: `CIDR (Classless Inter-Domain Routing) notation combines an IP address with a prefix length: \`192.168.1.0/24\`.\n\nThe prefix length (after the slash) indicates how many bits of the 32-bit IP address are the network portion. The remaining bits are the host portion.\n\n- \`/24\` = 24 network bits, 8 host bits → 256 addresses (254 usable)\n- \`/16\` = 16 network bits, 16 host bits → 65,536 addresses (65,534 usable)\n- \`/32\` = 32 network bits, 0 host bits → single host (no subnetting)\n- \`/0\` = 0 network bits → entire internet`,
        code: `192.168.1.0/24

IP:     192.168.1.0    = 11000000.10101000.00000001.00000000
Mask:   255.255.255.0  = 11111111.11111111.11111111.00000000
                                                    └─ host bits (8)

Network address:   192.168.1.0   (first address)
Broadcast address: 192.168.1.255 (last address)
Usable hosts:      192.168.1.1 – 192.168.1.254 (254 hosts)`,
        codeLanguage: 'text',
      },
      {
        heading: 'Subnet mask reference table',
        body: ``,
        code: `CIDR  Subnet Mask       Hosts    Usable Hosts
/8    255.0.0.0         16777216   16777214
/16   255.255.0.0       65536      65534
/24   255.255.255.0     256        254
/25   255.255.255.128   128        126
/26   255.255.255.192   64         62
/27   255.255.255.224   32         30
/28   255.255.255.240   16         14
/29   255.255.255.248   8          6
/30   255.255.255.252   4          2
/31   255.255.255.254   2          2 (point-to-point, RFC 3021)
/32   255.255.255.255   1          1 (single host)`,
        codeLanguage: 'text',
      },
      {
        heading: 'Calculating subnets: practical examples',
        body: `**Example 1**: You have \`10.0.0.0/16\` and need to split into 4 equal subnets.\n\nBorrow 2 bits from the host portion: /16 → /18. Four subnets:\n- \`10.0.0.0/18\` (10.0.0.0 – 10.0.63.255)\n- \`10.0.64.0/18\` (10.0.64.0 – 10.0.127.255)\n- \`10.0.128.0/18\` (10.0.128.0 – 10.0.191.255)\n- \`10.0.192.0/18\` (10.0.192.0 – 10.0.255.255)\n\n**Example 2**: AWS VPC default is \`172.31.0.0/16\`. Default subnets are /20 each, giving 4,096 addresses (4,091 usable — AWS reserves 5 per subnet) per AZ.`,
      },
      {
        heading: 'Private IP ranges (RFC 1918)',
        body: `Three IP ranges are reserved for private networks and are not routable on the public internet:\n\n- \`10.0.0.0/8\` — 16.7 million addresses. Used for large enterprise networks and cloud VPCs.\n- \`172.16.0.0/12\` — 1 million addresses (172.16.0.0 – 172.31.255.255). Docker uses 172.17.0.0/16 by default.\n- \`192.168.0.0/16\` — 65,536 addresses. Used by home routers, small office networks.`,
        code: `# Quick check: is an IP private?
10.0.0.0    – 10.255.255.255   → private (10.0.0.0/8)
172.16.0.0  – 172.31.255.255   → private (172.16.0.0/12)
192.168.0.0 – 192.168.255.255  → private (192.168.0.0/16)
127.0.0.0   – 127.255.255.255  → loopback
169.254.0.0 – 169.254.255.255  → link-local (APIPA)`,
        codeLanguage: 'text',
      },
      {
        heading: 'Subnetting in cloud VPCs',
        body: `When designing AWS VPC subnets:\n\n- Use \`/16\` for the VPC (65,536 addresses — plenty to grow).\n- Use \`/24\` per subnet per AZ (254 usable — typical for app tiers).\n- Separate public subnets (internet-facing load balancers) from private subnets (app servers) from isolated subnets (databases).\n- Plan for future expansion — IP address space is cheap; re-subnetting a production VPC is painful.\n- AWS reserves 5 IP addresses per subnet (first 4 and last 1), so a /28 gives only 11 usable hosts.`,
      },
    ],
    faqs: [
      {
        q: 'What does /24 mean in an IP address?',
        a: '/24 is CIDR notation meaning 24 bits are the network prefix. This leaves 8 bits for hosts: 2^8 = 256 addresses, of which 254 are usable (network and broadcast addresses are reserved).',
      },
      {
        q: 'What is the difference between a subnet mask and CIDR notation?',
        a: 'They represent the same thing in different formats. /24 and 255.255.255.0 are equivalent — both indicate that the first 24 bits identify the network and the last 8 bits are for hosts.',
      },
      {
        q: 'How many hosts fit in a /28 subnet?',
        a: '2^(32-28) = 16 addresses, minus 2 (network and broadcast) = 14 usable hosts. In AWS, subtract 5 reserved addresses → 11 usable.',
      },
      {
        q: 'What is a supernet?',
        a: 'A supernet combines multiple smaller subnets into a larger block using a shorter prefix. /23 is a supernet of two /24 subnets. Used for route summarization to reduce routing table size.',
      },
    ],
  },

  {
    slug: 'mock-data-generation-guide',
    title: 'Mock Data Generation: Strategies, Tools, and Best Practices for Testing',
    description:
      'Learn how to generate realistic fake data for development and testing: names, emails, dates, UUIDs, addresses, and structured records — without using real user data.',
    publishedAt: '2026-02-26',
    category: 'Generators',
    toolSlug: 'mock-data-generator',
    keywords: ['mock data generator', 'fake data for testing', 'generate test data', 'faker js', 'synthetic data', 'seed database testing'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why use mock data instead of real data',
        body: `Using production data in development and testing environments creates serious privacy, legal, and security risks. Real user data exposed in a dev environment violates GDPR, CCPA, and most privacy policies. A single misconfigured environment variable can leak it publicly.\n\nMock (fake) data that is structurally identical to real data solves this: developers can work with realistic records, seed databases, test UI edge cases, and run integration tests without ever touching a real user's information.`,
      },
      {
        heading: 'What to generate: common data types',
        body: `**Identity**: first name, last name, username, email address, phone number, avatar URL.\n\n**Location**: street address, city, state, country, postal code, latitude/longitude.\n\n**Finance**: credit card number (test ranges only), IBAN, currency amount, company name.\n\n**Internet**: URL, domain, IP address, user agent string, password.\n\n**Dates and times**: birthdate, created_at, event timestamp, ISO 8601 strings.\n\n**Identifiers**: UUID v4, ULID, sequential ID, SKU, order number.\n\n**Content**: lorem ipsum paragraphs, sentences, words — useful for seeding blog posts, comments, or descriptions.`,
      },
      {
        heading: 'Mock data in code: Faker.js',
        body: `Faker.js (@faker-js/faker) is the most popular JavaScript/TypeScript library for generating mock data. It supports 50+ locales for realistic locale-specific data.`,
        code: `import { faker } from "@faker-js/faker"

// Generate a single user record
const user = {
  id: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  avatar: faker.image.avatar(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    country: faker.location.country(),
    zip: faker.location.zipCode(),
  },
  createdAt: faker.date.past({ years: 2 }).toISOString(),
}

// Generate 100 users
const users = Array.from({ length: 100 }, () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
}))`,
        codeLanguage: 'typescript',
      },
      {
        heading: 'Seeding: reproducible mock data',
        body: `By default, Faker generates random data on each run — so test assertions that depend on specific values will fail. Use a seed to make generation deterministic: the same seed always produces the same sequence of values.`,
        code: `import { faker } from "@faker-js/faker"

// Seeded — same output every run
faker.seed(12345)
console.log(faker.person.firstName()) // always the same name

// Reset seed for a fresh sequence
faker.seed()`,
        codeLanguage: 'typescript',
      },
      {
        heading: 'Database seeding patterns',
        body: `**Development seeding**: populate a local database with realistic records to develop against. Run a seed script on \`npm run dev:setup\` or before tests.\n\n**Factory pattern**: define a factory function per model. Compose factories for related records (a user factory that creates associated orders).\n\n**Fixtures**: static JSON or SQL files with known data. Used for specific test scenarios where exact values matter (e.g., testing boundary conditions).\n\n**Online generators**: useful for one-off needs — generate 50 user records as JSON, paste into Postman or a database client. MyDevTools Mock Data Generator produces JSON, CSV, or SQL INSERT statements ready to use.`,
        code: `// Factory pattern example
function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    role: "user",
    active: true,
    ...overrides,           // caller can override any field
  }
}

// Specific test scenarios
const adminUser = createUser({ role: "admin" })
const inactiveUser = createUser({ active: false })
const bulkUsers = Array.from({ length: 50 }, () => createUser())`,
        codeLanguage: 'typescript',
      },
    ],
    faqs: [
      {
        q: 'What is the difference between mock data and test fixtures?',
        a: 'Mock data is randomly generated to simulate realistic inputs — good for volume testing and UI development. Fixtures are static, known data sets used when exact values matter for specific test assertions.',
      },
      {
        q: 'Is it safe to use fake credit card numbers for testing?',
        a: 'Faker generates structurally valid-looking numbers that pass Luhn checksum but are not real card numbers. Use them only in internal dev/test environments. Payment providers like Stripe have official test card numbers — use those for payment integration testing.',
      },
      {
        q: 'How do I generate mock data that matches my database schema?',
        a: 'Define a factory function per model that generates all required fields with the right types. MyDevTools Mock Data Generator lets you define field names, types, and counts to match a specific schema structure.',
      },
      {
        q: 'Can I generate mock data in CSV or SQL format?',
        a: 'Yes. MyDevTools Mock Data Generator outputs JSON, CSV (ready for spreadsheet or database import), and SQL INSERT statements for directly seeding a database table.',
      },
    ],
  },

  {
    slug: 'hmac-explained-api-authentication',
    title: 'HMAC Explained: How to Sign API Requests and Verify Webhook Signatures',
    description:
      'Learn what HMAC is, how HMAC-SHA256 works, how to sign HTTP requests with a secret key, and how to verify webhook signatures from services like Stripe and GitHub.',
    publishedAt: '2026-03-05',
    category: 'Security',
    toolSlug: 'hmac-generator',
    keywords: ['hmac', 'hmac sha256', 'hmac api authentication', 'webhook signature verification', 'sign http request', 'hmac generator online'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is HMAC?',
        body: `HMAC (Hash-based Message Authentication Code) is a mechanism for verifying both the integrity and authenticity of a message using a shared secret key and a hash function.\n\nUnlike a plain hash (SHA-256 of the message), an HMAC binds the hash to a secret key. Only someone who knows the secret can produce a valid HMAC for a given message. This makes it suitable for API request signing, webhook verification, and session tokens.`,
      },
      {
        heading: 'How HMAC works',
        body: `HMAC is defined as:\n\n\`HMAC(key, message) = H((key ⊕ opad) || H((key ⊕ ipad) || message))\`\n\nWhere H is the hash function (SHA-256, SHA-512, etc.), opad and ipad are fixed padding constants, and ⊕ is XOR. In practice you never implement this yourself — use a standard crypto library.`,
        code: `// Node.js
import { createHmac } from "crypto"

const secret = "my-webhook-secret"
const payload = JSON.stringify({ event: "payment.completed", amount: 4999 })

const signature = createHmac("sha256", secret)
  .update(payload)
  .digest("hex")

console.log(signature)
// "a3b4c5d6..." — 64 hex chars (256 bits)

// Python
import hmac, hashlib

signature = hmac.new(
    key=b"my-webhook-secret",
    msg=payload.encode("utf-8"),
    digestmod=hashlib.sha256
).hexdigest()`,
        codeLanguage: 'typescript',
      },
      {
        heading: 'Verifying webhook signatures',
        body: `Major platforms (Stripe, GitHub, Shopify, Twilio) sign webhook payloads with HMAC-SHA256 so you can verify the request came from them and was not tampered with.\n\nThe general pattern:\n1. Receive the webhook request.\n2. Read the raw body (do not parse JSON yet — parsing may reorder keys).\n3. Compute HMAC of the raw body using your webhook secret.\n4. Compare against the signature in the request header using a constant-time comparison.`,
        code: `// Stripe webhook verification (Node.js/Express)
import Stripe from "stripe"

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"]

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,           // raw Buffer — not parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    // Handle event.type
    res.json({ received: true })
  } catch (err) {
    res.status(400).send("Webhook signature verification failed")
  }
})

// GitHub webhook verification
import { timingSafeEqual } from "crypto"

function verifyGitHubSignature(payload: Buffer, sigHeader: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader))
}`,
        codeLanguage: 'typescript',
      },
      {
        heading: 'Why constant-time comparison matters',
        body: `Never use \`===\` to compare HMAC signatures. String comparison in most languages short-circuits — it returns false as soon as the first mismatched byte is found. This timing difference leaks information about how much of the signature is correct, enabling a timing attack.\n\nAlways use a constant-time comparison function: \`crypto.timingSafeEqual\` in Node.js, \`hmac.compare_digest\` in Python, or equivalent.`,
        code: `// ❌ Vulnerable to timing attack
if (computedSignature === receivedSignature) { ... }

// ✅ Constant-time comparison (Node.js)
import { timingSafeEqual } from "crypto"
const a = Buffer.from(computedSignature, "hex")
const b = Buffer.from(receivedSignature, "hex")
if (a.length === b.length && timingSafeEqual(a, b)) { ... }

# Python
import hmac
if hmac.compare_digest(computed_sig, received_sig):
    ...`,
        codeLanguage: 'typescript',
      },
      {
        heading: 'HMAC vs plain hash vs digital signature',
        body: `**Plain hash** (SHA-256 of message): anyone can compute it — no authentication, only integrity.\n\n**HMAC** (SHA-256 with shared secret): proves the signer knows the secret — integrity + authenticity. Requires sharing the secret with all verifiers.\n\n**Digital signature** (RSA, ECDSA): asymmetric — private key signs, public key verifies. No secret sharing needed. Better for public verification (JWT RS256, code signing, TLS certificates). More computationally expensive than HMAC.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between HMAC-SHA256 and SHA-256?',
        a: 'SHA-256 is a hash function — it produces a digest of the message but anyone can compute it. HMAC-SHA256 mixes a secret key into the hash using a specific construction, so only holders of the secret can produce a valid HMAC.',
      },
      {
        q: 'Can I use HMAC for API key authentication?',
        a: 'Yes, and many APIs do. The client signs each request body or canonical string with a shared secret (API secret key). The server recomputes the HMAC and compares. AWS Signature Version 4 uses HMAC-SHA256 in this way.',
      },
      {
        q: 'Is HMAC-SHA1 still secure?',
        a: 'SHA-1 is broken as a standalone hash for collision resistance. However, HMAC-SHA1 is still considered secure for message authentication — the HMAC construction prevents the collision attacks that break raw SHA-1. That said, prefer HMAC-SHA256 for new implementations.',
      },
      {
        q: 'How do I test HMAC signatures during development?',
        a: 'Use MyDevTools HMAC Generator to compute HMAC-SHA256 (or other variants) for any key and message directly in the browser, without writing a script. Useful for verifying your implementation produces the expected output.',
      },
    ],
  },

  {
    slug: 'gitignore-guide-with-examples',
    title: '.gitignore Guide: Syntax, Examples, and Patterns for Every Project',
    description:
      'Learn how .gitignore works, the pattern syntax, common patterns for Node.js, Python, Java, Go, and macOS, and how to fix files already tracked by git.',
    publishedAt: '2026-03-12',
    category: 'Generators',
    toolSlug: 'gitignore-generator',
    keywords: ['gitignore', 'gitignore examples', '.gitignore patterns', 'gitignore generator', 'how to write gitignore', 'gitignore node', 'gitignore python'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is .gitignore?',
        body: `A \`.gitignore\` file tells git which files and directories to exclude from version control. Files matched by \`.gitignore\` patterns are not staged, committed, or shown in \`git status\` output.\n\nWithout a proper \`.gitignore\`, you risk committing node_modules (hundreds of megabytes), .env files with secrets, OS junk files (.DS_Store), build artifacts, and IDE config — all of which pollute history and can cause security incidents.`,
      },
      {
        heading: '.gitignore pattern syntax',
        body: `- **Exact filename**: \`secrets.txt\` — ignores any file named secrets.txt in any directory.\n- **Directory**: \`node_modules/\` — the trailing slash matches only directories.\n- **Wildcard**: \`*.log\` — ignores all files ending in .log.\n- **Double wildcard**: \`**/logs\` — ignores a logs directory anywhere in the tree. \`logs/**\` ignores everything inside logs.\n- **Negation**: \`!important.log\` — un-ignores a previously ignored file. Must come after the ignoring pattern.\n- **Comment**: lines starting with \`#\` are comments.\n- **Leading slash**: \`/build\` — ignores build only at the root, not in subdirectories.`,
        code: `# OS files
.DS_Store
Thumbs.db

# Secrets — never commit
.env
.env.local
.env.*.local
*.pem
*.key

# Dependencies
node_modules/
vendor/

# Build output
dist/
build/
*.min.js

# Logs
logs/
*.log
npm-debug.log*

# IDE
.idea/
.vscode/
*.swp

# Negation: keep this specific file despite *.log rule
!important.log`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Language and framework-specific patterns',
        body: `**Node.js**: \`node_modules/\`, \`.npm\`, \`*.tgz\`, \`dist/\`, \`.env\`, \`coverage/\`\n\n**Python**: \`__pycache__/\`, \`*.pyc\`, \`*.pyo\`, \`.venv\`, \`venv/\`, \`.pytest_cache/\`, \`*.egg-info/\`, \`dist/\`, \`.mypy_cache/\`\n\n**Java**: \`*.class\`, \`*.jar\`, \`*.war\`, \`target/\`, \`.gradle/\`, \`build/\`\n\n**Go**: \`*.exe\`, \`*.test\`, \`vendor/\` (if not committing deps)\n\n**Rust**: \`target/\`, \`Cargo.lock\` (for libraries — keep for binaries)\n\n**macOS**: \`.DS_Store\`, \`.AppleDouble\`, \`.LSOverride\`\n\n**Linux**: \`*~\` (backup files)\n\n**Windows**: \`Thumbs.db\`, \`Desktop.ini\`, \`$RECYCLE.BIN/\``,
      },
      {
        heading: 'Fixing files already tracked by git',
        body: `If you add a pattern to .gitignore but the file is already tracked (committed), git will continue tracking it. You must explicitly untrack it.`,
        code: `# Remove a specific file from tracking (keeps local file)
git rm --cached path/to/file

# Remove a directory from tracking recursively
git rm -r --cached node_modules/

# Then commit the removal
git add .gitignore
git commit -m "Remove tracked files that should be gitignored"`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Global gitignore for OS and IDE files',
        body: `Instead of adding \`.DS_Store\` or \`.idea/\` to every project's \`.gitignore\`, add them once to a global gitignore file. This keeps project \`.gitignore\` files focused on project-specific exclusions.`,
        code: `# Create a global gitignore
touch ~/.gitignore_global

# Add your patterns
echo ".DS_Store" >> ~/.gitignore_global
echo ".idea/" >> ~/.gitignore_global
echo "*.swp" >> ~/.gitignore_global

# Tell git to use it
git config --global core.excludesfile ~/.gitignore_global`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Using a gitignore generator',
        body: `The GitHub-maintained \`gitignore\` repository contains templates for hundreds of languages, frameworks, and tools. Instead of writing patterns from scratch, use a generator that pulls the correct template for your stack.\n\nMyDevTools Gitignore Generator lets you select one or more technologies (Node, Python, Go, macOS, JetBrains, VSCode, etc.) and produces a merged, deduplicated \`.gitignore\` file ready to paste into your project root.`,
      },
    ],
    faqs: [
      {
        q: 'Why is git still tracking my .env file after I added it to .gitignore?',
        a: '.gitignore only prevents untracked files from being staged. If .env was already committed, git keeps tracking it. Run git rm --cached .env, then commit the removal.',
      },
      {
        q: 'Should I commit .gitignore?',
        a: 'Yes. .gitignore is project configuration that all contributors should share. Commit it alongside your source code.',
      },
      {
        q: 'What is the difference between .gitignore, .gitkeep, and .gitattributes?',
        a: '.gitignore specifies files to exclude. .gitkeep is a convention (not a git feature) — an empty placeholder file used to commit otherwise-empty directories. .gitattributes controls line endings, diff behavior, and merge strategies per file pattern.',
      },
      {
        q: 'Can I have multiple .gitignore files in one repo?',
        a: 'Yes. A .gitignore file applies to its directory and all subdirectories. You can place more specific .gitignore files in subdirectories to override or extend the root rules for that subtree.',
      },
    ],
  },
  {
    slug: 'self-hosted-developer-tools',
    title: 'Self-Hosted Developer Tools: Why Teams Run Their Own Toolkit',
    description:
      'Learn when self-hosted developer tools make sense, what to look for in a private dev toolkit, and how MyDevTools fits self-hosted engineering workflows.',
    publishedAt: '2025-12-05',
    category: 'Productivity',
    keywords: ['self-hosted developer tools', 'self hosted dev toolkit', 'private developer tools', 'open source developer tools', 'internal developer tools'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What are self-hosted developer tools?',
        body: `Self-hosted developer tools are utilities your team runs on infrastructure you control instead of relying entirely on public SaaS websites. For daily engineering work, that can include JSON formatters, JWT decoders, API clients, timestamp converters, secret generators, database helpers, and documentation utilities.\n\nThe main appeal is control: you choose where the app runs, who can access it, how logs are handled, and which network boundaries protect the system. For teams that regularly handle internal payloads, staging URLs, credentials, or production-like test data, self-hosting can reduce the risk of pasting sensitive material into random third-party tools.`,
      },
      {
        heading: 'When self-hosting is worth it',
        body: `Self-hosting has operational cost, so it is not always the right default. It makes the most sense when your team has privacy requirements, regulated data, internal-only APIs, or a strong preference for auditable open-source software.\n\nGood signals that self-hosting is worth considering:\n\n- Developers regularly work with non-public payloads, tokens, connection strings, or configuration files.\n- Security policy discourages pasting data into public websites.\n- The team wants a consistent internal toolkit rather than each developer using a different utility site.\n- You already operate internal web apps and can deploy another service safely.`,
      },
      {
        heading: 'What to look for in a self-hosted dev toolkit',
        body: `A good self-hosted developer toolkit should be broad enough to replace a bookmark folder, but not so heavy that every task feels like opening an enterprise platform. Look for browser-based utilities, clear data handling, a public source code repository, documented deployment steps, and a clean separation between public marketing pages and app functionality.\n\nMyDevTools is designed around that model: public /tools pages explain each utility, while the app surface gives developers a shared dashboard for everyday work. The GPL-3.0 codebase can be audited, forked, and deployed by teams that want infrastructure control.`,
      },
      {
        heading: 'Self-hosted vs managed cloud',
        body: `Self-hosting is best when control matters more than convenience. Managed cloud is best when developers want the toolkit available immediately without owning deployment, upgrades, and backups.\n\nFor a small personal workflow, cloud is usually faster. For an internal platform, security-sensitive workflow, or team that wants to standardize developer utilities, self-hosting can be the better long-term choice.`,
      },
    ],
    faqs: [
      {
        q: 'Are self-hosted developer tools more secure?',
        a: 'They can be, but only if deployed and maintained well. Self-hosting gives you control over access, logs, data storage, and network boundaries; it does not automatically remove operational risk.',
      },
      {
        q: 'What tools should a self-hosted developer toolkit include?',
        a: 'Start with high-frequency utilities: JSON formatter, JWT decoder, API client, regex tester, UUID generator, Base64 encoder, timestamp converter, hash generator, and mock data tools.',
      },
      {
        q: 'Is MyDevTools self-hostable?',
        a: 'Yes. MyDevTools is open source under GPL-3.0 and is positioned for both self-hosted and managed cloud usage.',
      },
    ],
  },
  {
    slug: 'aes-256-encrypted-notes-for-developers',
    title: 'AES-256 Encrypted Notes for Developers: What to Store and What to Avoid',
    description:
      'A practical guide to AES-256 encrypted notes, vault-style developer data, and when to use MyDevTools Password Manager for sensitive snippets.',
    publishedAt: '2025-12-12',
    category: 'Security',
    toolSlug: 'password-manager',
    keywords: ['AES-256 encrypted notes for devs', 'encrypted developer notes', 'secure notes for developers', 'developer password manager', 'encrypted vault'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why developers need encrypted notes',
        body: `Developers often need to keep short sensitive snippets close at hand: staging credentials, recovery codes, API tokens for local testing, database connection notes, SSH hints, internal URLs, and setup instructions. Plain text notes are convenient, but they are a poor fit for secrets or anything that could expose a system if copied into the wrong place.\n\nAES-256 encrypted notes are useful when the content should be searchable and accessible to you, but unreadable to the server storing it. In a zero-knowledge-style workflow, encryption happens in the browser before sync, so the backend stores ciphertext rather than readable plaintext.`,
      },
      {
        heading: 'What AES-256 protects',
        body: `AES-256 is a symmetric encryption algorithm widely used for protecting data at rest. In a browser-based vault workflow, your passphrase or vault key is used locally to encrypt data before it is uploaded. The server can store and sync encrypted blobs, but it should not receive the raw note content or master password.\n\nThat model is strongest when paired with good key derivation, authenticated encryption modes such as AES-GCM, and careful session handling. It protects synced data from casual exposure on the backend, but it does not protect against a compromised browser, malicious extension, weak master password, or phishing attack.`,
      },
      {
        heading: 'What developers should store in encrypted notes',
        body: `Encrypted notes are best for contextual secret-adjacent data, not as a dumping ground for every production credential.\n\nGood candidates:\n\n- Recovery codes and backup instructions.\n- Notes attached to password manager entries.\n- Local development tokens and staging-only credentials.\n- Internal setup notes that should not live in public docs.\n- Rotation reminders or environment-specific context.\n\nAvoid storing highly privileged production secrets unless your team has approved the vault, reviewed the code, and documented access controls.`,
      },
      {
        heading: 'Using MyDevTools Password Manager for secure notes',
        body: `MyDevTools Password Manager is designed for vault-style sensitive records. It encrypts sensitive data in the browser before sync where supported, so the backend stores encrypted data instead of readable vault content.\n\nUse it when you need a developer-friendly place for passwords, short sensitive notes, and account context. Pair it with self-hosting if your team wants stronger control over infrastructure and deployment boundaries.`,
      },
    ],
    faqs: [
      {
        q: 'Are AES-256 encrypted notes safe for API keys?',
        a: 'They can be safer than plain text notes, but production API keys should follow your team security policy. Use a dedicated secrets manager for high-value production secrets.',
      },
      {
        q: 'Does encryption mean the server cannot read my notes?',
        a: 'If encryption happens in the browser before sync and the server never receives the key or plaintext, the server stores ciphertext rather than readable note content.',
      },
      {
        q: 'Should developers self-host encrypted note tools?',
        a: 'Self-hosting is a good option for teams that want control over deployment, logs, access, and storage. It does not replace good key management or secure browser practices.',
      },
    ],
  },
  {
    slug: 'how-to-query-sql-databases-online',
    title: 'How to Query SQL Databases Online: Connect PostgreSQL, MySQL, MariaDB',
    description: 'Connect to PostgreSQL, MySQL, or MariaDB from your browser. Run SQL queries, explore schemas, and export results without installing a database client. All credentials are AES-256 encrypted.',
    publishedAt: '2026-01-05',
    category: 'Databases',
    toolSlug: 'sql-client',
    keywords: ['sql client online', 'query database browser', 'postgresql gui online', 'mysql client', 'sql query tool'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why use an online SQL client?',
        body: `Database clients like DBeaver, TablePlus, and pgAdmin are desktop or web apps that connect to your database. But they require installation, local memory, and management. A browser-based SQL client eliminates setup friction: open your browser, enter your connection details, and start querying—no download, no configuration, no persistence on your machine.\n\nMyDevTools SQL Client runs in your browser, encrypts your credentials with AES-256 before storing them, and keeps your connection details local. You can run SELECT, INSERT, UPDATE, DELETE, and administrative queries directly against PostgreSQL, MySQL, and MariaDB instances.`,
      },
      {
        heading: 'How to connect to your database',
        body: `You need four pieces of information:\n\n- **Host** — Domain or IP of the database server (e.g., \`db.example.com\` or \`localhost:5432\`).\n- **Port** — Default ports: PostgreSQL 5432, MySQL/MariaDB 3306.\n- **Username** — Your database user.\n- **Password** — Your user password.\n\nOptionally provide a database name to start in a specific database context. Enter these details into the SQL Client, and it will attempt a connection. If successful, you can immediately start writing queries.`,
        code: `-- PostgreSQL connection example
Host: postgres.railway.app
Port: 5432
User: postgres
Password: ••••••••

-- MySQL connection example
Host: localhost
Port: 3306
User: root
Password: ••••••••`,
        codeLanguage: 'text',
      },
      {
        heading: 'Running queries and exploring schemas',
        body: `Once connected, write any SQL query. The interface shows results in a table, with column headers, data types, and row counts. For larger result sets, pagination prevents the browser from loading millions of rows at once.\n\nOn the left sidebar, you can browse your database structure: list tables, columns, and their types. This schema explorer saves you from memorizing table names and column definitions.`,
        code: `-- List all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Count rows in a table
SELECT COUNT(*) FROM users;

-- Query with conditions
SELECT id, email, created_at FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;`,
        codeLanguage: 'sql',
      },
      {
        heading: 'Exporting results and managing connections',
        body: `Results can be exported to CSV for further analysis in spreadsheet tools. Multiple database connections can be saved securely—your credentials are encrypted with AES-256 in your browser storage before any sync, so the server never sees plaintext passwords.\n\nUse the browser-based storage to quickly switch between development, staging, and production databases (with appropriate caution and role-based permissions on your database users).`,
      },
      {
        heading: 'Security: credentials and encrypted storage',
        body: `Your database credentials are sensitive. MyDevTools SQL Client encrypts them with AES-256 in the browser before storing locally, so plaintext passwords never leave your machine. For production databases, follow your organization's credential policies: use temporary tokens, short-lived credentials, or SSH tunneling if available.`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to paste my database password into an online SQL client?',
        a: 'Use a browser-based client that encrypts credentials locally before storage. MyDevTools SQL Client uses AES-256 encryption in your browser, so passwords never reach the server unencrypted. Avoid clients that send credentials over unencrypted connections.',
      },
      {
        q: 'Can I use SQL Client to manage production databases?',
        a: 'Yes, but follow your organization security policy. Use read-only credentials for production or temporary tokens with expiration. Never save production passwords in a shared tool.',
      },
      {
        q: 'Does SQL Client support PostgreSQL, MySQL, and MariaDB?',
        a: 'Yes, all three are supported. MariaDB is MySQL-compatible, so the same connection method works.',
      },
      {
        q: 'Can I run administrative commands like CREATE TABLE or DROP?',
        a: 'Yes, any SQL query that your user role permits. Make sure your user permissions match your intent (e.g., read-only for exploration, write access only for development).',
      },
    ],
  },
  {
    slug: 'hash-generator-md5-sha256-online',
    title: 'Hash Generator: MD5, SHA-256, SHA-512 Online Tool',
    description: 'Generate MD5, SHA-256, SHA-384, SHA-512, and other cryptographic hashes online. Hash text or files instantly in your browser without any upload.',
    publishedAt: '2026-01-06',
    category: 'Security',
    toolSlug: 'hash-generator',
    keywords: ['hash generator online', 'sha256 hash', 'md5 hash generator', 'sha512 online', 'file hash calculator'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What are cryptographic hashes?',
        body: `A cryptographic hash function takes input of any size and produces a fixed-size string of bytes, called a hash or digest. The key property: even a tiny change in input produces a completely different hash.\n\nCommon use cases: verifying file integrity (download a file and its hash, then verify they match), storing password hashes instead of plaintext passwords, generating checksums for data deduplication, and creating digital signatures.\n\nUnlike encryption, hashing is one-way — you cannot reverse a hash back to the original input (for good hash functions). That makes it suitable for storing sensitive information like passwords: even if a hash is exposed, the original password cannot be recovered.`,
      },
      {
        heading: 'Common hash algorithms',
        body: `**MD5** — 128-bit hash, widely deployed but cryptographically broken. Avoid for security; acceptable for simple checksums.\n\n**SHA-1** — 160-bit hash, also compromised. Deprecated in modern systems but still seen in version control and code signing.\n\n**SHA-256** — 256-bit hash, part of SHA-2 family, currently secure. The gold standard for most applications (password hashing, file integrity, digital signatures).\n\n**SHA-384, SHA-512** — 384-bit and 512-bit variants. Overkill for most use cases but appropriate for high-security contexts (military, financial cryptography).\n\nFor new projects: use SHA-256 for hashing text, and bcrypt/Argon2 (specialized password hashing) for passwords.`,
        code: `// JavaScript (browser, Node.js 15+)
const data = "hello world";

// SHA-256
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
console.log(Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
// → 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069

// Command line (macOS, Linux)
echo -n "hello world" | sha256sum
# → 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Hash generator use cases',
        body: `**Verify downloads** — Check that a downloaded file matches its published hash to detect corruption or tampering.\n\n**Password storage** — Hash passwords with salt before storing in a database (use bcrypt, not plain SHA-256).\n\n**API integrity** — Include a hash of sensitive data in a request signature to detect tampering.\n\n**File deduplication** — Use file hashes to identify identical files without comparing entire contents.\n\n**Git commits** — Git uses SHA-1 hashes to identify commits and content (though migration to SHA-256 is underway).`,
      },
      {
        heading: 'Why not plain SHA-256 for passwords?',
        body: `SHA-256 hashes the same password to the same hash every time. An attacker with a password hash and a hash table of common passwords can crack it in milliseconds. Password hashing functions like bcrypt, scrypt, Argon2 add salt (random data) and slowing (repeated hashing) to make brute-force attacks computationally expensive.\n\nAlways use a password-specific algorithm (bcrypt, Argon2) rather than a general-purpose hash function.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between MD5 and SHA-256?',
        a: 'MD5 produces a 128-bit hash and is cryptographically broken (collision attacks exist). SHA-256 produces a 256-bit hash and is currently secure. Use SHA-256 for security-sensitive applications.',
      },
      {
        q: 'Can I reverse a hash to get the original input?',
        a: 'No, not for secure hash functions. A good hash function is one-way by design — the whole point is that you cannot recover the original from the hash.',
      },
      {
        q: 'Should I use the same hash algorithm for everything?',
        a: 'Use SHA-256 for most general-purpose hashing. For passwords, use bcrypt, scrypt, or Argon2. For HMAC (signed hashes), use SHA-256 with a key.',
      },
      {
        q: 'Is it safe to hash a password with a publicly known algorithm like SHA-256?',
        a: 'No. Always use a password hashing algorithm like bcrypt that includes salt and slow iterations. Plain SHA-256 of a password is insecure.',
      },
    ],
  },
  {
    slug: 'url-parser-extract-components',
    title: 'URL Parser: Extract URL Components Online',
    description: 'Parse any URL into protocol, host, pathname, query parameters, and hash. Understand URL structure instantly.',
    publishedAt: '2026-01-07',
    category: 'Utilities',
    toolSlug: 'url-parser',
    keywords: ['url parser online', 'parse url', 'url components', 'extract query params', 'url structure'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Understanding URL structure',
        body: `A URL is composed of several parts:\n\n**Protocol** — \`https://\` or \`http://\` determines how the request is made (secure or not).\n\n**Host** — Domain name or IP address where the resource lives.\n\n**Port** — Optional numeric port (defaults: 80 for HTTP, 443 for HTTPS). Only needed if non-standard.\n\n**Pathname** — Path to the resource on the server (e.g., \`/users/123\`).\n\n**Query String** — Key-value pairs after the \`?\` (e.g., \`?page=2&sort=name\`).\n\n**Fragment (Hash)** — After the \`#\`, used for navigation within a page (not sent to the server).\n\nUnderstanding these parts is essential when parsing URLs programmatically, building redirects, validating links, or analyzing incoming requests.`,
        code: `// Full URL with all components
https://mydevtools.tech:443/tools/json-formatter?lang=en&sort=asc#features

// Breakdown:
Protocol: https
Host: mydevtools.tech
Port: 443 (implicit for https, can be omitted)
Pathname: /tools/json-formatter
Query: lang=en&sort=asc
Fragment: features`,
        codeLanguage: 'text',
      },
      {
        heading: 'Using the URL Parser online',
        body: `Paste any URL and instantly see all components broken down: protocol, host, port, pathname, individual query parameters, and fragment. Useful when debugging URLs in logs, understanding API redirects, or validating user-provided URLs.`,
      },
      {
        heading: 'JavaScript URL parsing',
        body: `The browser \`URL\` class parses any URL:`,
        code: `const url = new URL('https://mydevtools.tech/tools?lang=en&page=1#section');

console.log(url.protocol);    // "https:"
console.log(url.hostname);    // "mydevtools.tech"
console.log(url.pathname);    // "/tools"
console.log(url.search);      // "?lang=en&page=1"
console.log(url.hash);        // "#section"

// Access individual query parameters
console.log(url.searchParams.get('lang')); // "en"
console.log(url.searchParams.get('page')); // "1"`,
        codeLanguage: 'javascript',
      },
      {
        heading: 'Common URL parsing tasks',
        body: `**Extract the domain from a URL** — Get just the host without protocol or path.\n\n**List all query parameters** — Iterate over every key-value pair in the query string.\n\n**Build a URL dynamically** — Construct a URL by setting components programmatically.\n\n**Validate URL format** — Check if a string is a valid URL (use try/catch with new URL()).\n\n**Relative vs absolute URLs** — Resolve relative URLs against a base URL for proper link following.`,
      },
    ],
    faqs: [
      {
        q: 'What is the difference between hash and query parameters?',
        a: 'Query parameters (?key=value) are sent to the server. The hash (#section) is used only in the browser for navigation and is not sent to the server.',
      },
      {
        q: 'How do I extract query parameters in JavaScript?',
        a: 'Use the URL class: new URL(urlString).searchParams.get("paramName")',
      },
      {
        q: 'Is a URL with special characters in the query string valid?',
        a: 'Special characters should be percent-encoded (e.g., space becomes %20). Use encodeURIComponent() to safely encode values before adding them to a URL.',
      },
    ],
  },
  {
    slug: 'convert-csv-excel-to-json-online',
    title: 'Convert CSV to JSON, Excel to JSON Online',
    description: 'Upload CSV or Excel files and convert to JSON instantly. Export JSON arrays back to CSV or XLSX. All processing happens in your browser.',
    publishedAt: '2026-01-08',
    category: 'Converters',
    toolSlug: 'csv-excel-json',
    keywords: ['csv to json converter', 'excel to json', 'xlsx to json', 'json to csv', 'convert spreadsheet'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why convert CSV to JSON?',
        body: `CSV (Comma-Separated Values) is human-readable and spreadsheet-compatible but lacks structure for nested data. JSON is hierarchical, supports arrays and objects, and parses directly into JavaScript.\n\nConverting CSV to JSON is common when importing spreadsheet data into a database, feeding data into an API, or processing user-uploaded files. Conversely, exporting JSON to CSV makes it easy to open results in Excel for further analysis.`,
      },
      {
        heading: 'How CSV to JSON conversion works',
        body: `The first row of your CSV becomes the object keys. Each subsequent row becomes an object with those keys. The result is an array of objects, ready to parse in JavaScript or send to an API.`,
        code: `// CSV input (with header)
name,age,email
Alice,30,alice@example.com
Bob,25,bob@example.com

// JSON output
[
  { "name": "Alice", "age": 30, "email": "alice@example.com" },
  { "name": "Bob", "age": 25, "email": "bob@example.com" }
]`,
        codeLanguage: 'json',
      },
      {
        heading: 'Excel to JSON with date handling',
        body: `When converting XLSX (Excel) files, dates are automatically converted to ISO 8601 strings. For example, an Excel date like "Jan 15, 2025" becomes "2025-01-15T00:00:00Z" in JSON, which is universally parseable.`,
        code: `// Excel columns: Name, Hired, Salary
Name,Hired,Salary
Alice,2025-01-15,75000
Bob,2024-06-20,65000

// Becomes
[
  { "Name": "Alice", "Hired": "2025-01-15T00:00:00Z", "Salary": 75000 },
  { "Name": "Bob", "Hired": "2024-06-20T00:00:00Z", "Salary": 65000 }
]`,
        codeLanguage: 'json',
      },
      {
        heading: 'JSON to CSV export',
        body: `Export an array of JSON objects back to CSV for use in spreadsheet tools. MyDevTools extracts all unique keys from the objects and creates headers, then writes each row with values in the same column order.`,
      },
      {
        heading: 'Use cases',
        body: `**Data import** — Convert user-uploaded spreadsheets into JSON for bulk inserts into a database.\n\n**Integration testing** — Load test data from a CSV, convert to JSON, and feed into an API.\n\n**Reports** — Export API results as JSON, convert to CSV, open in Excel for pivot tables and charts.\n\n**ETL workflows** — Transform CSV data, process it, and export back to CSV or another format.`,
      },
    ],
    faqs: [
      {
        q: 'What if my CSV has quoted fields with commas inside?',
        a: 'Standard CSV parsing handles quoted fields correctly. Wrap values containing commas in double quotes.',
      },
      {
        q: 'Can I convert nested JSON to CSV?',
        a: 'Nested objects or arrays cannot be directly represented in CSV (which is flat). Flatten the JSON first or export a simplified structure.',
      },
      {
        q: 'Is the file upload secure?',
        a: 'MyDevTools CSV/Excel converter processes files entirely in your browser. Nothing is uploaded to a server — your file stays on your machine.',
      },
    ],
  },
  {
    slug: 'yaml-formatter-validator-online',
    title: 'Format YAML Online: Validator & Converter',
    description: 'Format YAML with indentation validation. Convert YAML to JSON and back. Check for syntax errors instantly.',
    publishedAt: '2026-01-09',
    category: 'Formatters',
    toolSlug: 'yaml-formatter',
    keywords: ['yaml formatter online', 'yaml validator', 'yaml to json', 'json to yaml', 'format yaml'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is YAML and why format it?',
        body: `YAML (YAML Ain't Markup Language) is a human-readable data serialization language used widely in configuration files (Kubernetes, Docker Compose, Ansible, CI/CD pipelines). Unlike JSON or XML, YAML uses indentation and minimal punctuation, making it easy to read but strict about whitespace.\n\nYAML errors are almost always indentation mistakes: inconsistent spacing, tabs instead of spaces, or wrong nesting depth. A YAML formatter catches these instantly and either fixes them or shows you exactly where the problem is.`,
      },
      {
        heading: 'YAML syntax basics',
        body: `**Keys and values** — \`key: value\` format. No quotes needed for simple strings.\n\n**Indentation** — Nesting is determined by spaces (typically 2 spaces per level). Mixing tabs and spaces breaks parsing.\n\n**Lists** — \`- item\` syntax for arrays.\n\n**Strings** — Simple strings don't need quotes. Use quotes for strings with special characters or leading/trailing whitespace.\n\n**Multiline strings** — Use \`|\` for literal blocks or \`>\` for folded (wrapped) text.`,
        code: `# Valid YAML
name: Alice
age: 30
tags:
  - developer
  - security
  - devops
config:
  debug: true
  timeout: 30

# Invalid YAML (mixed indentation, wrong spacing)
name: Alice
 age: 30        # <- incorrect indent depth
  tags:         # <- inconsistent with above
  - developer`,
        codeLanguage: 'yaml',
      },
      {
        heading: 'Converting between YAML and JSON',
        body: `YAML and JSON represent the same data structures (objects, arrays, strings, numbers). MyDevTools YAML Formatter lets you convert between them:\n\n- Paste YAML → see equivalent JSON.\n- Paste JSON → see equivalent YAML.\n\nThis is useful when integrating YAML-based tools with JSON APIs, or when you need to validate YAML structure by converting it to JSON and back.`,
      },
      {
        heading: 'Common YAML errors and fixes',
        body: `**"Expected block mapping" or "Bad indentation"** — Check that your indentation is consistent (all 2 spaces, no tabs). Each nested level should increase by exactly 2 spaces.\n\n**"Cannot read property of undefined"** — A required key is missing or misspelled.\n\n**Unexpected character or "Bad anchor"** — YAML anchors (\`&ref\`) and aliases (\`*ref\`) have specific syntax — check for typos.`,
      },
    ],
    faqs: [
      {
        q: 'Can I mix tabs and spaces in YAML?',
        a: 'No. YAML does not allow mixing tabs and spaces. Always use spaces (typically 2 per indent level).',
      },
      {
        q: 'What is the difference between YAML and JSON?',
        a: 'YAML is more human-readable with minimal punctuation. JSON is stricter, requires quotes around keys, and works directly in JavaScript. Both represent the same data structures.',
      },
      {
        q: 'Can I convert complex YAML with anchors and aliases to JSON?',
        a: 'Yes, YAML anchors (&ref) and aliases (*ref) resolve to the same object in JSON, producing merged or referenced structures.',
      },
    ],
  },
  {
    slug: 'graphql-formatter-minify-online',
    title: 'Format GraphQL Queries Online: Minify & Pretty Print',
    description: 'Format and minify GraphQL queries, mutations, and subscriptions instantly in your browser. Check syntax and beautify complex queries.',
    publishedAt: '2026-01-10',
    category: 'Formatters',
    toolSlug: 'graphql-formatter',
    keywords: ['graphql formatter', 'graphql minify', 'format graphql', 'pretty print graphql', 'graphql query tool'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why format GraphQL?',
        body: `GraphQL queries can become deeply nested and hard to read, especially with multiple levels of fields, aliases, and variables. Formatting (pretty-printing) adds indentation and line breaks so relationships between fields are immediately visible.\n\nMinifying removes all whitespace for production: smaller HTTP payload, faster transmission, less bandwidth used. Both formatting and minifying are useful at different stages: formatting during development, minifying before sending to production.`,
      },
      {
        heading: 'GraphQL query structure',
        body: `A GraphQL query has three main parts: the operation type (query, mutation, subscription), optional variables, and the selection set of fields.`,
        code: `# Unformatted (hard to read)
query GetUser($id:ID!) { user(id:$id) { id name email posts { title createdAt } } }

# Formatted (easy to read)
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
      createdAt
    }
  }
}`,
        codeLanguage: 'graphql',
      },
      {
        heading: 'Minifying GraphQL for production',
        body: `Minified queries have all whitespace removed and variable names shortened (if you control the server). Minification saves 20-40% on HTTP payload size for large queries.`,
        code: `# Minified query
query GetUser($id:ID!){user(id:$id){id name email posts{title createdAt}}}

# Original minified size: ~70 chars
# Original formatted size: ~150 chars
# Savings: ~53%`,
        codeLanguage: 'graphql',
      },
      {
        heading: 'Common GraphQL formatting issues',
        body: `**Unbalanced braces or parentheses** — Check that every opening \`{\` has a matching \`}\` and every field argument is enclosed in parentheses.\n\n**Undefined variables** — If a query uses \`$variableName\`, it must be declared in the query signature.\n\n**Invalid field names** — Queries can only request fields that exist in the schema. Use a formatter to catch typos.`,
      },
    ],
    faqs: [
      {
        q: 'Should I send formatted or minified queries to my GraphQL server?',
        a: 'The server does not care about formatting. Minified is smaller over the wire; formatted is easier to debug. Choose based on your needs.',
      },
      {
        q: 'Can I format a GraphQL mutation or subscription the same way as a query?',
        a: 'Yes, all GraphQL operations (query, mutation, subscription) use the same formatting rules.',
      },
      {
        q: 'Does formatting validate my GraphQL?',
        a: 'A formatter checks for basic syntax (balanced braces, valid structure). It does not validate against a schema — only your GraphQL server does that.',
      },
    ],
  },
  {
    slug: 'convert-image-to-base64-data-uri',
    title: 'Convert Images to Base64: Data URI Generator',
    description: 'Convert PNG, JPG, WebP images to Base64 or Data URI instantly. Embed images in HTML and CSS without separate HTTP requests.',
    publishedAt: '2026-01-11',
    category: 'Converters',
    toolSlug: 'image-to-base64',
    keywords: ['image to base64', 'data uri generator', 'base64 image', 'embed image in html'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why convert images to Base64?',
        body: `Normally, an image URL in HTML or CSS triggers a separate HTTP request. For small icons and inline graphics, embedding the image directly as Base64 saves the round-trip.\n\nBenefit: fewer HTTP requests = faster page load (especially important on mobile). Downside: the HTML/CSS file gets slightly larger, and the browser cannot cache the image separately. Use Base64 embedding for small critical images (favicons, tiny icons, essential SVGs) but not for large photos.`,
      },
      {
        heading: 'Data URIs: embedding images in HTML',
        body: `A Data URI embeds the image bytes directly in an \`<img src>\` attribute:`,
        code: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="tiny transparent pixel" />`,
        codeLanguage: 'html',
      },
      {
        heading: 'Embedding Base64 images in CSS',
        body: `Use Data URIs in CSS background images:`,
        code: `/* 1x1 transparent PNG */
.logo {
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
  background-size: 16px 16px;
}`,
        codeLanguage: 'css',
      },
      {
        heading: 'When to use Base64 vs separate image files',
        body: `**Use Base64 (Data URIs):**\n- Tiny critical icons (< 2KB)\n- Images required for above-the-fold rendering\n- Favicons and app icons\n- Inline SVGs (even better: embed SVG directly without Base64)\n\n**Use separate image files:**\n- Photos and large images (> 10KB)\n- Images loaded below the fold\n- Images reused across multiple pages (benefit from browser caching)`,
      },
      {
        heading: 'Image format considerations',
        body: `**PNG** — Lossless, supports transparency, good for icons and graphics.\n\n**JPG** — Lossy, smaller file size for photos, no transparency.\n\n**WebP** — Modern format with better compression, good for web. May not be supported in older browsers.\n\n**SVG** — Vector format, scales infinitely, smallest for simple graphics. Best embedded directly without Base64.`,
      },
    ],
    faqs: [
      {
        q: 'How much smaller are Data URIs compared to separate files?',
        a: 'Data URIs are about 33% larger due to Base64 encoding overhead. For a 3KB image, expect a 4KB Data URI. Only worth it for tiny critical images.',
      },
      {
        q: 'Can I use Data URIs for responsive images?',
        a: 'Not easily. Data URIs do not support srcset or picture elements well. For responsive images, stick with separate image files and let the browser cache them.',
      },
      {
        q: 'Is it safe to embed user-uploaded images as Base64?',
        a: 'Yes, embedding as Base64 prevents the image file from being directly served. However, always validate file type and size before accepting uploads.',
      },
    ],
  },
  {
    slug: 'generate-ssh-keys-online',
    title: 'Generate SSH Keys Online: Ed25519 vs RSA, OpenSSH Format',
    description: 'Generate Ed25519 or RSA (2048/4096-bit) SSH key pairs in your browser. Download PKCS#8 private keys and OpenSSH public keys instantly.',
    publishedAt: '2026-01-12',
    category: 'Security',
    toolSlug: 'ssh-key-generator',
    keywords: ['ssh key generator', 'generate ssh key online', 'ed25519 key', 'rsa key pair', 'openssh format'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why generate SSH keys online?',
        body: `SSH keys are the secure way to authenticate to servers, Git repositories, and cloud platforms without typing a password. Generating them locally (with \`ssh-keygen\`) is standard, but an online generator in the browser is convenient for quick key creation without leaving your browser.\n\nMyDevTools SSH Key Generator creates key pairs entirely client-side — the private key never leaves your machine. Download it, store it securely, and add the public key to your servers or platforms.`,
      },
      {
        heading: 'Ed25519 vs RSA: which should you use?',
        body: `**Ed25519:**\n- 256-bit key, very small (~68 bytes).\n- Modern, faster, fewer implementation bugs than RSA.\n- Recommended for new setups.\n- Supported by all modern SSH implementations (OpenSSH 6.5+, GitHub, GitLab, AWS).\n\n**RSA 2048-bit:**\n- Still secure, widely supported.\n- Larger keys (~1700 bytes).\n- Slower to generate and verify.\n- Safe if you cannot use Ed25519, but not recommended for new keys.\n\n**RSA 4096-bit:**\n- Larger than 2048, but overkill for SSH.\n- Marginal security benefit over 2048, significantly slower.\n- Only use if your organization mandates it.\n\n**Recommendation:** Use Ed25519 for new keys. Use RSA 2048 only if your systems do not support Ed25519.`,
      },
      {
        heading: 'Key formats: PKCS#8 vs OpenSSH format',
        body: `SSH keys come in different formats:\n\n**PKCS#8** — Standard private key format, works with most cryptographic tools (OpenSSL, Java, Python). Use this for interoperability.\n\n**OpenSSH format** — Native SSH format, used by \`ssh-keygen\`. Default for Linux/macOS. Slightly different structure than PKCS#8.\n\n**Public key** — Usually in OpenSSH format (\`ssh-rsa ...\` or \`ssh-ed25519 ...\`). Add this to \`~/.ssh/authorized_keys\` on servers or to GitHub/GitLab.`,
        code: `# OpenSSH public key format
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIm8Ij... user@hostname

# PKCS#8 private key format (PEM)
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCx...
-----END PRIVATE KEY-----`,
        codeLanguage: 'text',
      },
      {
        heading: 'Using your generated SSH key',
        body: `1. Download the private key and save it to \`~/.ssh/id_ed25519\` (or \`id_rsa\` for RSA).\n2. Set permissions: \`chmod 600 ~/.ssh/id_ed25519\` (private key must not be world-readable).\n3. Add the public key to your server's \`~/.ssh/authorized_keys\` or GitHub/GitLab account.\n4. Test the connection: \`ssh -i ~/.ssh/id_ed25519 user@host\`.\n\nIf using Git with SSH, configure your Git client to use the key: \`git config core.sshCommand \"ssh -i ~/.ssh/id_ed25519\"\`.`,
      },
      {
        heading: 'Security: protecting your private key',
        body: `Your private key is like a password — never share it, never commit it to version control, never store it in the cloud. Keep it on your local machine with filesystem permissions (\`chmod 600\`) restricting access.\n\nIf you suspect a private key has been compromised, regenerate it and update the public key on all servers and platforms that use it.`,
      },
    ],
    faqs: [
      {
        q: 'Can I use a password-protected SSH key?',
        a: 'Yes. When generating a key locally with ssh-keygen, you can set a passphrase. The key generator online does not support passphrases yet — protect the downloaded file with your OS file system security.',
      },
      {
        q: 'What if I lose my private key?',
        a: 'Regenerate a new key pair and update the public key on all servers/platforms. The old private key becomes useless.',
      },
      {
        q: 'Can I use the same SSH key on multiple servers?',
        a: 'Yes, add the same public key to authorized_keys on all servers. Using the same key across multiple systems is fine.',
      },
      {
        q: 'Is it safe to generate SSH keys in a browser?',
        a: 'Yes, if the generator runs locally in the browser with no server upload. MyDevTools SSH Key Generator is client-side only.',
      },
    ],
  },
  {
    slug: 'number-base-converter-binary-hex',
    title: 'Number Base Converter: Binary, Hex, Decimal, Octal Online',
    description: 'Convert integers between number bases 2-36 instantly. Convert binary to hex, decimal to octal, and more.',
    publishedAt: '2026-01-13',
    category: 'Converters',
    toolSlug: 'number-base-converter',
    keywords: ['number base converter', 'binary to hex', 'decimal to binary', 'octal converter', 'hex converter'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Understanding number bases',
        body: `Every number can be represented in different bases (radix). Humans use base 10 (decimal), but computers use base 2 (binary), base 16 (hexadecimal), and sometimes base 8 (octal).\n\nThe same value represented in different bases:\n- **Decimal (base 10):** 255\n- **Binary (base 2):** 11111111\n- **Octal (base 8):** 377\n- **Hexadecimal (base 16):** FF\n\nBase conversion is essential in low-level programming (bit manipulation), color codes (hex), IP addresses (decimal), and cryptography (hex for binary data).`,
      },
      {
        heading: 'Common number bases',
        body: `**Binary (base 2)** — Digits 0–1. Used by computers at the hardware level.\n\n**Octal (base 8)** — Digits 0–7. Historical significance in Unix file permissions, but less common today.\n\n**Decimal (base 10)** — Digits 0–9. Human default.\n\n**Hexadecimal (base 16)** — Digits 0–9, A–F. Compact representation of binary data. Used in colors (#FF5733), memory addresses, and cryptography.\n\n**Any base 2–36** — MyDevTools supports arbitrary bases using 0–9 and A–Z.`,
        code: `// Decimal to Hex (common in color codes)
255 (decimal) = FF (hex)

// Binary representation
42 (decimal) = 101010 (binary)

// Octal (Unix file permissions)
755 (octal) = 493 (decimal) = rwxr-xr-x in Unix`,
        codeLanguage: 'text',
      },
      {
        heading: 'Practical use cases',
        body: `**Hex color codes** — #FF5733 breaks down as FF (red), 57 (green), 33 (blue) in hexadecimal.\n\n**Unicode and character codes** — Characters are stored as numbers; hex is compact for display.\n\n**Bitwise operations** — Convert to binary to understand which bits are set.\n\n**Network subnets** — IP addresses and CIDR notation involve binary and decimal conversions.\n\n**File permissions** — Unix \`chmod 755\` is octal; 7 = read+write+execute (binary 111), 5 = read+execute (binary 101).`,
      },
    ],
    faqs: [
      {
        q: 'Why do programmers use hexadecimal?',
        a: 'Hex is compact: 8 binary digits (11111111) compress into 2 hex digits (FF). This makes large binary numbers readable and writable.',
      },
      {
        q: 'How do I convert binary to hex quickly?',
        a: 'Group binary digits in sets of 4 (right to left), then convert each group to a hex digit: 1101 1010 → DA.',
      },
      {
        q: 'Can I convert negative numbers?',
        a: 'Yes. The converter handles negative numbers using standard two\'s complement representation for binary.',
      },
    ],
  },
  {
    slug: 'format-converter-json-yaml-toml-xml',
    title: 'Format Converter: JSON to YAML, TOML, XML Online',
    description: 'Convert between JSON, YAML, TOML, and XML instantly. All 12 combinations supported. Validate syntax instantly.',
    publishedAt: '2026-01-14',
    category: 'Converters',
    toolSlug: 'format-converter',
    keywords: ['format converter online', 'json to yaml', 'yaml to json', 'json to xml', 'toml converter'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'When to convert between data formats',
        body: `Different tools and languages prefer different formats:\n\n- **JSON** — JavaScript, APIs, web.\n- **YAML** — Configuration files (Kubernetes, Ansible, Docker Compose).\n- **TOML** — Configuration (Python Poetry, Rust Cargo).\n- **XML** — Legacy systems, SOAP APIs, document-oriented data.\n\nOften you need to convert between them: take a JSON API response and convert to YAML for a config file, or read a TOML config and output JSON for processing. MyDevTools Format Converter handles all 12 combinations.`,
      },
      {
        heading: 'Data structure equivalents',
        body: `All four formats represent the same data structures: objects/maps, arrays/lists, strings, numbers, and booleans. The syntax differs, but the underlying meaning is identical.`,
        code: `// Same data in four formats

// JSON
{"name": "Alice", "age": 30, "active": true}

// YAML
name: Alice
age: 30
active: true

// TOML
name = "Alice"
age = 30
active = true

// XML
<root>
  <name>Alice</name>
  <age>30</age>
  <active>true</active>
</root>`,
        codeLanguage: 'text',
      },
      {
        heading: 'Conversion workflow examples',
        body: `**API to Config** — Fetch JSON from an API, convert to YAML, edit in a text editor, convert back to JSON for processing.\n\n**Migration** — Convert legacy XML config to JSON or YAML for modern tooling.\n\n**Multi-language compatibility** — Convert JSON schema to TOML for Rust projects or YAML for Python projects.`,
      },
    ],
    faqs: [
      {
        q: 'What if my data has nested structures?',
        a: 'All formats support nesting. Arrays become lists in YAML, arrays in JSON, sequences in TOML, and XML elements.',
      },
      {
        q: 'Can I convert XML with attributes?',
        a: 'Yes, XML attributes are preserved in the conversion and typically become regular object properties in JSON/YAML/TOML.',
      },
      {
        q: 'Is there data loss when converting?',
        a: 'Minimal, if any. All four formats support the same core data types. Some format-specific features (XML namespaces, YAML anchors) may not map perfectly.',
      },
    ],
  },
  {
    slug: 'generate-qr-codes-online',
    title: 'Generate QR Codes Online: Text, URL, WiFi',
    description: 'Create QR codes from URLs, text, WiFi credentials, or vCards instantly. Download as PNG or SVG. No upload, fully browser-based.',
    publishedAt: '2026-01-15',
    category: 'Generators',
    toolSlug: 'qr-code-generator',
    keywords: ['qr code generator online', 'generate qr code', 'qr code maker', 'wifi qr code', 'qr code png'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'What are QR codes and why use them?',
        body: `QR (Quick Response) codes are 2D barcodes that store data — URLs, text, phone numbers, WiFi credentials — in a pattern that smartphones can scan. A single QR code replaces typing a long URL or password by hand.\n\nCommon uses: linking physical products to web pages, sharing WiFi passwords, contact information (vCards), event registrations, and payment details.`,
      },
      {
        heading: 'Types of QR code content',
        body: `**URL** — Most common. Scanned phones are redirected to the URL.\n\n**Plain text** — Display any message or data when scanned.\n\n**WiFi** — Encode SSID, password, and security type. Scanned phones auto-connect to the WiFi network.\n\n**vCard** — Store contact info (name, phone, email, address) as a scannable contact.\n\n**Phone number** — Initiate a call when scanned.\n\n**Email** — Compose an email when scanned.\n\n**SMS** — Send a preset text message when scanned.`,
      },
      {
        heading: 'QR code error correction and customization',
        body: `QR codes have built-in error correction: even if 30% of the code is damaged or obscured, it remains scannable. Higher error correction levels allow larger customizations (adding logos, colors).`,
        code: `// WiFi QR code data format
WIFI:T:WPA;S:NetworkName;P:Password;;

// vCard QR code
BEGIN:VCARD
FN:Alice Smith
TEL:+1234567890
EMAIL:alice@example.com
END:VCARD`,
        codeLanguage: 'text',
      },
      {
        heading: 'Download formats and sizing',
        body: `QR codes can be downloaded as PNG (raster) or SVG (vector). PNG is fine for fixed sizes; SVG scales infinitely without quality loss. MyDevTools lets you set size and error correction level before downloading.`,
      },
    ],
    faqs: [
      {
        q: 'Can I add a logo to the center of a QR code?',
        a: 'Logos are possible but reduce scannability. Use error correction level "H" (highest) if you plan to overlay a logo.',
      },
      {
        q: 'What if my QR code is damaged or partially obscured?',
        a: 'QR codes with "H" error correction can recover if up to 30% of the code is damaged. Higher error correction makes the code more robust but slightly larger.',
      },
      {
        q: 'Is it safe to generate QR codes in a browser?',
        a: 'Yes, QR generation is client-side only. Nothing leaves your browser.',
      },
    ],
  },
  {
    slug: 'markdown-to-html-live-preview',
    title: 'Markdown to HTML: Live Preview & Converter',
    description: 'Write Markdown and preview HTML output side-by-side. Convert Markdown to HTML instantly in your browser.',
    publishedAt: '2026-01-16',
    category: 'Converters',
    toolSlug: 'markdown-preview-html',
    keywords: ['markdown to html', 'markdown converter', 'markdown preview online', 'html to markdown'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'What is Markdown and why convert to HTML?',
        body: `Markdown is a simple, readable text format for creating rich documents. It uses plain-text syntax (*, **, ##) instead of tags, making it fast to write while staying readable even in raw form.\n\nHTML is the web standard but more verbose. Converting Markdown to HTML lets you:\n\n- Write documentation in a human-friendly format.\n- Generate web pages from Markdown sources.\n- Create blog posts or READMEs that render on GitHub and personal sites.\n- Build documentation sites (like this one).`,
      },
      {
        heading: 'Markdown syntax essentials',
        body: `**Headers** — \`# H1\`, \`## H2\`, etc.\n\n**Bold and italic** — \`**bold**\`, \`*italic*\`.\n\n**Lists** — \`-\` for unordered, \`1.\` for ordered.\n\n**Links** — \`[text](url)\`.\n\n**Code** — Backticks for inline (\`code\`), triple backticks for blocks.\n\n**Images** — \`![alt](url)\`.`,
        code: `# My Heading
This is **bold** and *italic* text.

- Item 1
- Item 2

[Link to example](https://example.com)

\`\`\`javascript
console.log("code block");
\`\`\``,
        codeLanguage: 'markdown',
      },
      {
        heading: 'Markdown to HTML conversion',
        body: `MyDevTools Markdown Preview lets you write Markdown on the left and see rendered HTML on the right in real time. Changes update instantly. You can also export the HTML for use on your site.`,
      },
      {
        heading: 'HTML to Markdown conversion',
        body: `Reverse the process: paste HTML and convert back to Markdown. Useful when you have old HTML content and want to migrate it to a Markdown-based system like a static site generator (Jekyll, Hugo, Next.js).`,
      },
    ],
    faqs: [
      {
        q: 'Can I use HTML tags inside Markdown?',
        a: 'Yes, most Markdown renderers allow raw HTML. Inline HTML like <strong>bold</strong> or <div> blocks are passed through.',
      },
      {
        q: 'What is the difference between Markdown and Markdown Extra?',
        a: 'Markdown Extra adds features like tables, footnotes, and definition lists. MyDevTools Markdown Preview uses a standard Markdown parser.',
      },
      {
        q: 'Can I export the HTML for use on a website?',
        a: 'Yes, copy the rendered HTML or download it. You may need to wrap it in proper <html> and <body> tags if using outside a framework.',
      },
    ],
  },
  {
    slug: 'email-address-validator-online',
    title: 'Email Validation: Check Address Format & MX Records',
    description: 'Validate email address format and check MX records instantly. Verify if an email domain has a mail server.',
    publishedAt: '2026-01-17',
    category: 'Validators',
    toolSlug: 'email-validator',
    keywords: ['email validator', 'email validation online', 'check email', 'mx record lookup', 'email checker'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why validate email addresses?',
        body: `Email validation catches typos and invalid formats before sending. There are two levels:\n\n1. **Syntax validation** — Check if the email matches RFC 5322 format (\`user@domain.ext\`).\n2. **Domain validation** — Check if the domain has mail servers (MX records).\n\nSyntax validation is fast and catches obvious typos. MX record checking confirms a domain actually receives email, but requires a DNS lookup and adds latency.`,
      },
      {
        heading: 'Email address format (RFC 5322)',
        body: `A valid email has:\n\n- A **local part** (username) — alphanumeric and special characters (. _ - + etc.)\n- An **@ symbol**\n- A **domain name** — must have at least one dot (example.com).\n- A **top-level domain** — at least 2 characters (com, org, uk, etc.)\n\nCommon invalid patterns:\n- Missing @ or domain.\n- Double @ signs.\n- Spaces or special characters in the local part (unless quoted).\n- Domain with no dots or invalid TLD.`,
        code: `// Valid emails
alice@example.com
alice.smith@example.co.uk
alice+tag@example.com

// Invalid emails
alice@example          (no TLD)
alice.example.com      (no @ sign)
alice@@example.com     (double @)
alice@.example.com     (empty local part)`,
        codeLanguage: 'text',
      },
      {
        heading: 'MX record checking',
        body: `An MX (Mail Exchange) record tells the internet how to deliver email to a domain. Every legitimate email domain should have at least one MX record pointing to a mail server.\n\nMyDevTools Email Validator checks if a domain has MX records, confirming it actually accepts email. This is more thorough than syntax checking but requires a DNS lookup from the server.`,
      },
      {
        heading: 'When to validate and when not to',
        body: `**Always validate:**\n- On signup forms (catch typos before account creation).\n- Before sending transactional emails (confirmation, reset links).\n\n**Consider MX checking:**\n- On critical workflows (newsletter signup, account recovery).\n- Not needed for every form — syntax validation alone is often sufficient.`,
      },
    ],
    faqs: [
      {
        q: 'What characters are valid in the local part of an email?',
        a: 'Alphanumerics (a-z, 0-9), dots (.), dashes (-), underscores (_), plus (+). Spaces and some special chars require quoting.',
      },
      {
        q: 'Can an email without an MX record still receive mail?',
        a: 'Technically no — without an MX record, mail servers do not know where to send email. Most legitimate domains have MX records.',
      },
      {
        q: 'Is email validation 100% accurate?',
        a: 'No tool is 100% accurate. Syntax validation catches obvious errors. MX checking confirms a domain can receive mail but does not validate the specific user account.',
      },
    ],
  },
  {
    slug: 'redis-cli-alternative-gui-online',
    title: 'Redis Commander: CLI Alternative for Connecting & Managing Redis',
    description: 'Connect to Redis instances from your browser. Browse keys, edit values, run commands, and flush patterns. No install needed.',
    publishedAt: '2026-01-18',
    category: 'Databases',
    toolSlug: 'redis-commander',
    keywords: ['redis cli online', 'redis gui', 'redis commander', 'redis browser', 'manage redis online'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is Redis and why use a GUI?',
        body: `Redis is an in-memory data store and cache used for sessions, real-time counters, pub/sub messaging, and job queues. The standard way to interact with Redis is the \`redis-cli\` command-line tool.\n\nA GUI alternative is useful when:\n\n- You want a visual interface to browse keys.\n- You need to inspect complex data types (hashes, lists, sets) without memorizing commands.\n- You want to manage Redis from a browser without SSH or \`redis-cli\` installed.\n- You are debugging and need to see what data is in Redis at a glance.`,
      },
      {
        heading: 'Connecting to Redis',
        body: `Redis requires a host, port, and optionally a password. Enter these into the Redis Commander:`,
        code: `// Local Redis (development)
Host: localhost
Port: 6379
Password: (empty)

// Remote Redis (production example)
Host: redis.example.com
Port: 6380
Password: your_redis_password`,
        codeLanguage: 'text',
      },
      {
        heading: 'Redis data types and operations',
        body: `Redis supports several data structures:\n\n**Strings** — Simple key-value pairs. \`SET mykey "Hello"\`.\n\n**Lists** — Ordered collections. \`LPUSH mylist "item1"\`.\n\n**Sets** — Unordered unique collections. \`SADD myset "member1"\`.\n\n**Hashes** — Key-value pairs within a key (like nested objects). \`HSET user:1 name "Alice"\`.\n\n**Sorted Sets** — Sets with scores for ordering. \`ZADD leaderboard 100 "player1"\`.\n\nRedis Commander lets you view and edit each type through an intuitive interface without memorizing command syntax.`,
      },
      {
        heading: 'Common use cases',
        body: `**Session storage** — Redis stores session data for web apps. Browse active sessions by key prefix.\n\n**Caching** — Store computed results with TTL. Monitor cache hits/misses.\n\n**Rate limiting** — Track request counts per user/IP.\n\n**Job queues** — Redis FIFO lists for background jobs. Check queue depth and pending items.\n\n**Leaderboards** — Sorted sets for game scores or rankings.`,
      },
      {
        heading: 'Security: credentials and encryption',
        body: `Redis credentials are sensitive. MyDevTools Redis Commander encrypts credentials with AES-256 in the browser before storage, so the server does not see plaintext passwords. For production, use Redis with password authentication or network-level security (firewall, VPN, SSH tunnel).`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to connect to a production Redis instance from an online tool?',
        a: 'Use an encrypted connection tool (HTTPS) and credentials encryption (like MyDevTools). For maximum security, use a firewall or SSH tunnel to restrict access.',
      },
      {
        q: 'Can I delete keys and clear data with Redis Commander?',
        a: 'Yes, the interface lets you delete keys and flush patterns. Be careful with production data — make backups first.',
      },
      {
        q: 'Does Redis Commander support Sentinel or Cluster modes?',
        a: 'MyDevTools Redis Commander connects to single Redis instances. For Sentinel or Cluster, use the native \`redis-cli\` tool or a more specialized client.',
      },
    ],
  },
  {
    slug: 'decode-ssl-certificate-pem-online',
    title: 'How to Decode SSL Certificates: Read PEM, X.509, CSR Online',
    description: 'Paste an SSL certificate (PEM format) or CSR and inspect subject, issuer, expiry, SANs, and SHA-256 fingerprint instantly.',
    publishedAt: '2026-01-19',
    category: 'Security',
    toolSlug: 'certificate-pem-decoder',
    keywords: ['certificate decoder', 'pem decoder', 'ssl certificate parser', 'x509 certificate', 'csr decoder'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why decode SSL certificates?',
        body: `SSL/TLS certificates authenticate servers and encrypt traffic. A certificate contains metadata: the domain it covers (Common Name and Subject Alternative Names), who issued it, and when it expires.\n\nDecoding a certificate helps when:\n\n- Debugging HTTPS connection errors.\n- Verifying a certificate matches a domain before deployment.\n- Checking expiration dates to prevent outages.\n- Inspecting Certificate Signing Requests (CSRs) before signing.\n- Auditing a server's certificate chain.`,
      },
      {
        heading: 'SSL certificate structure (X.509)',
        body: `An X.509 certificate contains:\n\n**Subject** — The domain owner (Common Name and Organization).\n\n**Subject Alternative Names (SANs)** — Additional domains covered by the certificate (example.com, *.example.com, www.example.com).\n\n**Issuer** — The Certificate Authority (CA) that signed it.\n\n**Valid From / Valid To** — Expiration dates. HTTPS warnings occur when the current date is outside this range.\n\n**Public Key** — Used to establish the encrypted connection.\n\n**Signature** — Cryptographic proof that the CA issued the certificate.\n\n**Serial Number** — Unique identifier for the certificate.\n\n**SHA-256 Fingerprint** — Hash of the entire certificate, useful for pinning.`,
        code: `# PEM format (begins and ends with header/footer)
-----BEGIN CERTIFICATE-----
MIIDrzCCAlegAwIBAgIQCDvgVpBCRrGfEwnt50uqWzANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
...
-----END CERTIFICATE-----`,
        codeLanguage: 'text',
      },
      {
        heading: 'Reading certificate output',
        body: `MyDevTools Certificate Decoder parses the PEM format and displays:\n\n- **Subject CN** — The primary domain (example.com).\n- **SANs** — Wildcard and additional domains covered.\n- **Valid From/To** — Expiration dates and remaining validity.\n- **Issuer** — Which CA signed it (Let's Encrypt, DigiCert, etc.).\n- **Key Type** — RSA, ECDSA, etc.\n- **SHA-256 Fingerprint** — For certificate pinning.\n\nLook for warnings: expired certificates, mismatched domains, or untrusted issuers.`,
      },
      {
        heading: 'Certificate Signing Requests (CSRs)',
        body: `A CSR is a request to a CA to sign a certificate. It contains the public key and subject information but is not yet signed. Decode CSRs to verify the domain and key before sending to a CA.`,
      },
      {
        heading: 'Common certificate issues',
        body: `**Expired certificate** — Renew before the "Valid To" date. Many hosting providers auto-renew (Let\'s Encrypt, managed SSL).\n\n**Domain mismatch** — The certificate CN or SANs do not match the domain being accessed. Re-issue or add the domain as a SAN.\n\n**Untrusted issuer** — The CA is not in the browser\'s trust store. Ensure the full certificate chain is served.\n\n**Self-signed certificate** — Valid for encryption but causes browser warnings. Use for internal testing only.`,
      },
    ],
    faqs: [
      {
        q: 'What is a SHA-256 fingerprint and why use it?',
        a: 'A fingerprint is a hash of the certificate. Use it for certificate pinning in apps: instead of trusting all CAs, pin specific certificates and reject others.',
      },
      {
        q: 'Can I decode a certificate without the private key?',
        a: 'Yes. The public certificate (PEM) contains all the metadata. The private key is separate and never included in the certificate.',
      },
      {
        q: 'How long is a typical SSL certificate valid?',
        a: 'Usually 1 year (Let\'s Encrypt, modern CA standard). Some CAs issue multi-year certificates, but renewal before expiry is best practice.',
      },
      {
        q: 'Can a certificate cover multiple domains?',
        a: 'Yes, via Subject Alternative Names (SANs). A single certificate can cover example.com, *.example.com, www.example.com, and other specified domains.',
      },
    ],
  },
  {
    slug: 'task-manager-todo-list-for-developers',
    title: 'Task Manager: To-Do List for Developers',
    description: 'Organize your work with a simple, browser-based to-do list. Track tasks, set priorities, and boost productivity without leaving your workflow.',
    publishedAt: '2026-01-20',
    category: 'Utilities',
    toolSlug: 'to-do',
    keywords: ['to do list', 'task manager', 'productivity app', 'todo list online', 'task organizer'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why developers need a task manager',
        body: `Coding involves context switching: bug fixes, features, code reviews, meetings, and interruptions. Without a clear task list, work gets scattered across browser tabs, Slack messages, and mental overhead.\n\nA simple to-do list helps you:\n\n- **Capture work instantly** — jot down tasks without leaving your editor.\n- **Prioritize** — decide what's urgent vs. deferrable.\n- **Reduce cognitive load** — stop remembering; let the tool track it.\n- **See progress** — checking off tasks is motivating and shows productivity.`,
      },
      {
        heading: 'Features of MyDevTools Task Manager',
        body: `- **Add tasks quickly** — keyboard-friendly interface.\n- **Set priority levels** — high, medium, low to focus on what matters.\n- **Check off completed tasks** — visual feedback as you work.\n- **Organize by project** — keep work grouped logically.\n- **Persistent storage** — tasks sync to your account, available across devices.\n- **No bloat** — simple and focused, not a complex project management tool.`,
      },
      {
        heading: 'How to use the task manager',
        body: `1. Click "Add Task" and type a task name.\n2. Optionally set priority (high/medium/low).\n3. Click the checkbox to mark complete.\n4. Delete or edit as needed.\n\nTasks are saved automatically. Use it for sprint planning, daily standups, or just keeping track of your current work.`,
      },
      {
        heading: 'Best practices for task management',
        body: `**Be specific** — "Fix login bug on mobile" beats "fix stuff".\n\n**Break down large tasks** — "Ship API endpoint" is too big; split it into "write tests," "implement endpoint," "update docs".\n\n**Review daily** — each morning, look at your list and reprioritize.\n\n**Capture everything** — don't rely on memory; tasks go into the list immediately.\n\n**Done is done** — completed tasks stay in history or archive.`,
      },
    ],
    faqs: [
      {
        q: 'Can I share tasks with my team?',
        a: 'MyDevTools Task Manager is personal to your account. For team collaboration, export your list or use a team tool like Asana or Monday.com.',
      },
      {
        q: 'Can I set due dates?',
        a: 'The current version prioritizes simplicity over features. For due dates and reminders, consider extending with browser automation or switching to a richer tool.',
      },
      {
        q: 'Are my tasks backed up?',
        a: 'Yes, tasks sync to your account. Sign in to any device and your tasks are there.',
      },
    ],
  },
  {
    slug: 'markdown-notes-app-for-developers',
    title: 'Markdown Notes: Quick Note-Taking for Developers',
    description: 'Create and organize Markdown notes online with zero friction. Sync across devices, search, and keep your knowledge base accessible.',
    publishedAt: '2026-01-21',
    category: 'Utilities',
    toolSlug: 'notes',
    keywords: ['notes app', 'markdown notes', 'quick notes online', 'developer notes', 'note-taking tool'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why Markdown notes for developers?',
        body: `Developers write a lot: code snippets, API documentation, architectural decisions, debugging notes, and quick reference guides. A Markdown-based note app is perfect because:\n\n- **Markdown is universal** — use the same format everywhere (GitHub, Notion, Hugo, etc.).\n- **Version-friendly** — plain text diff cleanly in git.\n- **Syntax highlighting** — code blocks are readable.\n- **Lightweight** — no bloated UI, just your text.`,
      },
      {
        heading: 'Markdown syntax quick reference',
        body: `- **Bold:** \`**text**\`\n- **Italic:** \`*text*\`\n- **Heading:** \`# Title\`\n- **Lists:** \`- item\`\n- **Code block:**\n\`\`\`\ncode here\n\`\`\`\n- **Link:** \`[text](url)\`\n- **Blockquote:** \`> quote\``,
      },
      {
        heading: 'How to organize your notes',
        body: `**By project** — one note per project, link-rich with setup steps.\n\n**By topic** — \`API design patterns,\` \`deployment checklist,\` \`debugging tips.\`\n\n**Quick reference** — terminal commands, environment setup, common errors.\n\n**Learning journal** — capture what you learned after each bug or feature.`,
      },
      {
        heading: 'MyDevTools Notes features',
        body: `- **Live Markdown preview** — see formatting as you type.\n- **Full-text search** — find notes by keyword.\n- **Cross-device sync** — write on desktop, read on phone.\n- **No install** — browser-based, zero friction.\n- **Encrypted on sync** — sensitive notes stay private.`,
      },
    ],
    faqs: [
      {
        q: 'Can I export my notes?',
        a: 'Download notes as Markdown files and use them anywhere. Copy-paste into GitHub, Notion, or your own site.',
      },
      {
        q: 'Is there offline support?',
        a: 'Notes sync when online. For offline editing, use a local Markdown editor and sync later.',
      },
      {
        q: 'Can I collaborate on notes?',
        a: 'Current version is personal. For team notes, export to a shared Git repo or collaborative tool.',
      },
    ],
  },
  {
    slug: 'bookmark-manager-for-developer-resources',
    title: 'Bookmark Manager: Organize Developer Resources Online',
    description: 'Save and tag your favorite developer links, articles, and tools. Instant access from anywhere without browser clutter.',
    publishedAt: '2026-01-22',
    category: 'Utilities',
    toolSlug: 'bookmarks',
    keywords: ['bookmark manager', 'link organizer', 'save links online', 'developer bookmarks', 'bookmark organizer'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why a centralized bookmark manager?',
        body: `Browser bookmarks are siloed per device. A cloud-based bookmark manager lets you:\n\n- **Keep one master list** — accessible from any browser or device.\n- **Tag and categorize** — find links by topic in seconds.\n- **Share links** — copy public links to send colleagues.\n- **Search full-text** — search note content, not just titles.\n- **Never lose a link** — backup all your research and resources.`,
      },
      {
        heading: 'Organizing bookmarks effectively',
        body: `**By topic:** \`JavaScript patterns,\` \`DevOps,\` \`CSS tricks,\` \`API docs.\`\n\n**By purpose:** \`must-read,\` \`tools,\` \`learning,\` \`reference.\`\n\n**By status:** \`backlog,\` \`reading,\` \`done.\`\n\nAdd descriptions to bookmarks so you remember why you saved it.`,
      },
      {
        heading: 'Bookmark manager workflow',
        body: `1. **Find a resource** — article, tool, documentation.\n2. **Click "Save"** — add title, URL, tags, and notes.\n3. **Tag it** — assign categories for later discovery.\n4. **Search later** — full-text search across title, URL, and notes.\n5. **Share** — copy the link to send to teammates.`,
      },
      {
        heading: 'MyDevTools Bookmarks features',
        body: `- **Tags and folders** — organize hundreds of links.\n- **Full-text search** — find by keyword, not just title.\n- **Public/private** — share specific bookmarks or keep personal.\n- **Rich notes** — add context to why you saved a link.\n- **Sync across devices** — your bookmarks follow you.`,
      },
    ],
    faqs: [
      {
        q: 'Can I import from browser bookmarks?',
        a: 'Export from your browser as HTML and import into MyDevTools to migrate your collection.',
      },
      {
        q: 'Can I export my bookmarks?',
        a: 'Yes, export as HTML or JSON for backup or migration to another tool.',
      },
      {
        q: 'What if a link dies (404)?',
        a: 'Bookmarks point to live URLs. Archive services like archive.org can retrieve old pages if links disappear.',
      },
    ],
  },
  {
    slug: 'environment-variables-manager-dotenv-online',
    title: 'Environment Manager: Secure .env Variable Storage',
    description: 'Store and organize environment variables across projects and environments (dev/staging/prod). AES-256 encrypted on your device.',
    publishedAt: '2026-01-23',
    category: 'Security',
    toolSlug: 'environment-manager',
    keywords: ['environment variables', 'env file', 'dotenv manager', 'secrets manager', 'encrypted env', 'devops'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why a centralized env var manager?',
        body: `Environment variables configure applications across different environments. Storing them securely and organizing them is critical:\n\n- **Never commit secrets to git** — \`.env\` files belong in \`.gitignore\`.\n- **Sync safely** — developers need the same values locally.\n- **Per-environment config** — dev, staging, and production have different values.\n- **No plaintext** — encrypt sensitive credentials.\n- **Access control** — team members see only what they need.`,
      },
      {
        heading: 'Environment variable structure',
        body: `Variables are typically key-value pairs:\n\n\`\`\`\nDATABASE_URL=postgresql://user:pass@host/db\nAPI_KEY=sk_live_abc123xyz...\nJWT_SECRET=your_secret_key_here\nLOG_LEVEL=debug\nNODE_ENV=development\n\`\`\`\n\nEach environment (dev/staging/prod) has different values for the same keys.`,
        codeLanguage: 'bash',
      },
      {
        heading: 'Managing .env files securely',
        body: `**Local development:** Copy \`.env.example\` (no secrets) and fill in local values.\n\n**Team sharing:** Use MyDevTools or a secrets manager to distribute values securely.\n\n**CI/CD:** Inject vars at build time, never check them in.\n\n**Rotation:** Change secrets regularly, especially API keys and database passwords.`,
      },
      {
        heading: 'MyDevTools Environment Manager',
        body: `- **Encrypted storage** — AES-256-GCM encryption in your browser before sync.\n- **Per-project organization** — separate vars for different apps.\n- **Environment templates** — dev/staging/prod presets.\n- **Export to .env format** — copy directly into your project.\n- **Search and filter** — find vars by key or project.`,
      },
      {
        heading: 'Best practices for environment secrets',
        body: `- **Never hardcode secrets** — always use environment variables.\n- **Rotate regularly** — change API keys quarterly or after team changes.\n- **Limit access** — only developers who need a value see it.\n- **Audit logs** — track who accessed sensitive vars.\n- **Use .env.example** — document required vars without values.`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to store passwords in an online tool?',
        a: 'MyDevTools encrypts secrets in your browser with AES-256 before sending to servers. For maximum security, use a dedicated secrets manager like 1Password, Vault, or AWS Secrets Manager.',
      },
      {
        q: 'Can I share environment vars with my team?',
        a: 'Export from MyDevTools and securely distribute (encrypted email, password-protected link). For team workflows, consider HashiCorp Vault or cloud-native secrets managers.',
      },
      {
        q: 'What variables are usually needed?',
        a: 'Database URL, API keys, JWT secrets, OAuth credentials, feature flags, log levels, and third-party service credentials.',
      },
    ],
  },
  {
    slug: 'json-schema-generator-type-models-online',
    title: 'JSON Schema Generator: Create Type Models from JSON',
    description: 'Generate JSON Schema or typed models (TypeScript, Python, Go, Rust, Java) from sample JSON instantly. No install required.',
    publishedAt: '2026-01-24',
    category: 'Formatters',
    toolSlug: 'json-schema-generator',
    keywords: ['json schema', 'json schema generator', 'typescript types from json', 'pydantic model', 'go struct'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is JSON Schema?',
        body: `JSON Schema is a declarative language for validating and documenting JSON. It defines:\n\n- Which fields are required.\n- Expected data types (string, number, object, array).\n- Constraints (min/max, pattern matching, enum values).\n- Nested object structures.\n\nYou can use JSON Schema to validate API responses, generate type definitions, and auto-generate documentation.`,
      },
      {
        heading: 'From JSON sample to typed models',
        body: `If you have a sample API response, you can infer a schema and generate type definitions. MyDevTools scans your JSON and produces:\n\n- **JSON Schema** (Draft 2020-12) — for API documentation and validation.\n- **TypeScript types** — export interfaces for type safety.\n- **Python models** — Pydantic dataclasses.\n- **Go structs** — Unmarshal into typed structs.\n- **Rust types** — serde-compatible.\n- **Java / C# / Dart / Swift** — language-specific types.`,
      },
      {
        heading: 'Example: API response to TypeScript',
        body: `Sample JSON response:\n\n\`\`\`json\n{\n  "id": 123,\n  "name": "Alice",\n  "email": "alice@example.com",\n  "posts": [\n    {"title": "First Post", "published": true}\n  ]\n}\n\`\`\`\n\nGenerated TypeScript:\n\n\`\`\`typescript\ninterface User {\n  id: number;\n  name: string;\n  email: string;\n  posts: Post[];\n}\n\ninterface Post {\n  title: string;\n  published: boolean;\n}\n\`\`\``,
        codeLanguage: 'typescript',
      },
      {
        heading: 'When to use schema generation',
        body: `- **API integration** — model responses from third-party APIs.\n- **Backend validation** — validate incoming JSON with schema rules.\n- **Frontend type safety** — strong types in TypeScript/Python.\n- **Documentation** — auto-generate API schema docs.\n- **Testing** — generate mock data matching the schema.`,
      },
    ],
    faqs: [
      {
        q: 'Can I generate models from incomplete JSON samples?',
        a: 'Yes, but inferred types may be loose. Add more examples to refine. Optional fields are inferred if some samples lack them.',
      },
      {
        q: 'Does this support OpenAPI / Swagger?',
        a: 'Current version generates JSON Schema and language-specific types. OpenAPI spec generation may be added later.',
      },
      {
        q: 'Can I customize the generated code?',
        a: 'Yes, export and edit. The generator is a starting point; refine constraints and field names in your IDE.',
      },
    ],
  },
  {
    slug: 's3-drive-aws-bucket-manager-online',
    title: 'S3 Drive: Browse and Manage AWS S3 Buckets Online',
    description: 'Connect to AWS S3 or DigitalOcean Spaces, browse objects, upload/download files. Credentials encrypted locally before storage.',
    publishedAt: '2026-01-26',
    category: 'Databases',
    toolSlug: 's3-drive',
    keywords: ['s3 bucket manager', 'aws s3 client', 'digitalocean spaces', 's3 browser', 'cloud storage manager'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Manage cloud storage without the CLI',
        body: `AWS S3 and DigitalOcean Spaces are object storage services. The AWS CLI is powerful but requires installation and terminal familiarity. A web-based S3 manager offers:\n\n- **Browse buckets** — navigate folder-like structures.\n- **Upload files** — drag-and-drop or select files.\n- **Download objects** — fetch any file directly.\n- **Delete or move** — manage objects without CLI commands.\n- **Credentials encrypted** — your AWS keys stay local, never exposed to servers.`,
      },
      {
        heading: 'S3 bucket structure',
        body: `S3 is flat object storage, but you can use \`/\` in object keys to simulate folders:\n\n\`\`\`\nbucket-name/\n  uploads/\n    image.jpg\n  logs/\n    2026-01/\n      access.log\n\`\`\`\n\nS3 Drive displays this as a tree, like a file system.`,
        codeLanguage: 'text',
      },
      {
        heading: 'Getting AWS credentials',
        body: `1. Open AWS IAM console.\n2. Create an access key pair (Access Key ID + Secret Access Key).\n3. Optionally attach a policy limiting access to specific buckets.\n4. Paste credentials into S3 Drive (encrypted locally).\n\nNever share or commit credentials. Use IAM roles in production.`,
      },
      {
        heading: 'Features',
        body: `- **Multi-bucket support** — manage multiple buckets from one dashboard.\n- **Drag-and-drop upload** — works in modern browsers.\n- **Batch operations** — delete multiple objects at once.\n- **Object metadata** — view size, modified date, and storage class.\n- **Signed URLs** — generate temporary public links (optional).`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to paste AWS credentials into a web tool?',
        a: 'MyDevTools encrypts credentials with AES-256 in your browser before sync. For maximum security, use AWS temporary credentials (STS) or bucket-specific IAM policies.',
      },
      {
        q: 'Can I upload large files?',
        a: 'Browser uploads are limited by RAM. For large files, use S3\\\'s multipart upload via the CLI or AWS Console.',
      },
      {
        q: 'Does S3 Drive work with other cloud storage?',
        a: 'DigitalOcean Spaces is S3-compatible. Any S3-compatible service should work.',
      },
    ],
  },
  {
    slug: 'url-encoder-decoder-percent-encoding',
    title: 'URL Encoder/Decoder: Encode Text for URLs & URIs',
    description: 'Percent-encode text for query strings and URI components. Decode encoded text back to readable format. UTF-8 support.',
    publishedAt: '2026-01-27',
    category: 'Converters',
    toolSlug: 'url-encode',
    keywords: ['url encode', 'url decode', 'percent encode', 'uri encoding', 'query string encode'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why encode URLs?',
        body: `URLs have reserved characters (\`?\`, \`&\`, \`=\`, \`#\`) that have special meaning. To include these in data (query strings, fragments), they must be percent-encoded:\n\n\`hello world\` → \`hello%20world\`\n\n\`user@example.com\` → \`user%40example.com\`\n\nThis ensures URLs are unambiguous and parseable.`,
      },
      {
        heading: 'Percent-encoding basics',
        body: `Percent-encoding replaces special characters with \`%\` followed by a hex code:\n\n- Space \` \` = \`%20\`\n- Hash \`#\` = \`%23\`\n- Ampersand \`&\` = \`%26\`\n- Equals \`=\` = \`%3D\`\n- At \`@\` = \`%40\`\n\nNon-ASCII characters (accents, emojis, etc.) are UTF-8 encoded then percent-encoded.`,
      },
      {
        heading: 'URL encoding in practice',
        body: `**Query string:**\n\n\`\`\`\nhttps://example.com/search?q=hello+world&sort=date\n\`\`\`\n\nHere, \`hello+world\` is encoded (spaces as \`+\` or \`%20\`).\n\n**Fragment / Anchor:**\n\n\`\`\`\nhttps://example.com/page#section-with-spaces\n\`\`\`\n\nFragments are also percent-encoded for special chars.`,
        codeLanguage: 'text',
      },
      {
        heading: 'Common encoding scenarios',
        body: `- **Search queries** — user input with spaces and punctuation.\n- **API parameters** — encoding user data sent as query strings.\n- **Email links** — mailto: links with subject lines.\n- **File paths** — spaces and special chars in file names.`,
      },
    ],
    faqs: [
      {
        q: 'Is \`+\` or \`%20\` better for spaces?',
        a: 'In query strings, \`+\` is traditional but \`%20\` is more universal. Use \`%20\` for fragments and paths.',
      },
      {
        q: 'Do I need to encode the entire URL?',
        a: 'No, only encode the data portion (query values, fragment). The protocol and domain are left as-is.',
      },
      {
        q: 'What about international characters?',
        a: 'Encode as UTF-8 first, then percent-encode each byte. A tool does this automatically.',
      },
    ],
  },
  {
    slug: 'generate-random-api-keys-secrets-online',
    title: 'Secret Generator: Create Random API Keys & Tokens Online',
    description: 'Generate cryptographically random secrets, API keys, and tokens with customizable length and alphabet.',
    publishedAt: '2026-01-28',
    category: 'Security',
    toolSlug: 'secret-api-key-generator',
    keywords: ['api key generator', 'secret generator', 'random token', 'crypto random string', 'key generator'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why generate strong secrets?',
        body: `API keys and secrets must be unpredictable and long. Weak secrets are vulnerable to brute force and attacks:\n\n- **Bad:** \`secret123\`, \`password\`, sequential numbers.\n- **Good:** 32+ character random strings using crypto-secure randomness.\n\nCryptographic randomness ensures no patterns or repetition.`,
      },
      {
        heading: 'Types of secrets you might generate',
        body: `- **API keys** — authenticate requests to your API.\n- **OAuth tokens** — long-lived or refresh tokens.\n- **Webhook secrets** — sign webhook payloads for verification.\n- **JWT secrets** — sign JSON Web Tokens (HMAC-SHA256).\n- **Database passwords** — strong random credentials.\n- **Session tokens** — temporary identifiers for user sessions.`,
      },
      {
        heading: 'Configurable secret generation',
        body: `**Length:** Longer is better. 32-64 characters recommended.\n\n**Alphabet:**\n- Alphanumeric (a-z, A-Z, 0-9)\n- Hex (0-9, a-f) — safer for some systems.\n- Full ASCII — includes symbols like \`!@#\`.\n- Base62 — alphanumeric without symbols.\n- Custom — select specific characters.\n\nMyDevTools uses \`crypto.getRandomValues()\` for cryptographic strength.`,
      },
      {
        heading: 'Best practices for secrets',
        body: `- **Generate offline** — use a browser-based tool, no server transmission.\n- **Store securely** — environment variables, secrets manager, not hardcoded.\n- **Rotate regularly** — change secrets quarterly or after incidents.\n- **Audit access** — track who has each secret.\n- **Never commit** — exclude \`.env\` and secrets from version control.`,
      },
    ],
    faqs: [
      {
        q: 'Is browser-based generation truly random?',
        a: 'Yes, \`crypto.getRandomValues()\` is cryptographically secure. It uses OS randomness (entropy from hardware and kernel).',
      },
      {
        q: 'Can I regenerate the same secret?',
        a: 'No, cryptographic randomness is non-deterministic. Regenerating produces a different secret each time.',
      },
      {
        q: 'How do I store generated secrets?',
        a: 'Use environment variables, secrets managers (AWS Secrets Manager, HashiCorp Vault, 1Password), or encrypted config files. Never hardcode.',
      },
    ],
  },
  {
    slug: 'dns-lookup-records-checker-online',
    title: 'DNS Lookup: Check A, MX, TXT, NS Records Online',
    description: 'Query DNS records for any domain: A, AAAA, MX, CNAME, TXT, NS, SOA, CAA, and PTR. Instant lookup with TTL and details.',
    publishedAt: '2026-01-29',
    category: 'Network & API',
    toolSlug: 'dns-lookup',
    keywords: ['dns lookup', 'dns checker', 'mx record lookup', 'txt record lookup', 'dns records'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is DNS?',
        body: `The Domain Name System (DNS) translates human-readable domain names to IP addresses. When you type \`example.com\` in a browser, DNS queries nameservers to find the IP of the server hosting that domain.\n\nDNS records are stored in different types, each serving a purpose:`,
      },
      {
        heading: 'Common DNS record types',
        body: `- **A** — Maps domain to IPv4 address. \`example.com → 93.184.216.34\`\n- **AAAA** — Maps to IPv6 address.\n- **CNAME** — Canonical name (alias). \`www.example.com → example.com\`\n- **MX** — Mail exchange servers. Routes email to mail servers.\n- **TXT** — Text records. Used for email authentication (SPF, DKIM, DMARC).\n- **NS** — Nameservers. Authoritative servers for the domain.\n- **SOA** — Start of Authority. Metadata about the zone.\n- **CAA** — Certification Authority Authorization. Restricts SSL cert issuance.`,
      },
      {
        heading: 'DNS lookup scenarios',
        body: `**Email issues** — Check MX records to ensure mail is routing correctly.\n\n**SSL certificate warnings** — Verify domain A record matches server IP.\n\n**Email spoofing prevention** — Check SPF/DKIM/DMARC TXT records.\n\n**Domain migration** — Update A/CNAME records when moving servers.\n\n**Debugging nameservers** — Verify NS records point to correct nameservers.`,
      },
      {
        heading: 'How to read DNS lookup results',
        body: `**TTL (Time To Live)** — Seconds before DNS caches expire. Lower TTL = faster updates but more queries.\n\n**Priority (MX records)** — Lower number = higher priority. Mail servers are tried in order.\n\n**Flags (SOA, DKIM)** — Metadata about record flags and policies.`,
      },
    ],
    faqs: [
      {
        q: 'Why does my DNS change take time?',
        a: 'DNS changes propagate via caches. TTL determines how long caches hold old records. Wait for TTL to expire before rechecking.',
      },
      {
        q: 'Can I change DNS records with this tool?',
        a: 'This tool is read-only. Changes are made in your domain registrar or hosting DNS panel.',
      },
      {
        q: 'What if a record is missing?',
        a: 'The nameserver has no record for that type. Add it in your DNS provider\\\'s control panel.',
      },
    ],
  },
  {
    slug: 'encrypt-decrypt-text-aes-gcm-online',
    title: 'Encryption Playground: AES-256-GCM Encrypt/Decrypt Online',
    description: 'Encrypt text using AES-GCM with a passphrase or raw key. Decrypt messages. Educational and client-side secure.',
    publishedAt: '2026-01-30',
    category: 'Security',
    toolSlug: 'encryption-playground',
    keywords: ['aes gcm', 'aes 256 encryption', 'encrypt online', 'decrypt text', 'web crypto api'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'AES-GCM encryption basics',
        body: `AES-GCM (Galois/Counter Mode) is a symmetric encryption algorithm that:\n\n- **Encrypts** — scrambles plaintext so only someone with the key can read it.\n- **Authenticates** — verifies the data hasn't been tampered with.\n- **256-bit key** — extremely strong (2^256 possible keys).\n\nAES-GCM is used in:\n- TLS/HTTPS (your browser uses it).\n- File encryption tools (7-Zip, VeraCrypt).\n- Password managers (1Password, Bitwarden).`,
      },
      {
        heading: 'Symmetric vs asymmetric encryption',
        body: `**Symmetric** (AES-GCM) — same key encrypts and decrypts. Fast, but both parties need the key.\n\n**Asymmetric** (RSA) — public key encrypts, private key decrypts. Slower, enables key exchange.\n\nFor this playground, we use symmetric: you encrypt with a passphrase, decrypt with the same passphrase.`,
      },
      {
        heading: 'How encryption works in MyDevTools',
        body: `1. **Raw key mode** — Provide a 32-byte hex key (256 bits). Use for deterministic encryption.\n2. **Passphrase mode** — Enter a password. PBKDF2-SHA256 derives a 256-bit key, then encrypts.\n\nThe output is a JSON bundle:\n\n\`\`\`json\n{\n  "ciphertext": "...",\n  "iv": "...",\n  "tag": "..."\n}\n\`\`\`\n\nShare this bundle; decrypt by pasting it back with the same passphrase.`,
        codeLanguage: 'json',
      },
      {
        heading: 'Encryption workflow',
        body: `1. **Type or paste plaintext.**\n2. **Choose mode:** raw key or passphrase.\n3. **Encrypt.** Output is a JSON bundle.\n4. **Share safely** — paste the JSON to someone.\n5. **Decrypt** — they paste the JSON and enter your passphrase.`,
      },
      {
        heading: 'When to use',
        body: `- **Learning** — understand how encryption works.\n- **Quick encryption** — share sensitive data via email (encrypted, not plaintext).\n- **Testing** — verify encryption/decryption in applications.\n- **Not for production** — use dedicated security libraries and key management.`,
      },
    ],
    faqs: [
      {
        q: 'Is this secure for real use?',
        a: 'Encryption is secure, but browser-based key management is not enterprise-grade. Use a password manager or key vault for production secrets.',
      },
      {
        q: 'What if I forget the passphrase?',
        a: 'The encrypted data is unrecoverable. Always store passphrases securely.',
      },
      {
        q: 'Can I encrypt files?',
        a: 'Current version handles text. For files, use dedicated tools like 7-Zip, VeraCrypt, or gpg.',
      },
    ],
  },
  {
    slug: 'lorem-ipsum-placeholder-text-generator',
    title: 'Lorem Ipsum Generator: Placeholder Text for Mockups',
    description: 'Generate Lorem Ipsum text as paragraphs, sentences, words, or lists. Export as plain text or HTML.',
    publishedAt: '2026-01-31',
    category: 'Generators',
    toolSlug: 'lorem-ipsum',
    keywords: ['lorem ipsum', 'placeholder text', 'dummy text', 'latin filler', 'mockup text'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'What is Lorem Ipsum?',
        body: `Lorem Ipsum is dummy text based on classical Latin. Designers use it to fill layouts before real content is ready. It looks like readable prose but contains no meaningful words, letting you focus on design rather than reading.\n\nSample: "Lorem ipsum dolor sit amet, consectetur adipiscing elit..."`,
      },
      {
        heading: 'Why use placeholder text?',
        body: `- **Design mockups** — test layout with various text lengths.\n- **Wireframes** — fill content areas before copy is written.\n- **Presentations** — show design without distracting content.\n- **Avoiding bias** — neutral placeholder instead of real data.\n- **Print/PDF testing** — ensure text wraps correctly.`,
      },
      {
        heading: 'Types of Lorem Ipsum',
        body: `- **Paragraphs** — full blocks for body content.\n- **Sentences** — single sentences for short copy.\n- **Words** — individual words for lists or tags.\n- **Lists** — bulleted items for navbar or sidebars.\n\nCustomize length: 1, 2, 3+ sentences/paragraphs.`,
      },
      {
        heading: 'Export formats',
        body: `- **Plain text** — copy-paste into editors.\n- **HTML** — \`<p>\`, \`<li>\` tags for web layouts.\n- **Markdown** — for documentation.\n- **Copy button** — one-click copying to clipboard.`,
      },
    ],
    faqs: [
      {
        q: 'Is Lorem Ipsum the only option?',
        a: 'Other placeholder text exists (Bacon Ipsum, Hipster Ipsum). Lorem Ipsum is the standard and most universal.',
      },
      {
        q: 'Should I ship Lorem Ipsum to production?',
        a: 'No, always replace with real copy before launching. Use for design and testing only.',
      },
      {
        q: 'Can I customize the content?',
        a: 'Standard Lorem Ipsum is fixed. For custom placeholder, write your own or use a list tool.',
      },
    ],
  },
  {
    slug: 'color-picker-converter-hex-rgb-hsl',
    title: 'Color Picker & Converter: HEX, RGB, HSL Online',
    description: 'Pick colors or convert between HEX, RGB, and HSL formats. Generate harmonic palettes (shades, complementary, triadic).',
    publishedAt: '2026-02-01',
    category: 'Formatters',
    toolSlug: 'color-picker',
    keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'palette generator'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Color formats explained',
        body: `Designers and developers use different color formats:\n\n**HEX** — \`#FF5733\`. Compact, used in CSS and design tools.\n\n**RGB** — \`rgb(255, 87, 51)\`. Red, Green, Blue values (0-255). Used in web and programming.\n\n**HSL** — \`hsl(9, 100%, 60%)\`. Hue (0-360°), Saturation (0-100%), Lightness (0-100%). Intuitive for designers.`,
      },
      {
        heading: 'Using a color picker',
        body: `1. **Click the color picker** — opens a visual selector.\n2. **Select a hue** — drag along the color spectrum.\n3. **Pick saturation & lightness** — adjust in the square.\n4. **Copy the result** — grab HEX, RGB, or HSL.\n\nEasy for quick color exploration without guessing hex codes.`,
      },
      {
        heading: 'Color conversion',
        body: `Convert between formats seamlessly:\n\n\`#FF5733\` ↔ \`rgb(255, 87, 51)\` ↔ \`hsl(9, 100%, 60%)\`\n\nUseful when copying colors between tools (design software, CSS, iOS app code).`,
      },
      {
        heading: 'Generating harmonic palettes',
        body: `A harmonic palette is a set of colors that look good together:\n\n- **Shades** — darker and lighter versions of the base color.\n- **Complementary** — opposite color on the color wheel (high contrast).\n- **Triadic** — three colors evenly spaced (vibrant).\n- **Analogous** — nearby colors (harmonious).\n- **Monochromatic** — single hue with varying lightness.`,
      },
    ],
    faqs: [
      {
        q: 'Which format should I use in CSS?',
        a: 'All three work. HEX is compact, RGB is precise, HSL is intuitive. Use your preference.',
      },
      {
        q: 'Can I pick colors from an image?',
        a: 'Current version uses a visual picker. To sample from images, upload to a color sampling tool or use browser DevTools.',
      },
      {
        q: 'What is color blindness accessibility?',
        a: 'Some users can\'t distinguish red/green or blue/yellow. Use contrast and shape cues, not just color. A contrast checker tool helps verify.',
      },
    ],
  },
  {
    slug: 'wcag-contrast-checker-accessibility-colors',
    title: 'WCAG Contrast Checker: Ensure Text Accessibility',
    description: 'Measure WCAG 2.1 contrast between colors. Check AA and AAA pass/fail for normal and large text.',
    publishedAt: '2026-02-02',
    category: 'Validators',
    toolSlug: 'contrast-checker',
    keywords: ['wcag contrast', 'contrast ratio', 'aa aaa', 'accessibility checker', 'color contrast ratio'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why contrast matters',
        body: `Web Content Accessibility Guidelines (WCAG) require sufficient contrast between text and background. This ensures:\n\n- **Readability for everyone** — people with low vision.\n- **Legal compliance** — ADA (US), AODA (Canada), EN 301 549 (EU).\n- **User experience** — readable text on all devices.`,
      },
      {
        heading: 'WCAG contrast levels',
        body: `**Level AA** (minimum standard)\n- Normal text (< 18pt): 4.5:1 ratio\n- Large text (≥ 18pt): 3:1 ratio\n\n**Level AAA** (enhanced)\n- Normal text: 7:1 ratio\n- Large text: 4.5:1 ratio\n\n**Level A** (insufficient) — 3:1 ratio (for large text only)\n\nStrive for AA or AAA. Higher ratio = easier to read.`,
      },
      {
        heading: 'Testing your design',
        body: `1. **Pick text color** (foreground).\n2. **Pick background color**.\n3. **See the contrast ratio.**\n4. **Check AA/AAA status.**\n5. **Adjust if needed** — increase contrast or darken/lighten colors.`,
      },
      {
        heading: 'Common failures',
        body: `- Light gray text (#CCCCCC) on white — fails most standards.\n- Colored text on colored backgrounds — must have high ratio.\n- Small text requires higher contrast than large text (due to visual acuity).`,
      },
    ],
    faqs: [
      {
        q: 'What\'s a "large" text size?',
        a: '18pt or 24px (1.5em) and larger, or 14pt and bold.',
      },
      {
        q: 'Does this check images and icons?',
        a: 'Current version checks text. Graphical elements have different rules (3:1 minimum).',
      },
      {
        q: 'Is AA sufficient?',
        a: 'AA is standard. AAA is recommended for critical content (healthcare, legal). Aim high.',
      },
    ],
  },
  {
    slug: 'text-diff-checker-side-by-side-compare',
    title: 'Text Diff Checker: Compare Text Side by Side',
    description: 'Compare two texts and highlight additions (green) and deletions (red). Fast, browser-based diff tool.',
    publishedAt: '2026-02-03',
    category: 'Formatters',
    toolSlug: 'diff-checker',
    keywords: ['text diff', 'diff checker', 'side by side compare', 'line diff', 'text compare'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Why use a diff tool?',
        body: `Comparing two texts manually is tedious and error-prone. A diff tool:\n\n- **Highlights changes** — green for additions, red for deletions.\n- **Line-by-line** — shows exactly what changed.\n- **Ignores whitespace** — optionally ignore spacing changes.\n- **Fast feedback** — instant results, no waiting.`,
      },
      {
        heading: 'Use cases',
        body: `- **Code review** — compare old and new versions of code.\n- **Document edits** — see what changed between drafts.\n- **Configuration changes** — verify before deploying.\n- **Data validation** — compare expected vs. actual output.\n- **Git commit diffs** — visualize changes without terminal.`,
      },
      {
        heading: 'How to use',
        body: `1. **Paste text 1** into the left pane (original).\n2. **Paste text 2** into the right pane (modified).\n3. **Click "Compare"** or auto-diff on paste.\n4. **Review highlights** — red = removed, green = added.\n5. **Adjust options** — ignore case, ignore whitespace, etc.`,
      },
      {
        heading: 'Reading diff output',
        body: `- **Red lines** — deleted from text 1.\n- **Green lines** — added in text 2.\n- **Gray lines** — unchanged context.\n- **Inline highlights** — specific character changes within a line.`,
      },
    ],
    faqs: [
      {
        q: 'Can I compare files?',
        a: 'Copy-paste file contents or upload. Browser tools are limited by memory for very large files.',
      },
      {
        q: 'Does it handle binary files?',
        a: 'No, diff is for text. Use git or specialized tools for binary diffs.',
      },
      {
        q: 'Is "ignore whitespace" helpful?',
        a: 'Yes, if comparing code with formatting changes. Toggle it to see meaningful vs. stylistic changes.',
      },
    ],
  },
  {
    slug: 'image-compressor-online-reduce-file-size',
    title: 'Image Compressor: Reduce JPEG, PNG, WebP File Size',
    description: 'Compress images locally in your browser with a quality slider. No server upload, instant download.',
    publishedAt: '2026-02-04',
    category: 'Converters',
    toolSlug: 'image-compressor',
    keywords: ['compress image', 'image compressor', 'reduce image size', 'jpeg compression', 'png optimize'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why compress images?',
        body: `Images are often the largest assets on web pages. Compression reduces file size, improving:\n\n- **Page load speed** — faster downloads, better Core Web Vitals.\n- **Bandwidth costs** — less data served = lower bills.\n- **Mobile experience** — smaller files for users on slow networks.\n- **SEO** — faster pages rank better.`,
      },
      {
        heading: 'Image formats and compression',
        body: `**JPEG** — Lossy compression. Photos compress well (good for photos).\n\n**PNG** — Lossless compression. Best for graphics and transparency.\n\n**WebP** — Modern format, smaller than JPEG/PNG. Not all browsers support it yet.\n\n**AVIF** — Newer, even smaller, but limited browser support.`,
      },
      {
        heading: 'Lossy vs lossless',
        body: `**Lossy** — Removes some data but is imperceptible. JPEG quality slider trades quality for size. 70-80% quality is usually ideal.\n\n**Lossless** — Keeps all data, compresses redundancy. PNG is lossless; file sizes are larger.`,
      },
      {
        heading: 'Compression workflow',
        body: `1. **Upload image** — drag and drop or select file.\n2. **Set quality** — slider from 0 (tiny, ugly) to 100 (large, perfect).\n3. **Preview** — see the result side by side.\n4. **Download** — save compressed version to your device.`,
      },
    ],
    faqs: [
      {
        q: 'What\'s the ideal quality setting?',
        a: '70-85% is typical. Check visually; compression artifacts become noticeable below 60%.',
      },
      {
        q: 'Can I batch compress multiple images?',
        a: 'Current version is one-at-a-time. Use ImageMagick, ImageOptim, or bulk tools for batch compression.',
      },
      {
        q: 'Should I use WebP?',
        a: 'Yes, for new projects. Provide JPEG fallback for old browsers. Use <picture> tag for browser-specific serving.',
      },
    ],
  },
  {
    slug: 'css-gradient-builder-linear-radial-online',
    title: 'CSS Gradient Builder: Visual Gradient Generator',
    description: 'Create linear and radial CSS gradients visually. Add color stops, adjust angles, copy CSS instantly.',
    publishedAt: '2026-02-05',
    category: 'Formatters',
    toolSlug: 'css-gradient-builder',
    keywords: ['css gradient', 'gradient builder', 'gradient generator', 'linear gradient', 'radial gradient'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'What are CSS gradients?',
        body: `CSS gradients blend colors smoothly across a background. Two types:\n\n**Linear** — color changes along a line (e.g., left to right).\n\n**Radial** — color changes from center outward (circular).`,
      },
      {
        heading: 'Linear gradient syntax',
        body: `\`\`\`css\nbackground: linear-gradient(90deg, #FF5733 0%, #FFC300 100%);\n\`\`\`\n\nParameters:\n- **Angle** — 90deg (left-to-right), 180deg (top-to-bottom), etc.\n- **Color stops** — colors and their position (0%, 50%, 100%).`,
        codeLanguage: 'css',
      },
      {
        heading: 'Radial gradient syntax',
        body: `\`\`\`css\nbackground: radial-gradient(circle, #FF5733 0%, #FFC300 100%);\n\`\`\`\n\nParameters:\n- **Shape** — circle or ellipse.\n- **Color stops** — same as linear.`,
        codeLanguage: 'css',
      },
      {
        heading: 'Gradient builder workflow',
        body: `1. **Select type** — linear or radial.\n2. **Set angle** (linear) or shape (radial).\n3. **Add color stops** — click to add, drag to reposition.\n4. **Copy CSS** — paste into your stylesheet.\n5. **Preview** — see live gradient preview.`,
      },
    ],
    faqs: [
      {
        q: 'Can I use gradients as images?',
        a: 'Yes, \`background-image: linear-gradient(...)\` applies a gradient as background.',
      },
      {
        q: 'Do all browsers support CSS gradients?',
        a: 'Yes, linear and radial gradients are well-supported. Use vendor prefixes (-webkit-, -moz-) for older browsers.',
      },
      {
        q: 'Can I blend more than 2 colors?',
        a: 'Yes, add as many color stops as you want.',
      },
    ],
  },
  {
    slug: 'code-snippet-manager-save-organize-snippets',
    title: 'Code Snippet Manager: Save & Organize Code Snippets',
    description: 'Save code snippets with syntax highlighting. Auto-detect language, format JSON/SQL, copy with one click.',
    publishedAt: '2026-02-06',
    category: 'Utilities',
    toolSlug: 'snippet-manager',
    keywords: ['code snippets', 'snippet manager', 'syntax highlighting', 'code organizer', 'paste bin'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why save code snippets?',
        body: `As you code, you discover useful patterns, utilities, or solutions. Saving them:\n\n- **Reuse across projects** — don't reinvent regex patterns or algorithms.\n- **Learn from your code** — review past solutions.\n- **Share with team** — snippets are documentation.\n- **Quick reference** — fast lookup without searching git history.`,
      },
      {
        heading: 'Types of snippets',
        body: `- **Algorithms** — sorting, searching, string manipulation.\n- **Boilerplate** — project setup, configuration templates.\n- **Regular expressions** — email validation, URL parsing, etc.\n- **SQL queries** — common patterns for your database.\n- **API calls** — curl or fetch examples.\n- **Config files** — .env, docker-compose, etc.`,
      },
      {
        heading: 'Organizing snippets',
        body: `- **By language** — JavaScript, Python, SQL, etc.\n- **By purpose** — string utils, API helpers, data structures.\n- **By project** — snippets specific to a codebase.\n- **Favorites** — pin most-used snippets.\n- **Tags** — cross-cutting categories (e.g., "regex", "async").`,
      },
      {
        heading: 'Snippet manager features',
        body: `- **Syntax highlighting** — color-coded code for readability.\n- **Auto language detection** — detect language from code.\n- **Copy button** — one-click copy to clipboard.\n- **Format JSON/SQL** — prettify or minify.\n- **Search** — find snippets by title, tag, or content.`,
      },
    ],
    faqs: [
      {
        q: 'Can I export snippets?',
        a: 'Copy individual snippets or export collection as a file for backup.',
      },
      {
        q: 'Should I use this or a Git repo?',
        a: 'Use this for quick, reusable snippets. Use Git for versioned, project-specific code.',
      },
      {
        q: 'Is it searchable?',
        a: 'Yes, full-text search across title, content, and tags.',
      },
    ],
  },
  {
    slug: 'mime-type-lookup-file-extension-content-type',
    title: 'MIME Type Lookup: Find Content-Type by Extension',
    description: 'Look up MIME/Content-Type for any file extension or filename. Instant lookup, no server required.',
    publishedAt: '2026-02-07',
    category: 'Utilities',
    toolSlug: 'mime-type-lookup',
    keywords: ['mime type', 'content-type', 'media type', 'file extension', 'http headers'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'What is a MIME type?',
        body: `MIME (Multipurpose Internet Mail Extensions) types describe data format. Servers use them to tell browsers how to handle files:\n\n\`Content-Type: image/jpeg\` → browser displays as image\n\`Content-Type: application/pdf\` → browser offers download\n\`Content-Type: text/plain\` → browser renders as text\n\nFile extension alone doesn't tell the browser how to handle it; MIME type does.`,
      },
      {
        heading: 'Common MIME types',
        body: `**Text files:**\n- \`.txt\` → \`text/plain\`\n- \`.html\` → \`text/html\`\n- \`.css\` → \`text/css\`\n\n**Images:**\n- \`.jpg\` → \`image/jpeg\`\n- \`.png\` → \`image/png\`\n- \`.gif\` → \`image/gif\`\n\n**Application files:**\n- \`.pdf\` → \`application/pdf\`\n- \`.zip\` → \`application/zip\`\n- \`.json\` → \`application/json\``,
      },
      {
        heading: 'Why MIME types matter',
        body: `- **HTTP headers** — \`Content-Type\` tells clients how to interpret response.\n- **File uploads** — validate uploaded file types.\n- **Email attachments** — specify file formats.\n- **APIs** — tell client what format data is in.`,
      },
      {
        heading: 'Lookup workflow',
        body: `1. **Type filename or extension** — e.g., \`document.pdf\` or \`.xlsx\`.\n2. **Click lookup** or instant search.\n3. **Copy MIME type** — grab \`application/vnd.ms-excel\`.\n4. **Use in code** — set HTTP header or validation.`,
      },
    ],
    faqs: [
      {
        q: 'Can one extension have multiple MIME types?',
        a: 'Rarely. \`.js\` is almost always \`application/javascript\`. Server configuration can override defaults.',
      },
      {
        q: 'What if the MIME type is wrong?',
        a: 'Browsers may misinterpret files. Verify in your web server config (\`.htaccess\`, nginx, etc.).',
      },
      {
        q: 'Are there unofficial MIME types?',
        a: 'Yes, apps use custom types like \`application/vnd.custom\`. Lookup tools show official types.',
      },
    ],
  },
  {
    slug: 'user-agent-parser-browser-os-detection',
    title: 'User-Agent Parser: Detect Browser, OS, Device',
    description: 'Paste a User-Agent header to parse browser name/version, OS, device type, and rendering engine instantly.',
    publishedAt: '2026-02-08',
    category: 'Network & API',
    toolSlug: 'user-agent-parser',
    keywords: ['user agent', 'ua parser', 'browser detection', 'os detection', 'device detection'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'What is a User-Agent string?',
        body: `A User-Agent is an HTTP header that identifies the client (browser). Servers use it for analytics, compatibility, and debugging.\n\nExample:\n\n\`\`\`\nMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\n\`\`\`\n\nThis identifies: Windows 10, 64-bit, Chrome 120.`,
        codeLanguage: 'text',
      },
      {
        heading: 'Why parse User-Agent?',
        body: `- **Analytics** — track which browsers visit your site.\n- **Compatibility** — serve alternate content for old browsers.\n- **Debugging** — understand what user reported a bug from.\n- **Security** — detect spoofed User-Agents or bots.\n- **Feature detection** — enable/disable features based on browser capabilities.`,
      },
      {
        heading: 'User-Agent format breakdown',
        body: `A typical UA contains:\n- **Product/Version** — \`Mozilla/5.0\` (mostly legacy).\n- **Operating System** — \`Windows NT 10.0\`, \`Macintosh\`, \`Linux\`.\n- **Engine/Version** — \`AppleWebKit\`, \`Gecko\`, \`Trident\`.\n- **Browser/Version** — \`Chrome/120\`, \`Safari/537\`, \`Firefox/121\`.\n- **Device** — \`Mobile\`, \`Tablet\`, or omitted for desktop.`,
      },
      {
        heading: 'Parsing workflow',
        body: `1. **Copy User-Agent** from HTTP headers or request logs.\n2. **Paste into parser.**\n3. **See breakdown** — browser, version, OS, device.\n4. **Use for compatibility** — test in that specific browser.`,
      },
    ],
    faqs: [
      {
        q: 'Can User-Agent be spoofed?',
        a: 'Yes, any header can be faked. Don\'t rely on UA for security; use server-side checks.',
      },
      {
        q: 'Are User-Agent strings standardized?',
        a: 'No, each browser formats them differently. Parsing requires pattern matching and heuristics.',
      },
      {
        q: 'How do I get a User-Agent?',
        a: 'Browser DevTools (Network tab) show it in request headers. \`navigator.userAgent\` in JavaScript.',
      },
    ],
  },
  {
    slug: 'unit-converter-scientific-engineering-units',
    title: 'Unit Converter: 323 Units Across 43 Categories',
    description: 'Convert between length, mass, pressure, temperature, electrical, and other scientific units. Instant conversion online.',
    publishedAt: '2026-02-09',
    category: 'Converters',
    toolSlug: 'unit-converter',
    keywords: ['unit converter', 'unit conversion', 'measurement converter', 'scientific units', 'engineering units'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why a unit converter?',
        body: `Scientific and engineering work involves many units:\n\n- **Metric vs imperial** — kilometers, miles, liters, gallons.\n- **Specialized units** — pascals, joules, amperes.\n- **Easy mistakes** — confusing units costs money (Mars probe lost to unit error).\n\nA converter eliminates guessing and ensures accuracy.`,
      },
      {
        heading: 'Unit categories',
        body: `**Fundamental:**\n- Length (meter, foot, mile, kilometer)\n- Mass (kilogram, pound, ton, ounce)\n- Time (second, minute, hour, day)\n- Temperature (Celsius, Fahrenheit, Kelvin)\n\n**Derived:**\n- Area, volume, pressure, energy, power, force, velocity\n- Electrical (ampere, volt, watt, ohm)\n- Thermal (specific heat, thermal conductivity)\n- Polymer and materials science units`,
      },
      {
        heading: 'Common conversions',
        body: `- 1 mile = 1.609 km\n- 1 pound = 0.454 kg\n- 1 gallon = 3.785 liters\n- 1 inch = 2.54 cm\n- 32°F = 0°C\n- 1 kilowatt = 1000 watts`,
      },
      {
        heading: 'Conversion workflow',
        body: `1. **Select category** — length, mass, energy, etc.\n2. **Enter value** — e.g., 5 miles.\n3. **Select units** — from miles, to kilometers.\n4. **See result** — 8.05 km.\n5. **Copy** — grab the result for use.`,
      },
    ],
    faqs: [
      {
        q: 'Is temperature conversion T(K) = T(°C) + 273.15 correct?',
        a: 'Yes, that\'s the standard formula. Converters handle it automatically.',
      },
      {
        q: 'What about currency or crypto?',
        a: 'This tool focuses on scientific units. Exchange rates change constantly; use a currency converter for that.',
      },
      {
        q: 'Can I convert between unusual units?',
        a: '323 units across 43 categories covers most scientific needs. Niche units may not be included.',
      },
    ],
  },
  {
    slug: 'svg-optimizer-minify-compress-svgo-online',
    title: 'SVG Optimizer: Minify & Compress SVG Files',
    description: 'Paste SVG markup and minify with SVGO. Remove comments, metadata, default attributes, and whitespace.',
    publishedAt: '2026-02-10',
    category: 'Formatters',
    toolSlug: 'svg-optimizer',
    keywords: ['svg optimizer', 'svg minify', 'svgo online', 'compress svg', 'optimize svg'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Why optimize SVG?',
        body: `SVG (Scalable Vector Graphics) are text-based and often include editor metadata, comments, and redundant code. Optimization:\n\n- **Reduces file size** — smaller downloads.\n- **Removes editor junk** — Illustrator/Figma metadata.\n- **Strips whitespace** — minification like JavaScript.\n- **Preserves quality** — no visual loss, only metadata removed.`,
      },
      {
        heading: 'What SVGO does',
        body: `- Removes comments (\`<!-- ... -->\`).\n- Strips editor metadata (Illustrator, Figma attributes).\n- Removes default attributes (e.g., \`fill="black"\` if already default).\n- Minifies whitespace and newlines.\n- Simplifies paths where possible.\n- Removes hidden layers and unused definitions.`,
      },
      {
        heading: 'SVG optimization example',
        body: `**Before (editor export):**\n\`\`\`xml\n<!-- Exported from Figma -->\n<svg width="100\" height=\"100\" viewBox=\"0 0 100 100\">\n  <circle cx=\"50\" cy=\"50\" r=\"50\" fill=\"black\" />\n</svg>\n\`\`\`\n\n**After (optimized):**\n\`\`\`xml\n<svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"50\" fill=\"black\"/></svg>\n\`\`\``,
        codeLanguage: 'xml',
      },
      {
        heading: 'Best practices',
        body: `- **Export from design tools** — Illustrator, Figma, Sketch.\n- **Optimize before use** — smaller files = faster pages.\n- **Inspect manually** — ensure important paths aren't lost.\n- **Use inline SVG** — embed SVG directly in HTML for styles.`,
      },
    ],
    faqs: [
      {
        q: 'Does optimization affect visual appearance?',
        a: 'No, optimized SVGs look identical. Only metadata and whitespace are removed.',
      },
      {
        q: 'Can I undo optimization?',
        a: 'Save the original. Optimization is lossy for metadata but preserves vector data.',
      },
      {
        q: 'Should I minify SVG for production?',
        a: 'Yes, especially for large icons or illustrations. Minified SVGs load faster.',
      },
    ],
  },
  {
    slug: '2048-game-puzzle-break',
    title: 'Play 2048: Slide and Merge Tiles Online',
    description: 'Slide tiles to merge matching numbers and reach 2048. A classic puzzle game to clear your head between coding.',
    publishedAt: '2026-02-11',
    category: 'Generators',
    toolSlug: 'break-room/2048',
    keywords: ['2048 game', '2048 puzzle', 'number puzzle', 'tile game', 'brain game'],
    readingTimeMin: 3,
    sections: [
      {
        heading: 'How to play 2048',
        body: `1. **Start** — you begin with a 4×4 grid and two tiles.\n2. **Move** — use arrow keys to slide all tiles in a direction.\n3. **Merge** — when two tiles with the same number touch, they merge into one with double the value (2+2=4, 4+4=8, etc.).\n4. **Goal** — reach the 2048 tile (take your time; it's fun, not a race).\n5. **Game over** — when no more moves are possible.`,
      },
      {
        heading: 'Strategy tips',
        body: `- **Keep high tiles in a corner** — prevents them from getting blocked.\n- **Build one direction** — avoid scattered merges.\n- **Plan ahead** — think two or three moves ahead.\n- **Use larger gaps** — gives space for merges to happen.`,
      },
      {
        heading: 'Why play?',
        body: `2048 is a quick mental break. A typical game is 5–15 minutes. It requires focus and planning but isn't stressful. Perfect for clearing your head between coding sessions.`,
      },
    ],
    faqs: [
      {
        q: 'Can I beat 2048?',
        a: 'Yes, with planning. The tile keeps growing beyond 2048 if you keep playing.',
      },
      {
        q: 'Is the grid always 4×4?',
        a: 'Yes. Larger grids exist in variants, but the original is 4×4.',
      },
      {
        q: 'Is there undo?',
        a: 'Current version doesn\'t have undo. Plan carefully.',
      },
    ],
  },
  {
    slug: 'sudoku-game-online-puzzles',
    title: 'Play Sudoku: 450 Unique Puzzles Online',
    description: 'Play Sudoku with 150 puzzles per difficulty (easy, medium, hard). Sign in to save progress.',
    publishedAt: '2026-02-12',
    category: 'Generators',
    toolSlug: 'break-room/sudoku',
    keywords: ['sudoku', 'sudoku online', 'sudoku game', 'sudoku puzzle', 'brain game'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Sudoku rules',
        body: `1. Fill a 9×9 grid so every row, column, and 3×3 box contains digits 1–9.\n2. Each number appears exactly once per row, column, and box.\n3. Some cells are pre-filled; these are givens.\n4. No arithmetic required; pure logic.`,
      },
      {
        heading: 'How to play',
        body: `- **Click a cell** to select it.\n- **Type a digit** (1–9) or use arrow keys to navigate.\n- **Highlight conflicts** — impossible numbers are grayed out.\n- **Check progress** — see if you've completed rows/columns.\n- **Clear cell** — delete or press backspace.`,
      },
      {
        heading: 'Difficulty levels',
        body: `- **Easy** — many givens, logical deduction only.\n- **Medium** — fewer givens, requires planning.\n- **Hard** — minimal givens, advanced techniques needed.\n\n450 puzzles (150 per level) keep you challenged without repeats.`,
      },
      {
        heading: 'Strategies',
        body: `- **Naked singles** — find cells with only one possible value.\n- **Hidden singles** — find values that fit only one cell in a row/column/box.\n- **Pairs/Triples** — eliminate candidates by logical inference.\n- **Advanced** — X-wings, Y-wings, swordfish (look these up if interested).`,
      },
    ],
    faqs: [
      {
        q: 'Can I get hints?',
        a: 'Highlighting conflicts is the main aid. Hint buttons or solver features may be added.',
      },
      {
        q: 'Can I undo moves?',
        a: 'Click to clear cells. Full game undo may come later.',
      },
      {
        q: 'Is there a timer?',
        a: 'Yes, tracks solve time. Compete against yourself to improve.',
      },
    ],
  },
  {
    slug: 'snake-game-online-classic',
    title: 'Play Snake: Classic Game Online',
    description: 'Play the classic Snake game in your browser. Eat food, grow your snake, avoid walls and yourself.',
    publishedAt: '2026-02-13',
    category: 'Generators',
    toolSlug: 'break-room/snake',
    keywords: ['snake game', 'snake online', 'classic snake', 'browser game', 'developer break'],
    readingTimeMin: 3,
    sections: [
      {
        heading: 'How to play Snake',
        body: `1. **Start** — a snake of length 3 is placed in the center.\n2. **Move** — use arrow keys or WASD to move up, down, left, right.\n3. **Eat food** — eat the square to grow and gain points.\n4. **Avoid** — don't hit walls or your own tail.\n5. **Speed increases** — every 50 points, the snake gets faster.\n6. **Game over** — collision ends the game.`,
      },
      {
        heading: 'Strategy',
        body: `- **Plan paths** — don't box yourself in.\n- **Use full grid** — maximize space for growth.\n- **Spiral strategy** — fill the grid in a spiral to avoid dead ends.\n- **Don't panic** — faster speeds require calm decision-making.`,
      },
      {
        heading: 'Why play?',
        body: `Snake is simple, quick, and addictive. A game is 2–5 minutes. It's the perfect break-room game: no stress, no story, just pure gameplay.`,
      },
    ],
    faqs: [
      {
        q: 'What\'s the highest score possible?',
        a: 'Theoretically, fill the entire 20×20 grid (minus 1 for the head). Practically, most stop around 50–100 points.',
      },
      {
        q: 'Can I pause?',
        a: 'Yes, or just stop moving. Restart to try again.',
      },
      {
        q: 'Is there an easy mode?',
        a: 'Snake difficulty is determined by speed increases. Start calm; it gets challenging fast.',
      },
    ],
  },
  {
    slug: 'minesweeper-game-online-classic',
    title: 'Play Minesweeper: Classic Puzzle Game',
    description: 'Play classic Minesweeper with three difficulty levels: beginner, intermediate, expert. First click is always safe.',
    publishedAt: '2026-02-14',
    category: 'Generators',
    toolSlug: 'break-room/minesweeper',
    keywords: ['minesweeper', 'minesweeper online', 'classic minesweeper', 'puzzle game', 'brain game'],
    readingTimeMin: 4,
    sections: [
      {
        heading: 'Minesweeper rules',
        body: `1. **Board** — a grid of hidden cells covering mines.\n2. **Click to reveal** — uncover a cell.\n3. **Number clue** — if safe, a number shows mines in adjacent cells (0–8).\n4. **Flag mines** — right-click to flag suspected mines.\n5. **Win** — reveal all non-mine cells.\n6. **Lose** — click a mine; game over.`,
      },
      {
        heading: 'Difficulty levels',
        body: `- **Beginner** — 9×9 board, 10 mines. Easy for learning.\n- **Intermediate** — 16×16 board, 40 mines. Medium challenge.\n- **Expert** — 30×16 board, 99 mines. Hard, requires advanced logic.`,
      },
      {
        heading: 'Strategy',
        body: `- **Numbers are clues** — a \"3\" means exactly 3 adjacent mines.\n- **Empty cells** — 0 mines adjacent. Cascade reveals many cells.\n- **Mark and reason** — flag cells, then deduce from numbers.\n- **Isolated regions** — focus on one area first, then expand.`,
      },
      {
        heading: 'Tips',
        body: `- **First click is safe** — the board generates after your first move.\n- **Work from edges** — borders have fewer adjacent cells, easier to deduce.\n- **Probability guessing** — when stuck, pick the cell with fewest adjacent mines.`,
      },
    ],
    faqs: [
      {
        q: 'Is there a cheat?',
        a: 'No cheating in pure Minesweeper. Logic and probability are your tools.',
      },
      {
        q: 'Can I flag flags?',
        a: 'Right-click again to unflag. Flags help you mark suspected mines.',
      },
      {
        q: 'What\'s the average time to win?',
        a: 'Beginner: 1–2 min. Intermediate: 3–10 min. Expert: 10–30+ min (or much longer if tough).',
      },
    ],
  },
  {
    slug: 'tetris-game-online-classic',
    title: 'Play Tetris: Classic Block Puzzle Game',
    description: 'Play classic Tetris in your browser. Stack falling Tetrimino pieces, clear lines, and level up.',
    publishedAt: '2026-02-15',
    category: 'Generators',
    toolSlug: 'break-room/tetris',
    keywords: ['tetris', 'tetris online', 'classic tetris', 'block puzzle', 'browser game'],
    readingTimeMin: 3,
    sections: [
      {
        heading: 'How to play Tetris',
        body: `1. **Pieces fall** — Tetriminos (7-piece types) drop from the top.\n2. **Move & rotate** — arrow keys to move, up arrow to rotate.\n3. **Stack them** — place pieces to fill rows.\n4. **Clear rows** — complete rows disappear, gain points.\n5. **Level up** — every 10 cleared lines, speed increases.\n6. **Game over** — pieces reach the top of the screen.`,
      },
      {
        heading: 'Tetris pieces (Tetriminos)',
        body: `- **I** — straight line (4 cells).\n- **O** — square (4 cells).\n- **T** — T-shape (4 cells).\n- **S/Z** — S and Z shapes (4 cells each).\n- **L/J** — L and J shapes (4 cells each).\n\nEach piece can be rotated. Plan rotations and placement.`,
      },
      {
        heading: 'Strategy',
        body: `- **Build from bottom** — create solid foundation.\n- **Aim for T-spins** — advanced move for bonus points.\n- **Don't stack too high** — keep room for pieces to maneuver.\n- **Watch the preview** — next piece is shown on the side.`,
      },
      {
        heading: 'Tips',
        body: `- **Hard drop (Space)** — instantly place piece at bottom.\n- **Pause (P)** — take a breather.\n- **Highest score** — get a high score and beat it.`,
      },
    ],
    faqs: [
      {
        q: 'What\'s a T-spin?',
        a: 'A T-piece rotated into a tight spot. Clears a row and bonus points. Advanced move.',
      },
      {
        q: 'Can I slow the game down?',
        a: 'Speed is tied to level. Start on easier levels; they\'re slower.',
      },
      {
        q: 'Is there practice mode?',
        a: 'Play as many games as you want; there\'s no separate practice mode.',
      },
    ],
  },
]

export const blogPostSlugs = blogPosts.map((p) => p.slug)

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter((p) => p.category === category)
}
