# MyDevTools collection format (`formatVersion: 1`)

A collection is a folder of YAML files, one request per file, so it diffs and
merges like code. The desktop app reads and writes it ("Git-friendly folder"
collections) and `mdt run` executes it. This page is the reference for people
**and coding agents** writing these files by hand.

Source of truth: `apps/desktop-ui/src/lib/api-client/file-store.ts`
(`serializeCollection` / `parseCollection`). A test fails if a key that
file-store writes is missing from this page.

## Layout

```
my-api/
├── collection.yaml              ← manifest (required; marks the folder as a collection)
├── 001-login.yaml               ← a request
├── 002-users/                   ← a folder
│   ├── folder.yaml              ← folder metadata + defaults (optional)
│   ├── 001-list-users.yaml
│   └── 002-get-user.yaml
└── environments/                ← optional, read by `mdt run --env <name>` only
    └── local.yaml
```

- **Order** comes from the `NNN-` prefix (`001-`, `002-`, …), sorted
  numerically. The rest of the file name is a slug; the display name comes
  from `name:` inside the file (fallback: the file name without prefix).
- Only `.yaml` files count (not `.yml`). Files that aren't YAML mappings are
  skipped with a warning; nothing else breaks the load.
- A folder without `folder.yaml` still works: its name comes from the
  directory name.
- `id`s keep identity stable across renames. Use any unique string (UUIDs in
  files the app writes). If missing, an id is derived from the path.

## `collection.yaml`

```yaml
formatVersion: 1
id: shop
name: Shop
defaultHeaders:            # sent with every request below (see Inheritance)
  - key: X-Client
    value: mdt
defaultAuth:               # inherited by requests with auth `inherit`
  type: bearer
  token: '{{token}}'
variables:                 # collection variables
  - key: apiVersion
    value: v1
preRequestScript: |        # runs before every request's own pre-request script
  pm.request.headers.add({ key: "X-Run", value: Date.now() })
testScript: |              # runs before every request's own test script
  pm.test("not a server error", () => pm.expect(pm.response.code).to.be.below(500))
```

Optional TLS keys (desktop app; the CLI ignores them for now):

```yaml
clientCerts:               # sent to hosts matching `host`; first match wins
  - id: c1
    host: "*.corp.example"   # host[:port], *.domain, or *
    type: pem                # pem | pfx
    certPath: /abs/path/client.crt
    keyPath: /abs/path/client.key   # omit if the key is inside certPath
  - id: c2
    host: api.example.com:8443
    type: pfx
    pfxPath: /abs/path/client.p12
    passphrase: "{{vault.clientPfx}}"   # only {{…}} references are written, never a literal
caPaths:                   # extra PEM CA files, trusted alongside the system roots
  - /abs/path/corp-ca.pem
```

Paths are machine-local; collection share links never include these keys.

## `folder.yaml`

Same keys as the manifest minus `formatVersion`, `variables`, `clientCerts` and `caPaths`:
`id`, `name`, `description`, `defaultHeaders`, `defaultAuth`, `preRequestScript`, `testScript`.

## Request files

Every key is optional except `method` and `url` (defaults: `GET`, empty).
Keys are written in this order; unknown keys are ignored.

| Key | Type | Meaning |
|---|---|---|
| `formatVersion` | `1` | Manifest only. |
| `id` | string | Stable identity. |
| `name` | string | Display name. |
| `kind` | `websocket` \| `grpc` | Omit for HTTP requests. |
| `method` | string | `GET`, `POST`, … or any custom token (`PURGE`, `PROPFIND`). |
| `url` | string | May contain `{{variables}}`. Query string allowed. |
| `description` | string | Markdown docs for the request (also allowed in `folder.yaml` and the manifest). Shown in the Docs tab and the HTML docs export. |
| `params` | key-value list | Query parameters appended to the URL. |
| `headers` | key-value list | Request headers. |
| `omitHeaders` | string[] | Inherited header names this request does **not** send. |
| `body` | object | See [Body](#body). |
| `auth` | object | See [Auth](#auth). Omitted = none. |
| `defaultHeaders` | key-value list | Manifest / `folder.yaml` only. |
| `defaultAuth` | auth object | Manifest / `folder.yaml` only. |
| `variables` | key-value list | Manifest only: collection variables. |
| `timeoutMs` | number | Request timeout (default 30000, max 600000). |
| `useCookieJar` | `false` | Don't send or store cookies for this request. |
| `followRedirects` | `false` | Return 3xx responses instead of following them. |
| `maxRedirects` | number | Default 5, max 50. |
| `verifySsl` | `false` | Accept invalid/self-signed TLS certificates. |
| `assertions` | list | See [Assertions](#assertions). |
| `preRequestScript` | string | JavaScript run before sending. See [Scripts](#scripts). |
| `testScript` | string | JavaScript run after the response. |
| `websocket` | `{ draft, protocols }` | WebSocket tabs: message draft + subprotocols. |
| `grpc` | object | gRPC tabs: `protoSource`, `selectedPath`, `requestJson`, `transport`, … |
| `examples` | list | Saved responses (`name`, `request`, `response`, `capturedAt`). |

**Key-value list** (`params`, `headers`, `defaultHeaders`, `variables`,
`body.urlEncoded`): `[{ key, value, active? }]` — `active: false` keeps a row
but doesn't send it.

### Body

```yaml
body:
  type: json            # none | json | text | xml | x-www-form-urlencoded | form-data | graphql | binary
  content: '{"name": "{{user}}"}'
```

| `type` | Fields | Sent as |
|---|---|---|
| `json` | `content` | Must parse as JSON after substitution. `Content-Type: application/json`. |
| `text` | `content` | `text/plain` unless you set Content-Type. |
| `xml` | `content` | `application/xml` unless you set Content-Type. |
| `x-www-form-urlencoded` | `urlEncoded`: key-value list | URL-encoded form. |
| `form-data` | `formData`: `[{ key, value, active, valueType: text\|file, fileName?, fileType?, fileContentBase64? }]` | Multipart. File bytes are base64 inline. |
| `graphql` | `content` (query), `graphqlVariables` (JSON string) | `{ query, variables }` as JSON. |
| `binary` | `binaryFile: { fileName, fileType, fileContentBase64 }` | Raw bytes. |

### Auth

```yaml
auth:
  type: bearer          # inherit | bearer | basic | api-key | oauth2 | aws-sigv4 | hawk | digest | ntlm | jwt-bearer | spnego
  token: '{{token}}'
```

| `type` | Fields |
|---|---|
| `inherit` | Use the nearest folder/collection `defaultAuth`. Omitted auth behaves the same. |
| `bearer` | `token` |
| `basic` | `username`, `password` |
| `api-key` | `apiKeyKey`, `apiKeyValue`, `apiKeyLocation: header\|query` |
| `oauth2` | `oauth2: { grantType: client_credentials\|password\|authorization_code\|refresh_token, tokenUrl, clientId, clientSecret?, scope?, audience?, username?, password? }` |
| `aws-sigv4`, `hawk`, `digest`, `ntlm`, `jwt-bearer`, `spnego` | Their own sub-object (`awsSigV4`, `hawk`, …). |

**Secrets never go in these files.** When the app writes a collection, literal
values of `token`, `password`, `apiKeyValue`, `oauth2.clientSecret`, … are
dropped. Write a reference instead: `{{token}}` (environment/CLI variable) or
`{{vault.<name>}}` (the desktop app's encrypted vault; not available to the CLI).

**The CLI and the collection runner apply** `bearer`, `basic`, `api-key` and
`oauth2` (`client_credentials` and `password`; tokens are fetched per run).
The other types are applied only when sending from the desktop app.

### Assertions

```yaml
assertions:
  - target: res.status
    operator: eq
    value: '200'
  - target: res.body.items[*].id
    operator: isArray
  - target: res.headers.content-type
    operator: contains
    value: json
    enabled: false        # kept, not evaluated
```

- **target**: `res.status`, `res.responseTime`, `res.headers.<name>`
  (case-insensitive), `res.body`, or a JSONPath into the body:
  `res.body.data[0].id`, `res.body.items[*].id`, `res.body..id`.
- **value** is read as JSON when it parses (`200`, `"ok"`, `[200, 201]`),
  otherwise as text; simple values compare loosely (`"3"` equals `3`).
- **operator**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`,
  `contains`, `notContains`, `startsWith`, `endsWith`, `matches`, `notMatches`,
  and (no `value`) `isNull`, `isUndefined`, `isDefined`, `isEmpty`,
  `isNotEmpty`, `isTruthy`, `isFalsy`, `isNumber`, `isString`, `isBoolean`,
  `isArray`, `isJson`.

Each enabled row becomes a test result named `<target> <operator> <value>`.

## Variables

`{{name}}` works in the URL, params, headers, body, auth fields and
assertion values. Resolution order, first match wins:

1. `{{response.body.x}}` / `{{response.headers.x}}` / `{{response.status}}` — the previous response in the run
2. data row (`mdt run --data`)
3. values scripts set with `pm.environment.set` during the run
4. session variables (`pm.variables.set`, `pm.collectionVariables.set`, `bru.setVar`)
5. environment (`--env`, `--env-var`)
6. collection `variables`
7. globals (desktop app)
8. `{{vault.*}}` / `{{env.*}}` secrets (desktop app)
9. dynamic values: `{{$guid}}`, `{{$randomUUID}}`, `{{$timestamp}}`, `{{$isoTimestamp}}`,
   `{{$randomInt}}`, `{{$randomBoolean}}`, `{{$randomEmail}}`, `{{$randomFirstName}}`,
   `{{$randomLastName}}`, `{{$randomFullName}}`, `{{$randomUserName}}`,
   `{{$randomPhoneNumber}}`, `{{$randomCity}}`, `{{$randomCountry}}`, `{{$randomColor}}`,
   `{{$randomHexColor}}`, `{{$randomIP}}`, `{{$randomDomainName}}`, `{{$randomUrl}}`,
   `{{$randomWord}}`, `{{$randomAlphaNumeric}}`, `{{$randomPrice}}` — fresh per use

## Inheritance

Collection → folders → request, resolved at send time (never copied into
request files):

- **Headers**: ancestors' `defaultHeaders` are added; the nearest ancestor wins
  on a name clash, and the request's own `headers` win over all. A request
  drops an inherited header by listing its name in `omitHeaders`.
- **Auth**: the request's own auth wins; `inherit` (or no auth) takes the
  nearest ancestor's `defaultAuth`.
- **Scripts**: ancestor scripts run before the request's own, outermost first.

## Scripts

Postman-style JavaScript. Top-level `await` works. Both Postman (`pm.*`) and
Bruno (`bru`, `req`, `res`, `test`, `expect`) styles are available.

| API | |
|---|---|
| `pm.environment` | `get`, `set`, `unset`, `has`, `toObject` |
| `pm.variables` | `get` (all scopes), `set` (session), `has` |
| `pm.collectionVariables`, `pm.globals` | `get`, `set` (writes the session), `has`, `toObject` |
| `pm.request` | `url`, `method`, `body` (read/write); `headers.get/add/upsert/remove/toObject` — `add({ key, value })` or `add(name, value)` |
| `pm.response` | `code`, `status`, `responseTime`, `headers.get/has/toObject`, `text()`, `json()`, `to.have.status(n)` |
| `pm.test(name, fn)` | Records a pass/fail result; `fn` may be async. |
| `pm.expect(v)` / `expect(v)` | chai-style: `.to.equal`, `.eql`, `.be.a`, `.include`, `.have.property`, `.lengthOf`, `.above`/`.below`, `.match`, `.oneOf`, `.keys`, `.members`, `.not`, … |
| `pm.sendRequest(urlOrRequest, cb?)` | Returns a promise of `{ code, headers, json(), text() }`; goes through the same proxy as normal requests. |
| `require('uuid')` | `{ v4 }` |
| `require('crypto-js')` | `MD5`, `SHA256`, `HmacSHA256`, `HmacMD5`, `enc.Hex/Utf8/Latin1/Base64` |
| `bru` | `getEnvVar`, `setEnvVar`, `hasEnvVar`, `deleteEnvVar`, `getVar`, `setVar`, `hasVar`, `sleep(ms)`, `sendRequest` |
| `req` / `res` | `req.getUrl/setUrl/getMethod/setMethod/getHeader/setHeader/deleteHeader/getHeaders/setHeaders/getBody/setBody`; `res.status`, `res.body`, `res.headers`, `res.responseTime`, `res.getStatus/getHeader/getHeaders/getBody/getResponseTime` |
| `console.log/warn/error` | Shown in the run output. |

Scripts get no DOM, no `process`/`fs`, and no network except
`pm.sendRequest`. Limits: 5 s of script time per script (waiting on
`pm.sendRequest` doesn't count), 60 s overall.

## Complete example

`002-users/002-get-user.yaml`:

```yaml
id: 9b1d4c7e-get-user
name: Get user
method: GET
url: '{{baseUrl}}/users/{{userId}}'
headers:
  - key: Accept
    value: application/json
auth:
  type: inherit
assertions:
  - target: res.status
    operator: eq
    value: '200'
  - target: res.body.email
    operator: matches
    value: '^.+@.+$'
testScript: |-
  const user = pm.response.json()
  pm.environment.set("userName", user.name)
  pm.test("has an id", () => pm.expect(user).to.have.property("id"))
```

Run it: `mdt run my-api --env local --env-var baseUrl=http://localhost:8080`.

## `environments/<name>.yaml` (CLI)

Not part of the app's collection files — environments live in the app. For
the CLI, any of these work:

```yaml
variables:
  - key: baseUrl
    value: http://localhost:8080
  - key: debug
    value: '1'
    enabled: false
```

or a plain map (`baseUrl: http://localhost:8080`), a Postman environment
export, or a Bruno `.bru` environment.
