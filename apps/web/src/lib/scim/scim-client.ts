/**
 * SCIM 2.0 (RFC 7644) client wrapper.
 *
 * Targets the common Identity-Provider patterns (Okta, Azure AD, Auth0):
 *   - GET    /Users        — paginated list
 *   - POST   /Users        — create
 *   - GET    /Users/{id}
 *   - PATCH  /Users/{id}   — RFC 7644 PatchOp body
 *   - DELETE /Users/{id}
 * Groups + Schemas mirror the same shape.
 *
 * Auth: bearer token. Routed through the proxy for SSRF + auditing.
 */

export interface ScimResource {
    id: string
    schemas: string[]
    [k: string]: unknown
}

export interface ScimListResponse<T = ScimResource> {
    Resources: T[]
    totalResults: number
    startIndex?: number
    itemsPerPage?: number
}

export interface ScimClientOptions {
    baseUrl: string
    bearerToken: string
    /** Use the local proxy so the call goes through the SSRF gate. */
    viaProxy?: boolean
    /** Extra headers (request id, tenancy hints, etc.). */
    extraHeaders?: Record<string, string>
}

export interface ScimPatchOp {
    op: "add" | "remove" | "replace"
    path?: string
    value?: unknown
}

function joinUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

async function send(
    opts: ScimClientOptions,
    path: string,
    init: { method: string; body?: unknown; query?: Record<string, string> } = { method: "GET" },
): Promise<unknown> {
    const target = (() => {
        const u = new URL(joinUrl(opts.baseUrl, path))
        for (const [k, v] of Object.entries(init.query ?? {})) u.searchParams.set(k, v)
        return u.toString()
    })()
    const headers: Record<string, string> = {
        Authorization: `Bearer ${opts.bearerToken}`,
        Accept: "application/scim+json",
        ...(opts.extraHeaders ?? {}),
    }
    if (init.body !== undefined) headers["Content-Type"] = "application/scim+json"

    if (opts.viaProxy) {
        const res = await fetch("/api/proxy", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: target,
                method: init.method,
                headers,
                body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            }),
        })
        const data = await res.json()
        if (data.status >= 400) throw new Error(`SCIM ${data.status}: ${data.body?.slice?.(0, 200) ?? ""}`)
        return data.body ? JSON.parse(data.body) : null
    }

    const res = await fetch(target, {
        method: init.method,
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    if (!res.ok) throw new Error(`SCIM ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`)
    return await res.json()
}

export const scimClient = (opts: ScimClientOptions) => ({
    listUsers(query?: { filter?: string; startIndex?: number; count?: number }): Promise<ScimListResponse> {
        const q: Record<string, string> = {}
        if (query?.filter) q.filter = query.filter
        if (query?.startIndex !== undefined) q.startIndex = String(query.startIndex)
        if (query?.count !== undefined) q.count = String(query.count)
        return send(opts, "/Users", { method: "GET", query: q }) as Promise<ScimListResponse>
    },
    getUser(id: string): Promise<ScimResource> {
        return send(opts, `/Users/${encodeURIComponent(id)}`) as Promise<ScimResource>
    },
    createUser(user: Omit<ScimResource, "id">): Promise<ScimResource> {
        return send(opts, "/Users", { method: "POST", body: user }) as Promise<ScimResource>
    },
    patchUser(id: string, ops: ScimPatchOp[]): Promise<ScimResource> {
        return send(opts, `/Users/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
                Operations: ops,
            },
        }) as Promise<ScimResource>
    },
    deleteUser(id: string): Promise<void> {
        return send(opts, `/Users/${encodeURIComponent(id)}`, { method: "DELETE" }) as Promise<void>
    },
    listGroups(query?: { filter?: string }): Promise<ScimListResponse> {
        return send(opts, "/Groups", { method: "GET", query: query?.filter ? { filter: query.filter } : undefined }) as Promise<ScimListResponse>
    },
    serviceProviderConfig(): Promise<unknown> {
        return send(opts, "/ServiceProviderConfig")
    },
})
