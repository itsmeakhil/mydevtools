import type { User } from "firebase/auth";

import type { CodeSnippet } from "@/store/snippet-manager-store";

const BACKEND_BASE_URL: string =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000";

async function proxyJson<T>(
  user: User | null | undefined,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!user) {
    throw new Error("Sign in required");
  }

  const url = new URL(path, BACKEND_BASE_URL).toString();
  const headers: Record<string, string> = {};
  if (body !== undefined && body !== null && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  const proxyRes = await fetch("/api/proxy", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  });

  const proxyData = (await proxyRes.json()) as {
    status: number;
    statusText?: string;
    body?: string;
  };

  if (proxyData.status < 200 || proxyData.status >= 300) {
    throw new Error(proxyData.body || proxyData.statusText || "API request failed");
  }

  const responseBody = proxyData.body;
  if (!responseBody) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseBody) as T;
  } catch {
    return responseBody as unknown as T;
  }
}

export async function listCodeSnippetsApi(
  user: User | null | undefined
): Promise<CodeSnippet[]> {
  return proxyJson<CodeSnippet[]>(user, "GET", "/api/v1/code-snippets");
}

export type CodeSnippetCreatePayload = Pick<
  CodeSnippet,
  "title" | "language" | "code"
> &
  Partial<Pick<CodeSnippet, "id" | "createdAt" | "updatedAt">>;

export async function createCodeSnippetApi(
  user: User | null | undefined,
  payload: CodeSnippetCreatePayload
): Promise<CodeSnippet> {
  return proxyJson<CodeSnippet>(user, "POST", "/api/v1/code-snippets", payload);
}

export async function patchCodeSnippetApi(
  user: User | null | undefined,
  id: string,
  patch: Partial<Pick<CodeSnippet, "title" | "language" | "code">>
): Promise<CodeSnippet> {
  return proxyJson<CodeSnippet>(user, "PATCH", `/api/v1/code-snippets/${id}`, patch);
}

export async function deleteCodeSnippetApi(
  user: User | null | undefined,
  id: string
): Promise<void> {
  await proxyJson<void>(user, "DELETE", `/api/v1/code-snippets/${id}`);
}

export function isSnippetDuplicateError(err: unknown): boolean {
  return err instanceof Error && /409|already exists|Snippet id already/i.test(err.message);
}
