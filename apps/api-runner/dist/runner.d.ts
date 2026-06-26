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
import type { Collection, RequestRunResult } from "./types.js";
interface RunOpts {
    collection: Collection;
    folderId?: string;
    iterations: number;
    dataRows?: Record<string, string>[];
    environmentVariables: Record<string, string>;
    bail?: boolean;
    onProgress?: (r: RequestRunResult) => void;
    abortSignal?: AbortSignal;
}
export declare function runCollection(opts: RunOpts): Promise<RequestRunResult[]>;
export {};
