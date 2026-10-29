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
]

export const blogPostSlugs = blogPosts.map((p) => p.slug)

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter((p) => p.category === category)
}
