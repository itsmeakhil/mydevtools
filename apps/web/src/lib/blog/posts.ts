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
    title: 'How to Decode a JWT Token Offline',
    description:
      'Learn what a JSON Web Token (JWT) is, how to read its header and payload, and how to decode one instantly and offline in MyDevTools, the all-in-one desktop developer toolkit.',
    publishedAt: '2025-10-15',
    category: 'Security',
    toolSlug: 'jwt-decoder',
    keywords: ['decode jwt', 'offline jwt decoder', 'how to read jwt', 'jwt header payload', 'json web token'],
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
        heading: 'How to decode a JWT offline in MyDevTools',
        body: `The fastest way to read a JWT during debugging is to paste it into a decoder. The JWT Decoder in MyDevTools runs entirely on your machine — offline and local, so your token is never sent to a server. The tool splits the token into its three parts, decodes the header and payload to readable JSON, and highlights the expiration time (\`exp\`) as a human-readable date so you can instantly see whether a token is still valid.\n\nWhen to use an offline decoder: during API debugging to check which claims a token carries, after a login flow to verify the payload matches expected user data, and when reviewing third-party tokens to understand their structure.`,
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
        q: 'Is it safe to paste my JWT into a JWT decoder?',
        a: 'Use a decoder that processes the token locally without sending it to a server. MyDevTools is a desktop app that decodes JWTs entirely offline on your machine — the token never leaves your device. Avoid decoders that require submitting the token to an external endpoint.',
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
    title: 'How to Format JSON Offline: Beautify, Validate & Minify',
    description:
      'Format messy JSON into readable, indented output instantly and offline on your machine. Learn JSON formatting best practices, common errors, and how to minify JSON for production.',
    publishedAt: '2025-10-22',
    category: 'Formatters',
    toolSlug: 'json-formatter',
    keywords: ['format json offline', 'json formatter', 'json beautifier', 'json validator', 'json minifier', 'pretty print json'],
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
        heading: 'How to format JSON offline in MyDevTools',
        body: `The quickest path is to paste your JSON into the JSON Formatter in MyDevTools. It parses and indents your JSON with 2-space indentation, highlights syntax errors with line numbers, and lets you copy the formatted result with one click. It runs locally on your machine — no API call, no data upload, and it works offline.\n\nUseful scenarios: formatting API responses during debugging, cleaning up configuration files before committing, comparing two JSON payloads in a diff tool, and quickly checking whether a response is valid JSON before parsing it in code.`,
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
        q: 'Is it safe to paste sensitive JSON (API keys, tokens) into a JSON formatter?',
        a: 'Use a formatter that runs locally with no server upload. MyDevTools is a desktop app that processes your JSON entirely on your machine, offline — nothing is sent to a backend. For a command-line option, the jq CLI works locally too.',
      },
      {
        q: 'What is the difference between JSON and JSON5?',
        a: 'JSON5 is a superset of JSON that allows comments, trailing commas, and single-quoted strings. It is useful in configuration files but is not valid JSON and cannot be parsed by standard JSON.parse(). Most formatters target standard JSON.',
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
      'Master regex lookahead and lookbehind assertions with real-world examples. Test patterns offline in MyDevTools and learn when to use each type of zero-width assertion.',
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
        body: `Lookbehind (\`(?<=...)\` and \`(?<!...)\`) requires ES2018+ (Chrome 62+, Firefox 78+, Node 8+). Positive and negative lookahead have been supported in JavaScript since ES3 and work in all browsers.\n\nFor complex patterns, test them in a regex tester before embedding them in code. The Regex Tester in MyDevTools runs offline on your desktop and lets you paste input, write the pattern, and see matches highlighted in real time with match groups, indices, and explanations.`,
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
      'Learn how developer-focused password managers work, why local desktop encrypted vaults are useful for credential storage, and how to protect secrets without leaking them.',
    publishedAt: '2026-01-08',
    category: 'Security',
    toolSlug: 'password-manager',
    keywords: ['password manager developer', 'local password vault', 'secure credential storage', 'encrypted passwords local', 'developer secrets manager'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why developers need a dedicated password manager',
        body: `Developers accumulate secrets faster than almost any other role: database credentials, API keys, staging logins, SSH passphrases, service accounts, .env values, and personal accounts all pile up across projects.\n\nUsing a browser autofill or a sticky note for these is a significant security risk. A proper desktop password manager encrypts credentials at rest with a master password derived key — so even if the storage medium is compromised, the attacker gets ciphertext, not plaintext.`,
      },
      {
        heading: 'How password managers encrypt your data',
        body: `Most password managers use AES-256 encryption with a key derived from the master password using a slow key derivation function (KDF) like PBKDF2, bcrypt, or Argon2. The KDF makes brute-forcing the master password computationally expensive even with modern hardware.\n\nThe encryption and decryption happen locally on your machine — any file or sync target only ever sees ciphertext. This is called zero-knowledge architecture: the service provider cannot decrypt your vault even if subpoenaed.`,
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
        heading: 'Local desktop vs cloud-synced password managers',
        body: `**Cloud-synced** (1Password, Bitwarden, Dashlane): your encrypted vault is stored on the provider's servers. Sync across devices is automatic. The trade-off is trusting the provider's infrastructure and zero-knowledge claims.\n\n**Local / self-hosted** (KeePass, Bitwarden self-hosted, local desktop vaults): the encrypted vault lives on your machine or your own server. No third-party ever holds your ciphertext. Sync requires your own solution (e.g., Syncthing, a personal S3 bucket).\n\n**Local desktop vault tools** like the MyDevTools Password Manager store credentials in an encrypted local vault on your machine — useful for development credentials, staging tokens, and project-specific secrets that you do not want in a cloud service.`,
      },
      {
        heading: 'Best practices for developer secrets',
        body: `**Use a strong, unique master password** — at least 20 characters, ideally a passphrase. Never reuse it.\n\n**Never commit secrets to git** — use environment variables, .env files (in .gitignore), or a secrets manager like AWS Secrets Manager or HashiCorp Vault for production.\n\n**Rotate credentials after a breach** — if a service is compromised, assume all stored credentials for that service are exposed.\n\n**Separate personal and work vaults** — keep work credentials in an org-controlled manager; personal credentials in your own.\n\n**Enable 2FA on the password manager itself** — your manager is the master key to everything else. Protect it accordingly.`,
      },
      {
        heading: 'When to use a local desktop vault vs a full password manager',
        body: `A local desktop vault is ideal for: development environment credentials you access frequently during a session, staging and test account logins, tool-specific API keys you use while coding, and temporary project secrets.\n\nUse a full cross-device password manager (1Password, Bitwarden) for: personal login credentials, production secrets you need on mobile or multiple machines, and anything that must survive a machine wipe.`,
      },
    ],
    faqs: [
      {
        q: 'Is a local desktop password manager safe?',
        a: 'Yes, if the vault is encrypted with AES-256 and a master password before storing locally. The critical requirement is that plaintext credentials never leave your machine — all encryption and decryption must happen locally on your device.',
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
    title: 'How to Test a REST API Offline Without Postman',
    description:
      'Learn how to send API requests, inspect responses, set headers, use authentication tokens, and debug REST endpoints from your desktop with the offline API client in MyDevTools.',
    publishedAt: '2026-01-15',
    category: 'Network & API',
    toolSlug: 'api-client',
    keywords: ['test rest api offline', 'desktop api client', 'postman alternative offline', 'send http request desktop', 'rest api testing tool'],
    readingTimeMin: 7,
    sections: [
      {
        heading: 'Why test APIs from an all-in-one desktop toolkit',
        body: `Heavy API clients like Postman and Insomnia are powerful for team collaboration, collection management, and test automation. But for quick one-off requests — checking a public endpoint, debugging an auth header, or verifying a payload format — launching a separate heavyweight app and signing in adds friction.\n\nAn API client built into an all-in-one desktop toolkit lets you send requests immediately, offline, without maintaining a collection or juggling separate apps. It is particularly useful when you are already working locally alongside your other developer tools.`,
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
        heading: 'Testing with curl vs a desktop API client',
        body: `curl is ideal for scripting, CI pipelines, and reproducing requests in documentation. A desktop API client is faster for interactive exploration, header autocompletion, and working alongside your other developer tools.\n\nThe API Client in MyDevTools runs offline on your machine, supports GET/POST/PUT/PATCH/DELETE, custom headers, authentication, JSON body editing, and shows the formatted response and status side by side.`,
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
        q: 'Can I test APIs that require OAuth 2.0 in a desktop API client?',
        a: 'Yes, if you manually obtain the access token first (via the token endpoint or an OAuth flow) and paste it into the Authorization header.',
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
    title: 'How to Browse and Query MongoDB from an All-in-One Desktop Toolkit',
    description:
      'Connect to a MongoDB database, browse collections, run queries, and inspect documents from your desktop with the built-in NoSQL client in MyDevTools. Learn the basics of NoSQL document querying.',
    publishedAt: '2026-01-22',
    category: 'Databases',
    toolSlug: 'database-explorer',
    keywords: ['mongodb desktop client', 'database explorer desktop', 'query mongodb offline', 'mongodb gui', 'browse mongodb collections'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is a NoSQL database browser?',
        body: `A NoSQL database browser is a GUI that lets you connect to a document database (like MongoDB), explore its structure, and run queries.\n\nFor MongoDB specifically, the traditional options are the mongo shell, MongoDB Compass (a single-purpose desktop app), or Atlas UI (cloud-only). A NoSQL explorer bundled into an all-in-one desktop toolkit is useful when you want database browsing alongside your other developer tools, connecting to a shared staging database, or debugging a quick data issue during development — without installing yet another standalone client.`,
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
        body: `Always use connection strings with authentication. MongoDB connection strings follow the format:\n\n\`mongodb://username:password@host:27017/dbname\`\n\nOr with SRV (Atlas/cloud):\n\n\`mongodb+srv://username:password@cluster.mongodb.net/dbname\`\n\nFor the NoSQL Explorer in MyDevTools, the desktop app connects to MongoDB directly from your machine, so your connection string and credentials stay local. Only connect to databases you own or have explicit authorization to access.`,
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
        q: 'Is it safe to use a desktop MongoDB client?',
        a: 'Use one that connects directly from your machine and keeps credentials local. The MyDevTools NoSQL Explorer is a desktop app that connects to MongoDB locally — your connection string stays on your device rather than passing through a third-party server.',
      },
      {
        q: 'What is the difference between MongoDB and SQL databases?',
        a: 'SQL databases use tables with a fixed schema, rows, and columns. MongoDB stores flexible JSON-like documents in collections with no enforced schema. SQL uses JOIN for relations; MongoDB typically embeds related data in the document or uses application-level references.',
      },
      {
        q: 'How do I run an aggregation pipeline in a desktop MongoDB client?',
        a: 'An aggregation pipeline is a series of stages ($match, $group, $sort, $project, $lookup) that transform documents. In a client that supports raw query input, you can enter the pipeline array directly.',
      },
      {
        q: 'Does MongoDB have transactions?',
        a: 'Yes, since MongoDB 4.0. Multi-document transactions work across collections and databases in replica sets. However, for many use cases, embedding related data in a single document avoids the need for transactions.',
      },
    ],
  },

  {
    slug: 'how-to-format-sql-online',
    title: 'How to Format and Beautify SQL Queries Offline',
    description:
      'Format messy SQL into readable, indented queries instantly and offline on your desktop. Learn SQL formatting conventions, when to use uppercase keywords, and how formatting helps catch bugs.',
    publishedAt: '2026-01-29',
    category: 'Formatters',
    toolSlug: 'sql-formatter',
    keywords: ['format sql offline', 'sql formatter', 'sql beautifier', 'sql pretty print', 'sql query formatter free'],
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
        body: `SQL keywords are standardized in ANSI SQL, but each database has dialect-specific syntax. A good SQL formatter supports multiple dialects:\n\n- **MySQL**: backtick identifiers, \`LIMIT\`/\`OFFSET\`, \`AUTO_INCREMENT\`.\n- **PostgreSQL**: double-quoted identifiers, \`SERIAL\`, \`RETURNING\`, \`ILIKE\`, dollar-quoted strings.\n- **SQL Server**: bracket identifiers (\`[table]\`), \`TOP\`, \`NOLOCK\`, \`NVARCHAR\`.\n- **BigQuery**: backtick identifiers, \`ARRAY\`, \`STRUCT\`, \`UNNEST\`.\n\nThe SQL Formatter in MyDevTools runs offline on your desktop and supports MySQL, PostgreSQL, SQL Server, and other dialects — specify the dialect to get accurate formatting for dialect-specific keywords.`,
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
    slug: 'aes-256-encrypted-notes-for-developers',
    title: 'AES-256 Encrypted Notes for Developers: What to Store and What to Avoid',
    description:
      'A practical guide to AES-256 encrypted notes, vault-style developer data, and when to use the offline MyDevTools Password Manager for sensitive snippets.',
    publishedAt: '2025-12-12',
    category: 'Security',
    toolSlug: 'password-manager',
    keywords: ['AES-256 encrypted notes for devs', 'encrypted developer notes', 'secure notes for developers', 'developer password manager', 'encrypted vault'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why developers need encrypted notes',
        body: `Developers often need to keep short sensitive snippets close at hand: staging credentials, recovery codes, API tokens for local testing, database connection notes, SSH hints, internal URLs, and setup instructions. Plain text notes are convenient, but they are a poor fit for secrets or anything that could expose a system if copied into the wrong place.\n\nAES-256 encrypted notes are useful when the content should be searchable and accessible to you, but unreadable to anything storing it. In a zero-knowledge-style workflow, encryption happens locally on your machine, so anything that stores the data holds ciphertext rather than readable plaintext.`,
      },
      {
        heading: 'What AES-256 protects',
        body: `AES-256 is a symmetric encryption algorithm widely used for protecting data at rest. In a local desktop vault workflow, your passphrase or vault key is used locally to encrypt data before any of it is synced. A server can store and sync encrypted blobs, but it should not receive the raw note content or master password.\n\nThat model is strongest when paired with good key derivation, authenticated encryption modes such as AES-GCM, and careful session handling. It protects synced data from casual exposure on the backend, but it does not protect against a compromised machine, malicious software, weak master password, or phishing attack.`,
      },
      {
        heading: 'What developers should store in encrypted notes',
        body: `Encrypted notes are best for contextual secret-adjacent data, not as a dumping ground for every production credential.\n\nGood candidates:\n\n- Recovery codes and backup instructions.\n- Notes attached to password manager entries.\n- Local development tokens and staging-only credentials.\n- Internal setup notes that should not live in public docs.\n- Rotation reminders or environment-specific context.\n\nAvoid storing highly privileged production secrets unless your team has approved the vault, reviewed the code, and documented access controls.`,
      },
      {
        heading: 'Using MyDevTools Password Manager for secure notes',
        body: `The MyDevTools Password Manager is a desktop tool designed for vault-style sensitive records. It encrypts sensitive data locally on your machine with a vault password only you know — your vault never leaves your device.\n\nUse it when you need a developer-friendly place for passwords, short sensitive notes, and account context, fully offline with no cloud dependency.`,
      },
    ],
    faqs: [
      {
        q: 'Are AES-256 encrypted notes safe for API keys?',
        a: 'They can be safer than plain text notes, but production API keys should follow your team security policy. Use a dedicated secrets manager for high-value production secrets.',
      },
      {
        q: 'Does encryption mean the server cannot read my notes?',
        a: 'If encryption happens locally on your machine and the key never leaves your device, only ciphertext is stored, never readable note content.',
      },
      {
        q: 'Where are encrypted notes stored?',
        a: 'With local encryption, notes are encrypted on your machine, so only ciphertext is ever stored rather than readable content. This does not replace good key management or secure local practices.',
      },
    ],
  },
  {
    slug: 'how-to-query-sql-databases-online',
    title: 'How to Query SQL Databases from Your Desktop: Connect PostgreSQL, MySQL, MariaDB',
    description: 'Connect to PostgreSQL, MySQL, or MariaDB from your desktop with the built-in SQL client in MyDevTools. Run SQL queries, explore schemas, and export results without a separate database app. All credentials are AES-256 encrypted locally.',
    publishedAt: '2026-01-05',
    category: 'Databases',
    toolSlug: 'sql-client',
    keywords: ['desktop sql client', 'query database offline', 'postgresql gui desktop', 'mysql client', 'sql query tool'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Why use the SQL client in an all-in-one desktop toolkit?',
        body: `Single-purpose database clients like DBeaver, TablePlus, and pgAdmin connect to your database, but each is a separate app to install and manage. A SQL client bundled into an all-in-one desktop toolkit lives alongside your other developer tools: open MyDevTools, enter your connection details, and start querying—no extra app, no cloud round-trip.\n\nThe SQL Client in MyDevTools runs locally on your desktop, encrypts your credentials with AES-256 before storing them, and keeps your connection details on your machine. You can run SELECT, INSERT, UPDATE, DELETE, and administrative queries directly against PostgreSQL, MySQL, and MariaDB instances.`,
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
        body: `Once connected, write any SQL query. The interface shows results in a table, with column headers, data types, and row counts. For larger result sets, pagination prevents the app from loading millions of rows at once.\n\nOn the left sidebar, you can browse your database structure: list tables, columns, and their types. This schema explorer saves you from memorizing table names and column definitions.`,
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
        body: `Results can be exported to CSV for further analysis in spreadsheet tools. Multiple database connections can be saved securely—your credentials are encrypted with AES-256 in a local vault on your machine, so plaintext passwords never leave your device.\n\nUse the saved connections to quickly switch between development, staging, and production databases (with appropriate caution and role-based permissions on your database users).`,
      },
      {
        heading: 'Security: credentials and encrypted storage',
        body: `Your database credentials are sensitive. The MyDevTools SQL Client encrypts them with AES-256 on your desktop before storing locally, so plaintext passwords never leave your machine. For production databases, follow your organization's credential policies: use temporary tokens, short-lived credentials, or SSH tunneling if available.`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to paste my database password into a SQL client?',
        a: 'Use a client that encrypts credentials locally before storage. The MyDevTools SQL Client is a desktop app that uses AES-256 encryption on your machine, so passwords never reach a server unencrypted. Avoid clients that send credentials over unencrypted connections.',
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
    slug: 'yaml-formatter-validator-online',
    title: 'Format YAML Offline: Validator & Converter',
    description: 'Format YAML with indentation validation, offline on your desktop. Convert YAML to JSON and back. Check for syntax errors instantly.',
    publishedAt: '2026-01-09',
    category: 'Formatters',
    toolSlug: 'yaml-formatter',
    keywords: ['offline yaml formatter', 'yaml validator', 'yaml to json', 'json to yaml', 'format yaml'],
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
        body: `YAML and JSON represent the same data structures (objects, arrays, strings, numbers). The YAML Formatter in MyDevTools runs offline on your desktop and lets you convert between them:\n\n- Paste YAML → see equivalent JSON.\n- Paste JSON → see equivalent YAML.\n\nThis is useful when integrating YAML-based tools with JSON APIs, or when you need to validate YAML structure by converting it to JSON and back.`,
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
    title: 'Format GraphQL Queries Offline: Minify & Pretty Print',
    description: 'Format and minify GraphQL queries, mutations, and subscriptions instantly and offline on your desktop. Check syntax and beautify complex queries.',
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
    slug: 'format-converter-json-yaml-toml-xml',
    title: 'Format Converter: JSON to YAML, TOML, XML Offline',
    description: 'Convert between JSON, YAML, TOML, and XML instantly and offline on your desktop. All 12 combinations supported. Validate syntax instantly.',
    publishedAt: '2026-01-14',
    category: 'Converters',
    toolSlug: 'format-converter',
    keywords: ['offline format converter', 'json to yaml', 'yaml to json', 'json to xml', 'toml converter'],
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
    slug: 'markdown-to-html-live-preview',
    title: 'Markdown to HTML: Live Preview & Converter',
    description: 'Write Markdown and preview HTML output side-by-side. Convert Markdown to HTML instantly and offline on your desktop.',
    publishedAt: '2026-01-16',
    category: 'Converters',
    toolSlug: 'markdown-preview-html',
    keywords: ['markdown to html', 'markdown converter', 'offline markdown preview', 'html to markdown'],
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
    keywords: ['email validator', 'offline email validation', 'check email', 'mx record lookup', 'email checker'],
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
    description: 'Connect to Redis instances from your desktop with the built-in Redis client in MyDevTools. Browse keys, edit values, run commands, and flush patterns — offline and local.',
    publishedAt: '2026-01-18',
    category: 'Databases',
    toolSlug: 'redis-commander',
    keywords: ['redis cli desktop', 'redis gui', 'redis commander', 'redis browser', 'manage redis offline'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'What is Redis and why use a GUI?',
        body: `Redis is an in-memory data store and cache used for sessions, real-time counters, pub/sub messaging, and job queues. The standard way to interact with Redis is the \`redis-cli\` command-line tool.\n\nA GUI alternative is useful when:\n\n- You want a visual interface to browse keys.\n- You need to inspect complex data types (hashes, lists, sets) without memorizing commands.\n- You want to manage Redis from your desktop toolkit without SSH or a separate \`redis-cli\` setup.\n- You are debugging and need to see what data is in Redis at a glance.`,
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
        body: `Redis credentials are sensitive. The MyDevTools Redis Commander encrypts credentials with AES-256 locally on your machine before storage, so no server sees plaintext passwords. For production, use Redis with password authentication or network-level security (firewall, VPN, SSH tunnel).`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to connect to a production Redis instance from a desktop tool?',
        a: 'Use a tool that connects over an encrypted channel and encrypts credentials locally (like MyDevTools). For maximum security, use a firewall or SSH tunnel to restrict access.',
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
    title: 'How to Decode SSL Certificates: Read PEM, X.509, CSR Offline',
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
    description: 'Organize your work with a simple, offline to-do list on your desktop. Track tasks, set priorities, and boost productivity without leaving your workflow.',
    publishedAt: '2026-01-20',
    category: 'Utilities',
    toolSlug: 'to-do',
    keywords: ['to do list', 'task manager', 'productivity app', 'offline todo list', 'task organizer'],
    readingTimeMin: 5,
    sections: [
      {
        heading: 'Why developers need a task manager',
        body: `Coding involves context switching: bug fixes, features, code reviews, meetings, and interruptions. Without a clear task list, work gets scattered across browser tabs, Slack messages, and mental overhead.\n\nA simple to-do list helps you:\n\n- **Capture work instantly** — jot down tasks without leaving your editor.\n- **Prioritize** — decide what's urgent vs. deferrable.\n- **Reduce cognitive load** — stop remembering; let the tool track it.\n- **See progress** — checking off tasks is motivating and shows productivity.`,
      },
      {
        heading: 'Features of MyDevTools Task Manager',
        body: `- **Add tasks quickly** — keyboard-friendly interface.\n- **Set priority levels** — high, medium, low to focus on what matters.\n- **Check off completed tasks** — visual feedback as you work.\n- **Organize by project** — keep work grouped logically.\n- **Persistent storage** — tasks saved locally on your device.\n- **No bloat** — simple and focused, not a complex project management tool.`,
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
        a: 'Tasks are saved locally on your device, available offline whenever you open the app.',
      },
    ],
  },
  {
    slug: 'markdown-notes-app-for-developers',
    title: 'Markdown Notes: Quick Note-Taking for Developers',
    description: 'Create and organize Markdown notes on your desktop with zero friction. Fully offline, searchable, and your knowledge base stays on your device.',
    publishedAt: '2026-01-21',
    category: 'Utilities',
    toolSlug: 'notes',
    keywords: ['notes app', 'markdown notes', 'offline notes app', 'developer notes', 'note-taking tool'],
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
        body: `- **Live Markdown preview** — see formatting as you type.\n- **Full-text search** — find notes by keyword.\n- **Fully offline** — no cloud, no account round-trips, notes never leave your device.\n- **Local-first** — notes live on your machine, zero friction.\n- **Encrypted vault** — sensitive notes stay private.`,
      },
    ],
    faqs: [
      {
        q: 'Can I export my notes?',
        a: 'Download notes as Markdown files and use them anywhere. Copy-paste into GitHub, Notion, or your own site.',
      },
      {
        q: 'Is there offline support?',
        a: 'Yes — notes are fully offline. They are stored locally on your device and never require a network connection.',
      },
      {
        q: 'Can I collaborate on notes?',
        a: 'Current version is personal. For team notes, export to a shared Git repo or collaborative tool.',
      },
    ],
  },
  {
    slug: 'bookmark-manager-for-developer-resources',
    title: 'Bookmark Manager: Organize Developer Resources on Your Desktop',
    description: 'Save and tag your favorite developer links, articles, and tools. Instant access from your desktop toolkit without browser clutter.',
    publishedAt: '2026-01-22',
    category: 'Utilities',
    toolSlug: 'bookmarks',
    keywords: ['bookmark manager', 'link organizer', 'save links offline', 'developer bookmarks', 'bookmark organizer'],
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
        body: `- **Tags and folders** — organize hundreds of links.\n- **Full-text search** — find by keyword, not just title.\n- **Public/private** — share specific bookmarks or keep personal.\n- **Rich notes** — add context to why you saved a link.\n- **Fully offline** — bookmarks stay on your device, no cloud needed.`,
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
        body: `- **Encrypted storage** — AES-256-GCM encryption in a local vault on your machine.\n- **Per-project organization** — separate vars for different apps.\n- **Environment templates** — dev/staging/prod presets.\n- **Export to .env format** — copy directly into your project.\n- **Search and filter** — find vars by key or project.`,
      },
      {
        heading: 'Best practices for environment secrets',
        body: `- **Never hardcode secrets** — always use environment variables.\n- **Rotate regularly** — change API keys quarterly or after team changes.\n- **Limit access** — only developers who need a value see it.\n- **Audit logs** — track who accessed sensitive vars.\n- **Use .env.example** — document required vars without values.`,
      },
    ],
    faqs: [
      {
        q: 'Is it safe to store passwords in this tool?',
        a: 'MyDevTools is a desktop app that encrypts secrets locally on your machine with AES-256. For maximum security, use a dedicated secrets manager like 1Password, Vault, or AWS Secrets Manager.',
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
    description: 'Generate JSON Schema or typed models (TypeScript, Python, Go, Rust, Java) from sample JSON instantly and offline on your desktop.',
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
    title: 'S3 Drive: Browse and Manage AWS S3 Buckets from Your Desktop',
    description: 'Connect to AWS S3 or DigitalOcean Spaces, browse objects, upload/download files. Credentials encrypted locally before storage.',
    publishedAt: '2026-01-26',
    category: 'Databases',
    toolSlug: 's3-drive',
    keywords: ['s3 bucket manager', 'aws s3 client', 'digitalocean spaces', 's3 browser', 'cloud storage manager'],
    readingTimeMin: 6,
    sections: [
      {
        heading: 'Manage cloud storage without the CLI',
        body: `AWS S3 and DigitalOcean Spaces are object storage services. The AWS CLI is powerful but requires setup and terminal familiarity. An S3 manager built into an all-in-one desktop toolkit offers:\n\n- **Browse buckets** — navigate folder-like structures.\n- **Upload files** — drag-and-drop or select files.\n- **Download objects** — fetch any file directly.\n- **Delete or move** — manage objects without CLI commands.\n- **Credentials encrypted** — your AWS keys stay local, never exposed to servers.`,
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
        q: 'Is it safe to paste AWS credentials into this tool?',
        a: 'MyDevTools is a desktop app that encrypts credentials with AES-256 locally on your machine. For maximum security, use AWS temporary credentials (STS) or bucket-specific IAM policies.',
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
    slug: 'dns-lookup-records-checker-online',
    title: 'DNS Lookup: Check A, MX, TXT, NS Records from Your Desktop',
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
    title: 'Encryption Playground: AES-256-GCM Encrypt/Decrypt Offline',
    description: 'Encrypt text using AES-GCM with a passphrase or raw key. Decrypt messages. Educational and locally secure on your desktop.',
    publishedAt: '2026-01-30',
    category: 'Security',
    toolSlug: 'encryption-playground',
    keywords: ['aes gcm', 'aes 256 encryption', 'encrypt offline', 'decrypt text', 'web crypto api'],
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
        a: 'Encryption is secure, but this playground key management is not enterprise-grade. Use a password manager or key vault for production secrets.',
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
    slug: 'text-diff-checker-side-by-side-compare',
    title: 'Text Diff Checker: Compare Text Side by Side',
    description: 'Compare two texts and highlight additions (green) and deletions (red). Fast, offline desktop diff tool.',
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
    slug: '2048-game-puzzle-break',
    title: 'Play 2048: Slide and Merge Tiles Offline',
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
    title: 'Play Sudoku: 450 Unique Puzzles Offline',
    description: 'Play Sudoku with 150 puzzles per difficulty (easy, medium, hard) in the MyDevTools break room. Sign in to save progress.',
    publishedAt: '2026-02-12',
    category: 'Generators',
    toolSlug: 'break-room/sudoku',
    keywords: ['sudoku', 'sudoku offline', 'sudoku game', 'sudoku puzzle', 'brain game'],
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
    title: 'Play Snake: Classic Game Offline',
    description: 'Play the classic Snake game on your desktop. Eat food, grow your snake, avoid walls and yourself.',
    publishedAt: '2026-02-13',
    category: 'Generators',
    toolSlug: 'break-room/snake',
    keywords: ['snake game', 'snake offline', 'classic snake', 'desktop game', 'developer break'],
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
    keywords: ['minesweeper', 'minesweeper offline', 'classic minesweeper', 'puzzle game', 'brain game'],
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
    description: 'Play classic Tetris on your desktop. Stack falling Tetrimino pieces, clear lines, and level up.',
    publishedAt: '2026-02-15',
    category: 'Generators',
    toolSlug: 'break-room/tetris',
    keywords: ['tetris', 'tetris offline', 'classic tetris', 'block puzzle', 'desktop game'],
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
