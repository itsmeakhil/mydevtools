export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

/** Persisted in localStorage; translate in UI with ApiClient.defaults */
export const API_CLIENT_DEFAULT_TAB_NAME = "New Request"
export const API_CLIENT_IMPORTED_TAB_NAME = "Imported Request"
/** Stored on failed requests; translate in UI via responsePanel.errorStatusLabel */
export const API_CLIENT_ERROR_STATUS_TEXT = "Error"

export interface KeyValueItem {
    id: string
    key: string
    value: string
    active: boolean
}

export interface RequestBody {
    type: "json" | "text" | "none" | "form-data" | "x-www-form-urlencoded" | "graphql"
    content: string
    formData?: RequestFormDataItem[]
    urlEncoded?: KeyValueItem[]
    /** GraphQL variables — JSON-encoded string. Only used when `type === "graphql"`. */
    graphqlVariables?: string
}

export interface RequestFormDataItem {
    id: string
    key: string
    value: string
    active: boolean
    valueType: "text" | "file"
    fileName?: string
    fileType?: string
    fileContentBase64?: string
}

export interface AwsSigV4Config {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
    region: string
    service: string
}

export interface HawkConfig {
    id: string
    key: string
    /** Default sha256. */
    algorithm?: "sha256" | "sha1"
    ext?: string
    /** When true, body is hashed and included as `hash=...`. */
    includePayloadHash?: boolean
}

export interface NtlmConfig {
    username: string
    password: string
    domain?: string
    workstation?: string
}

export interface SpnegoConfig {
    /** Pre-acquired SPNEGO / Kerberos token (base64). */
    token: string
}

export interface JwtBearerConfig {
    algorithm: "HS256" | "HS384" | "HS512" | "RS256" | "ES256"
    secret?: string
    privateKeyPem?: string
    issuer?: string
    subject?: string
    audience?: string
    ttlSeconds?: number
    /** JSON object string of arbitrary extra claims merged into the payload. */
    extraClaimsJson?: string
}

export interface DigestConfig {
    username: string
    password: string
    realm: string
    nonce: string
    qop?: "auth" | "auth-int"
    algorithm?: "MD5" | "SHA-256"
    opaque?: string
    nc?: string
    cnonce?: string
}

export interface RequestAuth {
    type: "none" | "bearer" | "basic" | "api-key" | "oauth2" | "aws-sigv4" | "hawk" | "digest" | "ntlm" | "jwt-bearer" | "spnego"
    token?: string
    username?: string
    password?: string
    apiKeyKey?: string
    apiKeyValue?: string
    apiKeyLocation?: "header" | "query"
    oauth2?: import("@/lib/oauth2").OAuth2Config
    awsSigV4?: AwsSigV4Config
    hawk?: HawkConfig
    digest?: DigestConfig
    ntlm?: NtlmConfig
    jwtBearer?: JwtBearerConfig
    spnego?: SpnegoConfig
}

export interface RedirectHop {
    url: string
    status: number
}

export interface ScriptTestResult {
    name: string
    pass: boolean
    error?: string
}

export interface ScriptLog {
    level: "log" | "warn" | "error"
    args: string[]
}

export interface ScriptRunOutcome {
    tests: ScriptTestResult[]
    logs: ScriptLog[]
    /** Variables the script set on `pm.environment.*` — caller persists. */
    envMutations: { sets: Record<string, string>; unsets: string[] }
    /** Variables the script set on `pm.variables.*` — session-only, not persisted. */
    sessionVars: Record<string, string>
    /** Pre-request only: an overridden URL / headers / method / body the script wrote
     *  via `pm.request.*`. Empty when the script left them untouched. */
    requestOverrides?: {
        url?: string
        method?: string
        headers?: Record<string, string>
        body?: string
    }
    error?: string
}

export interface ApiResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    /** Each Set-Cookie header preserved separately. Multi-header Set-Cookie can't be
     *  recovered from the comma-joined value in `headers`, so the proxy emits them here. */
    setCookies?: string[]
    /** Hops walked before the final response (final response itself NOT included).
     *  Empty / undefined ⇒ no redirect. */
    redirectChain?: RedirectHop[]
    body: string
    isBase64?: boolean
    time: number
    size: number
    error?: string
}

export type TabKind = "rest" | "websocket" | "grpc"

export interface GrpcWebState {
    /** Pasted .proto source. */
    protoSource: string
    /** Selected `package.Service/Method` path. */
    selectedPath?: string
    /** JSON for the request message — protobufjs-style camelCase keys. */
    requestJson: string
    /** Use the base64 grpc-web-text wire format (helps when binary is blocked). */
    useTextFormat?: boolean
    /** "web" → direct fetch with gRPC-Web framing.
     *  "native" → routed through `/api/proxy-grpc` with HTTP/2 + standard gRPC framing. */
    transport?: "web" | "native"
    /** Extra request messages for client-streaming / bidi. JSON strings.
     *  `requestJson` is the first frame; entries here follow in order. */
    extraRequestMessages?: string[]
    /** Live transcript across all invocations on this tab — captures every sent + received message. */
    transcript?: Array<{
        id: string
        direction: "sent" | "received"
        timestamp: number
        json: string
        sizeBytes: number
    }>
    /** Last unary response, decoded. */
    response?: {
        status: number
        grpcStatus?: number
        grpcMessage?: string
        time: number
        size: number
        messageJson: string
        headers: Record<string, string>
        trailers: Record<string, string>
    }
}

export interface WebSocketMessage {
    id: string
    direction: "sent" | "received"
    timestamp: number
    data: string
}

export interface WebSocketState {
    status: "idle" | "connecting" | "open" | "closing" | "closed"
    closeCode?: number
    closeReason?: string
    messages: WebSocketMessage[]
    /** Editor draft — what the user has typed but not yet sent. */
    draft: string
    /** Optional list of `key:value` lines to attach as `Sec-WebSocket-Protocol` and headers. */
    protocols?: string
}

/** Public-only fragment of the GraphQL spec we care about for the schema explorer. */
export interface GraphQLIntrospectionType {
    name?: string
    kind?: string
    fields?: Array<{ name: string; type?: { name?: string; ofType?: { name?: string } } }>
    description?: string
}

export interface ApiRequestState {
    id: string
    name: string
    /** "rest" (default — HTTP request) or "websocket" (WS client). */
    kind?: TabKind
    method: RequestMethod
    url: string
    params: KeyValueItem[]
    headers: KeyValueItem[]
    body: RequestBody
    auth: RequestAuth
    response: ApiResponse | null
    isLoading: boolean
    websocket?: WebSocketState
    grpc?: GrpcWebState
    /** Last successful GraphQL introspection result for this tab. */
    graphqlSchema?: { types: GraphQLIntrospectionType[]; queryType?: string; mutationType?: string; subscriptionType?: string }
    /** Per-request timeout override (ms). Falls back to proxy default when omitted. */
    timeoutMs?: number
    /** When false, the cookie jar does not attach cookies or store Set-Cookie for this request.
     *  Defaults to true. */
    useCookieJar?: boolean
    /** Optional JS sandbox script run before each send (Postman-style `pm.*`). */
    preRequestScript?: string
    /** Optional JS sandbox script run after each response — assertions land in the Tests tab. */
    testScript?: string
    /** Most recent script results (pre-request + test combined). Cleared on send. */
    scriptResults?: {
        tests: ScriptTestResult[]
        logs: ScriptLog[]
        errors: string[]
    }
    /** Saved response snapshots — copied from the request when loaded from a collection,
     *  appended when the user clicks Save-as-example. */
    examples?: SavedExample[]
    /** Threaded discussion on this request. Persisted with the collection. */
    comments?: RequestComment[]
}

export interface SavedExampleRequest {
    method: RequestMethod
    url: string
    headers: KeyValueItem[]
    body: RequestBody
}

export interface SavedExampleResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    isBase64?: boolean
    contentType?: string
}

export interface SavedExample {
    id: string
    name: string
    request: SavedExampleRequest
    response: SavedExampleResponse
    /** Epoch ms when the snapshot was taken. */
    capturedAt: number
}

export interface RequestComment {
    id: string
    /** Display name of the author (Firebase displayName / email / fallback). */
    author: string
    /** Epoch ms */
    createdAt: number
    text: string
}

export interface CollectionRequest extends Omit<ApiRequestState, "response" | "isLoading" | "scriptResults"> {
    id: string
    name: string
    examples?: SavedExample[]
}

export interface CollectionFolder {
    id: string
    name: string
    type: "folder"
    items: (CollectionFolder | CollectionRequest)[]
    isOpen?: boolean
    /** Folder-level defaults — merged into requests inside this folder when loaded
     *  or run. Headers are appended; auth is only used when the request has no
     *  explicit auth; scripts run before/after the request's own scripts. */
    defaultHeaders?: KeyValueItem[]
    defaultAuth?: RequestAuth
    preRequestScript?: string
    testScript?: string
}

export interface Collection {
    id: string
    name: string
    items: (CollectionFolder | CollectionRequest)[]
    /** Free-form workspace label (e.g. "Personal", "Acme Prod"). Empty / undefined = default workspace. */
    workspace?: string
    /** Desktop-only: set when this collection is backed by a folder of YAML files
     *  (git-friendly). In-memory marker — never sent to the backend. */
    source?: { kind: "file"; path: string }
}

export interface HistoryRequest extends CollectionRequest {
    timestamp: number
    status?: number
}
