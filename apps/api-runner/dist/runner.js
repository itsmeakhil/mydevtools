/**
 * Headless collection runner.
 *
 * Mirrors `apps/web/src/lib/runner/runner.ts` semantics:
 *   - Sequential execution; one iteration per data row, else `iterations`.
 *   - Pre-request + test scripts run via `node:vm` with `pm.*` API.
 *   - Env mutations cascade across requests within a run.
 *   - `{{response.body.x}}` chaining off the previous successful response.
 *   - Folder-level defaults (headers / scripts) merged before per-request fields.
 *
 * Deliberate omissions for the CLI v1:
 *   - No cookie jar (Node native fetch has none; add tough-cookie if needed).
 *   - No OAuth refresh flow (user supplies bearer token via env).
 *   - No streaming (proxy-stream lives on the web side).
 */
import { runScript } from "./scripts.js";
function walkRequests(items, out) {
    for (const it of items) {
        if ("type" in it && it.type === "folder")
            walkRequests(it.items, out);
        else
            out.push(it);
    }
}
function findRequestAncestors(items, requestId, trail = []) {
    for (const item of items) {
        if (item.id === requestId)
            return trail;
        if ("type" in item && item.type === "folder") {
            const hit = findRequestAncestors(item.items, requestId, [...trail, item]);
            if (hit)
                return hit;
        }
    }
    return null;
}
function mergeHeaders(chain, requestHeaders) {
    const seen = new Set();
    const out = [];
    for (const h of requestHeaders) {
        if (h.key)
            seen.add(h.key.toLowerCase());
        out.push(h);
    }
    for (const folder of chain) {
        for (const h of folder.defaultHeaders ?? []) {
            if (h.key && seen.has(h.key.toLowerCase()))
                continue;
            if (h.key)
                seen.add(h.key.toLowerCase());
            out.push(h);
        }
    }
    return out;
}
function inherit(req, ancestors) {
    if (ancestors.length === 0)
        return req;
    const preChain = [...ancestors.map((f) => f.preRequestScript), req.preRequestScript]
        .map((s) => (s ?? "").trim()).filter(Boolean).join("\n\n");
    const testChain = [...ancestors.map((f) => f.testScript), req.testScript]
        .map((s) => (s ?? "").trim()).filter(Boolean).join("\n\n");
    return {
        ...req,
        headers: mergeHeaders(ancestors, req.headers),
        preRequestScript: preChain || undefined,
        testScript: testChain || undefined,
    };
}
function tryParseJson(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return undefined;
    }
}
function parseResponsePath(s) {
    const out = [];
    for (const part of s.split(".")) {
        const m = part.match(/^([^[]*)((?:\[\d+\])*)$/);
        if (!m) {
            out.push(part);
            continue;
        }
        if (m[1])
            out.push(m[1]);
        for (const idx of m[2].matchAll(/\[(\d+)\]/g))
            out.push(Number(idx[1]));
    }
    return out;
}
function resolveResponsePath(path, response) {
    if (!response)
        return undefined;
    const parts = parseResponsePath(path);
    if (parts.length === 0)
        return undefined;
    const head = parts[0];
    if (head === "status")
        return String(response.status);
    if (head === "statusText")
        return response.statusText;
    if (head === "headers") {
        if (parts.length === 1)
            return undefined;
        const name = String(parts[1]).toLowerCase();
        const hit = Object.entries(response.headers).find(([k]) => k.toLowerCase() === name);
        return hit?.[1];
    }
    if (head === "body") {
        if (parts.length === 1)
            return response.body;
        const parsed = tryParseJson(response.body);
        if (parsed === undefined)
            return undefined;
        let cur = parsed;
        for (const k of parts.slice(1)) {
            if (cur == null || typeof cur !== "object")
                return undefined;
            cur = cur[k];
        }
        if (cur == null)
            return undefined;
        return typeof cur === "object" ? JSON.stringify(cur) : String(cur);
    }
    return undefined;
}
function makeSubstitute(args) {
    return (text) => {
        if (!text)
            return text;
        return text.replace(/\{\{(.+?)\}\}/g, (m, k) => {
            const key = k.trim();
            if (key.startsWith("response.")) {
                const resolved = resolveResponsePath(key.slice("response.".length), args.previousResponse);
                return resolved ?? m;
            }
            if (key in args.row)
                return args.row[key];
            if (args.envUnsets.has(key))
                return m;
            if (key in args.envOverlay)
                return args.envOverlay[key];
            if (key in args.sessionVars)
                return args.sessionVars[key];
            return args.env[key] ?? m;
        });
    };
}
function utf8Btoa(s) {
    return Buffer.from(s, "utf-8").toString("base64");
}
async function executeRequest(args) {
    const { req, iteration } = args;
    const result = {
        iteration,
        requestId: req.id,
        requestName: req.name,
        method: req.method,
        url: req.url,
        tests: [],
        logs: [],
        errors: [],
    };
    const substitute = makeSubstitute({
        env: args.env,
        sessionVars: args.sessionVars,
        envOverlay: args.envOverlay,
        envUnsets: args.envUnsets,
        row: args.row,
        previousResponse: args.previousResponse,
    });
    let workMethod = req.method;
    let workUrl = req.url;
    let workHeaders = {};
    req.headers.forEach((h) => { if (h.active && h.key)
        workHeaders[h.key] = h.value; });
    // Pre-request script.
    if (req.preRequestScript && req.preRequestScript.trim()) {
        const r = runScript(req.preRequestScript, {
            request: {
                url: workUrl, method: workMethod, headers: workHeaders,
                body: req.body.type === "json" || req.body.type === "text" || req.body.type === "graphql" ? req.body.content : undefined,
            },
            environment: { ...args.env, ...args.envOverlay },
            variables: { ...args.sessionVars, ...args.row },
        });
        result.tests.push(...r.tests);
        result.logs.push(...r.logs);
        if (!r.ok && r.error)
            result.errors.push(`pre-request: ${r.error}`);
        for (const k of Object.keys(r.environment)) {
            if (r.environment[k] !== args.env[k])
                args.envOverlay[k] = r.environment[k];
        }
        for (const k of Object.keys(args.env)) {
            if (!(k in r.environment))
                args.envUnsets.add(k);
        }
        Object.assign(args.sessionVars, r.variables);
        workUrl = r.request.url;
        workMethod = (r.request.method || workMethod).toUpperCase();
        workHeaders = r.request.headers;
    }
    let urlObj;
    try {
        urlObj = new URL(substitute(workUrl));
    }
    catch (e) {
        result.networkError = `Invalid URL: ${e.message}`;
        return { result, response: null };
    }
    req.params.forEach((p) => {
        if (p.active && p.key)
            urlObj.searchParams.append(substitute(p.key), substitute(p.value));
    });
    const headersObj = {};
    for (const [k, v] of Object.entries(workHeaders)) {
        headersObj[substitute(k)] = substitute(v);
    }
    if (req.auth.type === "bearer" && req.auth.token) {
        headersObj["Authorization"] = `Bearer ${substitute(req.auth.token).trim()}`;
    }
    else if (req.auth.type === "basic" && req.auth.username && req.auth.password) {
        headersObj["Authorization"] = `Basic ${utf8Btoa(`${substitute(req.auth.username).trim()}:${substitute(req.auth.password)}`)}`;
    }
    else if (req.auth.type === "api-key" && req.auth.apiKeyKey && req.auth.apiKeyValue) {
        const key = substitute(req.auth.apiKeyKey).trim();
        const val = substitute(req.auth.apiKeyValue).trim();
        if (req.auth.apiKeyLocation === "query")
            urlObj.searchParams.append(key, val);
        else
            headersObj[key] = val;
    }
    let body;
    const noBody = workMethod === "GET" || workMethod === "HEAD" || req.body.type === "none";
    if (!noBody) {
        if (req.body.type === "json") {
            const sub = substitute(req.body.content);
            try {
                JSON.parse(sub);
            }
            catch (e) {
                result.networkError = `Invalid JSON body: ${e.message}`;
                return { result, response: null };
            }
            body = sub;
            headersObj["Content-Type"] = "application/json";
        }
        else if (req.body.type === "x-www-form-urlencoded") {
            const sp = new URLSearchParams();
            (req.body.urlEncoded ?? []).forEach((it) => {
                if (it.active && it.key)
                    sp.append(substitute(it.key), substitute(it.value));
            });
            body = sp.toString();
            if (!Object.keys(headersObj).some((k) => k.toLowerCase() === "content-type")) {
                headersObj["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }
        else if (req.body.type === "form-data") {
            const form = new FormData();
            for (const it of req.body.formData ?? []) {
                if (!it.active || !it.key)
                    continue;
                if (it.valueType === "file") {
                    if (!it.fileContentBase64)
                        continue;
                    const buf = Buffer.from(it.fileContentBase64, "base64");
                    form.append(substitute(it.key), new Blob([buf], { type: it.fileType || "application/octet-stream" }), it.fileName || "upload.bin");
                }
                else {
                    form.append(substitute(it.key), substitute(it.value));
                }
            }
            body = form;
            // Let fetch set the multipart Content-Type with its own boundary.
            for (const k of Object.keys(headersObj)) {
                if (k.toLowerCase() === "content-type")
                    delete headersObj[k];
            }
        }
        else if (req.body.type === "graphql") {
            const query = substitute(req.body.content);
            let variables;
            const rawVars = (req.body.graphqlVariables ?? "").trim();
            if (rawVars) {
                try {
                    variables = JSON.parse(substitute(rawVars));
                }
                catch (e) {
                    result.networkError = `Invalid GraphQL variables JSON: ${e.message}`;
                    return { result, response: null };
                }
            }
            body = JSON.stringify(variables !== undefined ? { query, variables } : { query });
            headersObj["Content-Type"] = "application/json";
        }
        else {
            body = substitute(req.body.content);
            if (!headersObj["Content-Type"])
                headersObj["Content-Type"] = "text/plain";
        }
    }
    const start = Date.now();
    let response;
    try {
        response = await fetch(urlObj.toString(), {
            method: workMethod,
            headers: headersObj,
            body,
            signal: args.signal,
        });
    }
    catch (e) {
        result.networkError = e.message;
        return { result, response: null };
    }
    const elapsed = Date.now() - start;
    const bodyText = await response.text().catch(() => "");
    const respHeaders = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });
    result.status = response.status;
    result.statusText = response.statusText;
    result.time = elapsed;
    result.size = Buffer.byteLength(bodyText, "utf-8");
    const snapshot = {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
        body: bodyText,
        time: elapsed,
        size: result.size,
    };
    // Test script.
    if (req.testScript && req.testScript.trim()) {
        const r = runScript(req.testScript, {
            request: { url: urlObj.toString(), method: workMethod, headers: { ...headersObj }, body: typeof body === "string" ? body : undefined },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: respHeaders,
                body: bodyText,
                time: elapsed,
            },
            environment: { ...args.env, ...args.envOverlay },
            variables: { ...args.sessionVars, ...args.row },
        });
        result.tests.push(...r.tests);
        result.logs.push(...r.logs);
        if (!r.ok && r.error)
            result.errors.push(`test: ${r.error}`);
        for (const k of Object.keys(r.environment)) {
            if (r.environment[k] !== args.env[k])
                args.envOverlay[k] = r.environment[k];
        }
        Object.assign(args.sessionVars, r.variables);
    }
    return { result, response: snapshot };
}
export async function runCollection(opts) {
    const rootItems = opts.collection.items;
    const requests = [];
    walkRequests(rootItems, requests);
    const iterations = opts.dataRows && opts.dataRows.length > 0
        ? opts.dataRows.length
        : Math.max(1, opts.iterations || 1);
    const sessionVars = {};
    const envOverlay = {};
    const envUnsets = new Set();
    const out = [];
    let previousResponse = null;
    for (let it = 0; it < iterations; it++) {
        const row = opts.dataRows?.[it] ?? {};
        for (const req of requests) {
            if (opts.abortSignal?.aborted)
                return out;
            const ancestors = findRequestAncestors(rootItems, req.id) ?? [];
            const inherited = ancestors.length > 0 ? inherit(req, ancestors) : req;
            const { result, response } = await executeRequest({
                req: inherited,
                iteration: it,
                row,
                env: opts.environmentVariables,
                sessionVars,
                envOverlay,
                envUnsets,
                previousResponse,
                signal: opts.abortSignal,
            });
            out.push(result);
            opts.onProgress?.(result);
            if (response)
                previousResponse = response;
            const failedHere = result.networkError || result.tests.some((t) => !t.pass);
            if (failedHere && opts.bail)
                return out;
        }
    }
    return out;
}
//# sourceMappingURL=runner.js.map