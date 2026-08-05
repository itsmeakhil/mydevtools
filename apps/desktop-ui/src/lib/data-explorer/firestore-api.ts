/**
 * Cloud Firestore REST API client for the data explorer.
 *
 * Talks to firestore.googleapis.com/v1 directly from the webview with a
 * user-supplied service account (the Firestore Web SDK cannot list root
 * collections, which an explorer needs). Auth is a self-signed RS256 JWT
 * exchanged for an OAuth2 access token via the jwt-bearer grant, reusing
 * the existing WebCrypto signer in lib/auth/jwt-bearer.
 *
 * Every message that can leave this module goes through
 * `sanitizeFirestoreError` — private keys, JWTs and access tokens must
 * never reach a toast or log.
 */
import { signJwt } from "@/lib/auth/jwt-bearer";
import { sanitizeError } from "@/lib/nosql-error-sanitizer";

// ---------------------------------------------------------------------------
// Config / service account
// ---------------------------------------------------------------------------

export interface FirestoreConfig {
    /** The full service-account JSON as pasted by the user. */
    serviceAccountJson: string;
    /** Firestore database id; "(default)" unless the project uses named DBs. */
    databaseId: string;
}

export interface ServiceAccount {
    projectId: string;
    clientEmail: string;
    privateKey: string;
}

/**
 * Parse and validate a pasted service-account JSON. Returns the parsed
 * account, or an i18n key path (relative to the `DataExplorer` namespace)
 * naming the first problem found.
 */
export function parseServiceAccount(
    json: string,
): ServiceAccount | { errorKey: string } {
    let raw: Record<string, unknown>;
    try {
        raw = JSON.parse(json);
    } catch {
        return { errorKey: "validation.serviceAccountInvalidJson" };
    }
    if (
        !raw ||
        typeof raw !== "object" ||
        raw.type !== "service_account" ||
        typeof raw.project_id !== "string" ||
        !raw.project_id ||
        typeof raw.client_email !== "string" ||
        !raw.client_email
    ) {
        return { errorKey: "validation.serviceAccountNotServiceAccount" };
    }
    let privateKey = typeof raw.private_key === "string" ? raw.private_key : "";
    // Common paste bug: the key arrives double-escaped ("\\n" literals, no
    // real newlines). Normalize before checking the PEM marker.
    if (!privateKey.includes("\n") && privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
    }
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
        return { errorKey: "validation.serviceAccountBadKey" };
    }
    return {
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey,
    };
}

// ---------------------------------------------------------------------------
// Typed-value codec
// ---------------------------------------------------------------------------

/** One Firestore REST `Value` — exactly one of these keys is set. */
export interface FirestoreValue {
    nullValue?: null;
    booleanValue?: boolean;
    integerValue?: string;
    doubleValue?: number | string; // "NaN" / "Infinity" / "-Infinity" arrive as strings
    stringValue?: string;
    timestampValue?: string;
    referenceValue?: string;
    bytesValue?: string;
    geoPointValue?: { latitude: number; longitude: number };
    arrayValue?: { values?: FirestoreValue[] };
    mapValue?: { fields?: Record<string, FirestoreValue> };
}

export interface FirestoreDocument {
    name: string;
    fields?: Record<string, FirestoreValue>;
    createTime?: string;
    updateTime?: string;
}

export function decodeValue(value: FirestoreValue): unknown {
    if ("nullValue" in value) return null;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.integerValue !== undefined) {
        const n = Number(value.integerValue);
        return Number.isSafeInteger(n) ? n : value.integerValue;
    }
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.timestampValue !== undefined) return value.timestampValue;
    if (value.referenceValue !== undefined) return value.referenceValue;
    if (value.bytesValue !== undefined) return value.bytesValue;
    if (value.geoPointValue !== undefined)
        return {
            latitude: value.geoPointValue.latitude,
            longitude: value.geoPointValue.longitude,
        };
    if (value.arrayValue !== undefined)
        return (value.arrayValue.values ?? []).map(decodeValue);
    if (value.mapValue !== undefined) return decodeFields(value.mapValue.fields ?? {});
    return null;
}

export function decodeFields(
    fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
    return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((x, i) => deepEqual(x, b[i]));
    }
    if (typeof a === "object") {
        const ka = Object.keys(a as object);
        const kb = Object.keys(b as object);
        if (ka.length !== kb.length) return false;
        return ka.every((k) =>
            deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
        );
    }
    return false;
}

function isGeoPointShape(v: unknown): v is { latitude: number; longitude: number } {
    return (
        typeof v === "object" &&
        v !== null &&
        !Array.isArray(v) &&
        Object.keys(v).length === 2 &&
        typeof (v as Record<string, unknown>).latitude === "number" &&
        typeof (v as Record<string, unknown>).longitude === "number"
    );
}

/**
 * Encode a plain JSON value back to a Firestore `Value`.
 *
 * Diff-preserving with sticky types: an unchanged value returns the original
 * wire value verbatim (perfect round-trip for int-vs-double, timestamps,
 * bytes, NaN…); a changed value keeps the original's type where the new
 * value is compatible; a brand-new value falls back to inference. New
 * timestamp/reference/bytes/geopoint fields cannot be created this way.
 * ponytail: sticky-type-only; add $type annotations if users ask.
 */
export function encodeValue(plain: unknown, original?: FirestoreValue): FirestoreValue {
    if (original !== undefined) {
        if (deepEqual(decodeValue(original), plain)) return original;
        if (typeof plain === "string") {
            if (original.timestampValue !== undefined) return { timestampValue: plain };
            if (original.referenceValue !== undefined) return { referenceValue: plain };
            if (original.bytesValue !== undefined) return { bytesValue: plain };
        }
        if (typeof plain === "number" && Number.isInteger(plain)) {
            if (original.integerValue !== undefined) return { integerValue: String(plain) };
            if (original.doubleValue !== undefined) return { doubleValue: plain };
        }
        if (original.geoPointValue !== undefined && isGeoPointShape(plain))
            return { geoPointValue: plain };
        if (original.arrayValue !== undefined && Array.isArray(plain)) {
            const origValues = original.arrayValue.values ?? [];
            return {
                arrayValue: {
                    values: plain.map((el, i) => encodeValue(el, origValues[i])),
                },
            };
        }
        if (
            original.mapValue !== undefined &&
            typeof plain === "object" &&
            plain !== null &&
            !Array.isArray(plain)
        ) {
            return {
                mapValue: {
                    fields: encodeFields(
                        plain as Record<string, unknown>,
                        original.mapValue.fields ?? {},
                    ),
                },
            };
        }
    }
    // Inference for new values.
    if (plain === null || plain === undefined) return { nullValue: null };
    if (typeof plain === "boolean") return { booleanValue: plain };
    if (typeof plain === "number")
        return Number.isInteger(plain)
            ? { integerValue: String(plain) }
            : { doubleValue: plain };
    if (typeof plain === "string") return { stringValue: plain };
    if (Array.isArray(plain))
        return { arrayValue: { values: plain.map((el) => encodeValue(el)) } };
    return {
        mapValue: { fields: encodeFields(plain as Record<string, unknown>) },
    };
}

export function encodeFields(
    plain: Record<string, unknown>,
    originalFields?: Record<string, FirestoreValue>,
): Record<string, FirestoreValue> {
    const out: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(plain)) out[k] = encodeValue(v, originalFields?.[k]);
    return out;
}

// ---------------------------------------------------------------------------
// Field paths, update masks, queries
// ---------------------------------------------------------------------------

/**
 * Escape ONE field-path segment for updateMask / query field references.
 * Plain identifiers pass through; anything else is backtick-quoted with
 * backslash and backtick escaped.
 */
export function escapeFieldPath(segment: string): string {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return segment;
    return "`" + segment.replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
}

/**
 * Update mask for a whole-document edit: the union of new and original
 * top-level keys, so fields the user deleted from the JSON get removed
 * server-side (a masked field with no value is a delete).
 */
export function buildUpdateMask(
    newPlain: Record<string, unknown>,
    originalFields: Record<string, FirestoreValue>,
): string[] {
    const keys = new Set([...Object.keys(newPlain), ...Object.keys(originalFields)]);
    return [...keys].map(escapeFieldPath);
}

const QUERY_OPS: Record<string, string> = {
    "==": "EQUAL",
    "!=": "NOT_EQUAL",
    "<": "LESS_THAN",
    "<=": "LESS_THAN_OR_EQUAL",
    ">": "GREATER_THAN",
    ">=": "GREATER_THAN_OR_EQUAL",
    "array-contains": "ARRAY_CONTAINS",
    in: "IN",
};

export const FILTER_OPS = Object.keys(QUERY_OPS);

/** Infer a typed query literal from user text: bool, number, "quoted" string, string. */
function inferQueryValue(text: string): FirestoreValue {
    const t = text.trim();
    if (t === "true") return { booleanValue: true };
    if (t === "false") return { booleanValue: false };
    if (t !== "" && !Number.isNaN(Number(t))) {
        const n = Number(t);
        return Number.isInteger(n) && !t.includes(".")
            ? { integerValue: String(n) }
            : { doubleValue: n };
    }
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"'))
        return { stringValue: t.slice(1, -1) };
    return { stringValue: t };
}

function escapeDottedFieldPath(path: string): string {
    return path.split(".").map(escapeFieldPath).join(".");
}

export interface QueryInput {
    collectionId: string;
    filterField: string;
    filterOp: string;
    filterValue: string;
    orderByField: string;
    orderByDir: "asc" | "desc";
    limit: number;
}

/** Build a REST StructuredQuery from the pane's simple filter controls. */
export function buildStructuredQuery(input: QueryInput): Record<string, unknown> {
    const query: Record<string, unknown> = {
        from: [{ collectionId: input.collectionId }],
    };
    if (input.filterField.trim()) {
        const field = { fieldPath: escapeDottedFieldPath(input.filterField.trim()) };
        if (input.filterValue.trim() === "null") {
            query.where = {
                unaryFilter: {
                    field,
                    op: input.filterOp === "!=" ? "IS_NOT_NULL" : "IS_NULL",
                },
            };
        } else {
            const value =
                input.filterOp === "in"
                    ? {
                          arrayValue: {
                              values: input.filterValue
                                  .split(",")
                                  .map((part) => inferQueryValue(part)),
                          },
                      }
                    : inferQueryValue(input.filterValue);
            query.where = {
                fieldFilter: { field, op: QUERY_OPS[input.filterOp] ?? "EQUAL", value },
            };
        }
    }
    if (input.orderByField.trim()) {
        query.orderBy = [
            {
                field: { fieldPath: escapeDottedFieldPath(input.orderByField.trim()) },
                direction: input.orderByDir === "desc" ? "DESCENDING" : "ASCENDING",
            },
        ];
    }
    query.limit = input.limit;
    return query;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type FirestoreErrorKind =
    | "serviceDisabled"
    | "permissionDenied"
    | "indexRequired"
    | "datastoreMode"
    | "notFound"
    | "quota"
    | "auth"
    | "clockSkew"
    | "serviceAccountRejected"
    | "network"
    | "unknown";

export class FirestoreApiError extends Error {
    kind: FirestoreErrorKind;
    httpStatus: number;
    grpcStatus?: string;
    /** "Enable the API" console link, present when kind === "serviceDisabled". */
    activationUrl?: string;
    /** "Create index" console link, present when kind === "indexRequired". */
    indexUrl?: string;

    constructor(
        kind: FirestoreErrorKind,
        message: string,
        httpStatus = 0,
        extras?: { grpcStatus?: string; activationUrl?: string; indexUrl?: string },
    ) {
        super(sanitizeFirestoreError(message));
        this.name = "FirestoreApiError";
        this.kind = kind;
        this.httpStatus = httpStatus;
        this.grpcStatus = extras?.grpcStatus;
        this.activationUrl = extras?.activationUrl;
        this.indexUrl = extras?.indexUrl;
    }
}

interface GoogleErrorBody {
    error?: {
        code?: number;
        status?: string;
        message?: string;
        details?: Array<{
            "@type"?: string;
            reason?: string;
            metadata?: Record<string, string>;
        }>;
    };
}

/** Map a non-OK Firestore REST response to a typed error. */
export function mapFirestoreError(
    httpStatus: number,
    body: GoogleErrorBody | undefined,
): FirestoreApiError {
    const err = body?.error;
    const status = err?.status ?? "";
    const message = err?.message ?? `HTTP ${httpStatus}`;
    const make = (
        kind: FirestoreErrorKind,
        extras?: { activationUrl?: string; indexUrl?: string },
    ) => new FirestoreApiError(kind, message, httpStatus, { grpcStatus: status, ...extras });

    if (status === "PERMISSION_DENIED") {
        const disabled = err?.details?.find((d) => d.reason === "SERVICE_DISABLED");
        if (disabled)
            return make("serviceDisabled", {
                activationUrl: disabled.metadata?.activationUrl,
            });
        return make("permissionDenied");
    }
    if (status === "FAILED_PRECONDITION") {
        if (/requires an index/i.test(message)) {
            const indexUrl = message.match(
                /https:\/\/console\.firebase\.google\.com\S+/,
            )?.[0];
            return make("indexRequired", { indexUrl });
        }
        if (/datastore mode/i.test(message)) return make("datastoreMode");
    }
    if (status === "NOT_FOUND") return make("notFound");
    if (status === "RESOURCE_EXHAUSTED") return make("quota");
    if (status === "UNAUTHENTICATED") return make("auth");
    return make("unknown");
}

/**
 * Fail-closed scrub applied to every outbound message: PEM blocks, JWTs,
 * Google access tokens, then the shared credential/email sanitizer.
 */
export function sanitizeFirestoreError(message: string): string {
    let out = message;
    out = out.replace(/-----BEGIN[\s\S]*?-----END [A-Z ]*KEY-----/g, "***KEY***");
    out = out.replace(/eyJ[\w-]{10,}\.[\w-]+\.[\w-]+/g, "***JWT***");
    out = out.replace(/ya29\.[\w.-]+/g, "***TOKEN***");
    return sanitizeError(out);
}
