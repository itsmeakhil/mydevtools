/**
 * Elasticsearch / OpenSearch REST client for the data explorer.
 *
 * Talks to a user-supplied cluster URL directly from the webview. Unlike
 * Firestore there is no token exchange — authentication is a single static
 * header (Basic / ApiKey / Bearer) attached to every request. And unlike
 * Firestore there is no typed-value codec: an ES document `_source` is plain
 * JSON on the wire, so it round-trips through the editor untouched.
 *
 * Every message that can leave this module goes through
 * `sanitizeElasticsearchError` — the Authorization header value (which for
 * Basic/ApiKey auth *is* the credential) must never reach a toast or log.
 *
 * ponytail: webview `fetch` cannot skip TLS verification, so a cluster on a
 * self-signed cert (Elasticsearch 8.x defaults to https with one) fails to
 * connect. Point at Elastic Cloud, a reverse proxy, or a cluster with a
 * trusted cert. Add a native Rust request path if self-signed local clusters
 * become a common ask.
 */
import { sanitizeError } from "@/lib/nosql-error-sanitizer";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type ElasticsearchAuthMode = "none" | "basic" | "apiKey" | "bearer";

export interface ElasticsearchConfig {
    /** Cluster base URL, e.g. "https://localhost:9200" or an Elastic Cloud endpoint. */
    baseUrl: string;
    authMode: ElasticsearchAuthMode;
    username?: string;
    password?: string;
    /** Base64 `id:api_key` as issued by the ES `_security/api_key` API. */
    apiKey?: string;
    bearerToken?: string;
}

/** UTF-8-safe base64 — plain `btoa` throws on non-Latin1 credentials. */
function base64Utf8(input: string): string {
    return btoa(String.fromCharCode(...new TextEncoder().encode(input)));
}

/** The single Authorization header for the configured auth mode, or null for none. */
export function authHeader(config: ElasticsearchConfig): string | null {
    switch (config.authMode) {
        case "basic":
            return "Basic " + base64Utf8(`${config.username ?? ""}:${config.password ?? ""}`);
        case "apiKey":
            return "ApiKey " + (config.apiKey ?? "");
        case "bearer":
            return "Bearer " + (config.bearerToken ?? "");
        default:
            return null;
    }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ElasticsearchErrorKind =
    | "auth"
    | "forbidden"
    | "notFound"
    | "badQuery"
    | "conflict"
    | "network"
    | "unknown";

export class ElasticsearchApiError extends Error {
    kind: ElasticsearchErrorKind;
    httpStatus: number;

    constructor(kind: ElasticsearchErrorKind, message: string, httpStatus = 0) {
        super(sanitizeElasticsearchError(message));
        this.name = "ElasticsearchApiError";
        this.kind = kind;
        this.httpStatus = httpStatus;
    }
}

interface EsErrorBody {
    error?:
        | string
        | {
              type?: string;
              reason?: string;
              root_cause?: Array<{ type?: string; reason?: string }>;
          };
    status?: number;
}

/** Map a non-OK Elasticsearch REST response to a typed error. */
export function mapElasticsearchError(
    httpStatus: number,
    body: EsErrorBody | undefined,
): ElasticsearchApiError {
    const err = body?.error;
    const type = typeof err === "object" ? (err.type ?? err.root_cause?.[0]?.type ?? "") : "";
    const reason =
        typeof err === "string"
            ? err
            : (err?.reason ?? err?.root_cause?.[0]?.reason ?? `HTTP ${httpStatus}`);

    if (httpStatus === 401) return new ElasticsearchApiError("auth", reason, httpStatus);
    if (httpStatus === 403) return new ElasticsearchApiError("forbidden", reason, httpStatus);
    if (httpStatus === 404 || type === "index_not_found_exception")
        return new ElasticsearchApiError("notFound", reason, httpStatus);
    if (httpStatus === 409 || type === "version_conflict_engine_exception")
        return new ElasticsearchApiError("conflict", reason, httpStatus);
    // Malformed query — parse errors, bad DSL, unmapped fields used in a query.
    if (
        httpStatus === 400 ||
        /parse|parsing|query_shard|search_phase_execution|illegal_argument/.test(type)
    )
        return new ElasticsearchApiError("badQuery", reason, httpStatus);
    return new ElasticsearchApiError("unknown", reason, httpStatus);
}

/**
 * Fail-closed scrub applied to every outbound message: the Authorization
 * header value for each auth scheme, then the shared credential sanitizer.
 */
export function sanitizeElasticsearchError(message: string): string {
    let out = message;
    out = out.replace(/\b(Basic|ApiKey|Bearer)\s+[A-Za-z0-9+/=_.-]+/g, "$1 ***");
    return sanitizeError(out);
}

// ---------------------------------------------------------------------------
// Request wrapper
// ---------------------------------------------------------------------------

/** Trim a trailing slash so `baseUrl + "/" + path` never doubles up. */
function normalizeBase(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, "");
}

/**
 * Authenticated call against the cluster. `path` is everything after the
 * base URL, already encoded, without a leading slash.
 */
export async function esFetch(
    config: ElasticsearchConfig,
    method: string,
    path: string,
    body?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const auth = authHeader(config);
    let res: Response;
    try {
        res = await fetch(`${normalizeBase(config.baseUrl)}/${path}`, {
            method,
            headers: {
                ...(auth ? { Authorization: auth } : {}),
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ElasticsearchApiError("network", "network error reaching Elasticsearch");
    }
    const json = await res.json().catch(() => undefined);
    if (!res.ok) throw mapElasticsearchError(res.status, json);
    return json;
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export interface IndexInfo {
    index: string;
    docsCount: string | null;
    storeSize: string | null;
}

/**
 * Every index in the cluster, sorted by name. Uses `_cat/indices` with a
 * fixed column set so the sidebar can show doc counts without a second call.
 */
export async function listIndices(config: ElasticsearchConfig): Promise<IndexInfo[]> {
    const rows: Array<{ index?: string; "docs.count"?: string; "store.size"?: string }> =
        await esFetch(
            config,
            "GET",
            "_cat/indices?format=json&h=index,docs.count,store.size&s=index",
        );
    return (rows ?? [])
        .filter((r) => r.index)
        .map((r) => ({
            index: r.index as string,
            docsCount: r["docs.count"] ?? null,
            storeSize: r["store.size"] ?? null,
        }));
}

export interface EsHit {
    _index: string;
    _id: string;
    _score?: number | null;
    _source: Record<string, unknown>;
}

export interface SearchResult {
    hits: EsHit[];
    /** Total matching docs (with `track_total_hits`), null when the cluster caps it. */
    total: number | null;
}

export interface SearchInput {
    index: string;
    mode: "lucene" | "dsl";
    /** Lucene `query_string` syntax; empty = match_all. Used when mode is "lucene". */
    queryString: string;
    /** Raw Query DSL request body JSON. Used when mode is "dsl". */
    dslText: string;
    size: number;
    from: number;
}

export type SearchPrepError = "invalidJson" | "notObject";

/**
 * Build the `_search` request body from the pane's controls. In DSL mode the
 * user owns the whole body (we only inject from/size when they omit them); in
 * Lucene mode we wrap their text in a `query_string` query, or `match_all`
 * when it is blank.
 */
export function prepareSearchBody(
    input: SearchInput,
): { body: Record<string, unknown> } | { error: SearchPrepError } {
    if (input.mode === "dsl") {
        let parsed: unknown;
        try {
            parsed = JSON.parse(input.dslText.trim() || "{}");
        } catch {
            return { error: "invalidJson" };
        }
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
            return { error: "notObject" };
        const body = { ...(parsed as Record<string, unknown>) };
        // Respect an explicit from/size in the DSL; otherwise page it ourselves.
        if (body.size === undefined) body.size = input.size;
        if (body.from === undefined) body.from = input.from;
        if (body.track_total_hits === undefined) body.track_total_hits = true;
        return { body };
    }
    const q = input.queryString.trim();
    return {
        body: {
            query: q ? { query_string: { query: q } } : { match_all: {} },
            size: input.size,
            from: input.from,
            track_total_hits: true,
        },
    };
}

export async function search(
    config: ElasticsearchConfig,
    index: string,
    body: Record<string, unknown>,
): Promise<SearchResult> {
    const out = await esFetch(config, "POST", `${encodeURIComponent(index)}/_search`, body);
    const rawTotal = out?.hits?.total;
    // ES 7+ returns {value,relation}; older returns a bare number.
    const total =
        typeof rawTotal === "number"
            ? rawTotal
            : typeof rawTotal?.value === "number"
              ? rawTotal.value
              : null;
    return { hits: out?.hits?.hits ?? [], total };
}

export type DocWriteError = "invalidJson" | "notObject";

/** Parse the JSON a user typed for a document `_source`; it must be an object. */
export function prepareDocSource(
    jsonText: string,
): { source: Record<string, unknown> } | { error: DocWriteError } {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return { error: "invalidJson" };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
        return { error: "notObject" };
    return { source: parsed as Record<string, unknown> };
}

/**
 * Index (create or full-replace) a document. With an id it is a `PUT
 * _doc/{id}`; without one ES assigns the id via `POST _doc`. `refresh=wait_for`
 * so the caller's next search reflects the write.
 */
export async function indexDoc(
    config: ElasticsearchConfig,
    index: string,
    id: string | undefined,
    source: Record<string, unknown>,
): Promise<{ _id: string }> {
    const idPath = id ? `/${encodeURIComponent(id)}` : "";
    const out = await esFetch(
        config,
        id ? "PUT" : "POST",
        `${encodeURIComponent(index)}/_doc${idPath}?refresh=wait_for`,
        source,
    );
    return { _id: out?._id ?? id ?? "" };
}

export async function deleteDoc(
    config: ElasticsearchConfig,
    index: string,
    id: string,
): Promise<void> {
    await esFetch(
        config,
        "DELETE",
        `${encodeURIComponent(index)}/_doc/${encodeURIComponent(id)}?refresh=wait_for`,
    );
}

/** Cluster info — cheap authed reachability probe for testConnection. */
export async function pingCluster(config: ElasticsearchConfig): Promise<void> {
    await esFetch(config, "GET", "");
}
