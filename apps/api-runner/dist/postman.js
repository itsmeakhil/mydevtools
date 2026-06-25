/**
 * Lean Postman v2.1 → Collection converter for the CLI.
 * Mirrors `apps/web/src/lib/import/postman.ts` but bound to the smaller
 * CLI type surface (no OAuth2, no graphql body parsing — those map to text).
 */
import { randomUUID } from "node:crypto";
const VALID_METHODS = new Set([
    "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",
]);
const id = () => randomUUID();
function pickScript(events, kind) {
    const evt = events?.find((e) => e.listen === kind);
    if (!evt?.script?.exec)
        return "";
    return Array.isArray(evt.script.exec) ? evt.script.exec.join("\n") : evt.script.exec;
}
function kvList(items) {
    return (items ?? [])
        .filter((kv) => kv && (kv.key || kv.value))
        .map((kv) => ({
        id: id(),
        key: kv.key ?? "",
        value: kv.value ?? "",
        active: !kv.disabled,
    }));
}
function readUrl(u) {
    if (!u)
        return { url: "", query: [] };
    if (typeof u === "string")
        return { url: u, query: [] };
    return { url: u.raw ?? "", query: u.query ?? [] };
}
function lookup(items, key) {
    return items?.find((x) => x.key === key)?.value;
}
function convertAuth(a) {
    if (!a || a.type === "noauth" || !a.type)
        return { type: "none" };
    if (a.type === "bearer")
        return { type: "bearer", token: lookup(a.bearer, "token") };
    if (a.type === "basic") {
        return {
            type: "basic",
            username: lookup(a.basic, "username"),
            password: lookup(a.basic, "password"),
        };
    }
    if (a.type === "apikey") {
        return {
            type: "api-key",
            apiKeyKey: lookup(a.apikey, "key"),
            apiKeyValue: lookup(a.apikey, "value"),
            apiKeyLocation: lookup(a.apikey, "in") === "query" ? "query" : "header",
        };
    }
    return { type: "none" };
}
function convertBody(b) {
    if (!b || b.mode === "none")
        return { type: "none", content: "" };
    if (b.mode === "raw") {
        const lang = b.options?.raw?.language;
        return { type: lang === "json" ? "json" : "text", content: b.raw ?? "" };
    }
    if (b.mode === "urlencoded") {
        return {
            type: "x-www-form-urlencoded",
            content: "",
            urlEncoded: kvList(b.urlencoded),
        };
    }
    if (b.mode === "formdata") {
        return {
            type: "form-data",
            content: "",
            formData: (b.formdata ?? [])
                .filter((kv) => kv && (kv.key || kv.value))
                .map((kv) => ({
                id: id(),
                key: kv.key ?? "",
                value: kv.value ?? "",
                active: !kv.disabled,
                valueType: kv.type === "file" ? "file" : "text",
            })),
        };
    }
    return { type: "text", content: b.raw ?? "" };
}
function convertRequest(item) {
    const r = item.request ?? {};
    const { url, query } = readUrl(r.url);
    const method = (r.method ?? "GET").toUpperCase();
    const safeMethod = VALID_METHODS.has(method) ? method : "GET";
    const preRequestScript = pickScript(item.event, "prerequest");
    const testScript = pickScript(item.event, "test");
    return {
        id: id(),
        name: item.name ?? safeMethod,
        method: safeMethod,
        url,
        params: kvList(query),
        headers: kvList(r.header),
        body: convertBody(r.body),
        auth: convertAuth(r.auth),
        preRequestScript: preRequestScript || undefined,
        testScript: testScript || undefined,
    };
}
function convertItems(items) {
    const out = [];
    for (const item of items ?? []) {
        if (item.request)
            out.push(convertRequest(item));
        else if (item.item) {
            out.push({
                id: id(),
                name: item.name ?? "Folder",
                type: "folder",
                items: convertItems(item.item),
            });
        }
    }
    return out;
}
export function importPostmanCollection(raw) {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || (!data.info?.name && !Array.isArray(data.item))) {
        throw new Error("Not a Postman collection (missing info.name + item[])");
    }
    return {
        id: id(),
        name: data.info?.name ?? "Imported Postman collection",
        items: convertItems(data.item),
    };
}
/**
 * Parse a Postman Environment export (v2 schema) into a flat `key → value` map.
 * Disabled vars are skipped.
 */
export function parsePostmanEnvironment(raw) {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const vars = data?.values;
    if (!Array.isArray(vars))
        return {};
    const out = {};
    for (const v of vars) {
        if (!v?.key)
            continue;
        if (v.enabled === false)
            continue;
        out[v.key] = String(v.value ?? "");
    }
    return out;
}
//# sourceMappingURL=postman.js.map