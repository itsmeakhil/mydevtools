import { isDesktop } from "./is-desktop";

export type ProxyGetResult = {
  ok: boolean;
  status: number;
  body: string;
  isBase64: boolean;
  contentType: string;
};

type ProxyEnvelope = {
  status: number;
  headers?: Record<string, string>;
  body?: string;
  isBase64?: boolean;
  error?: string;
};

/**
 * Desktop-only outbound GET routed through the Rust `http_request` command
 * (no CORS, no data upload — just fetches a public resource). Used for the few
 * tools that reach third-party endpoints (favicons, HIBP, OpenAPI specs) so
 * they go through the app's controlled proxy instead of the webview directly.
 *
 * Callers must only invoke this on desktop AND when online — it has no offline
 * fallback of its own (returns ok:false on any failure).
 */
export async function proxyGet(
  url: string,
  opts?: { headers?: Record<string, string>; timeoutMs?: number }
): Promise<ProxyGetResult> {
  if (!isDesktop()) {
    // Web callers should use plain fetch; this is a safety net.
    try {
      const res = await fetch(url, { headers: opts?.headers });
      const body = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        body,
        isBase64: false,
        contentType: res.headers.get("content-type") || "",
      };
    } catch {
      return { ok: false, status: 0, body: "", isBase64: false, contentType: "" };
    }
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const env = (await invoke("http_request", {
      input: { url, method: "GET", headers: opts?.headers ?? {}, timeoutMs: opts?.timeoutMs },
    })) as ProxyEnvelope;
    const contentType =
      env.headers?.["content-type"] || env.headers?.["Content-Type"] || "";
    return {
      ok: env.status >= 200 && env.status < 300,
      status: env.status,
      body: env.body ?? "",
      isBase64: Boolean(env.isBase64),
      contentType,
    };
  } catch {
    return { ok: false, status: 0, body: "", isBase64: false, contentType: "" };
  }
}
