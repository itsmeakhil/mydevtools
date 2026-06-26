/**
 * Headless pre-request / test script runner. Same `pm.*` surface as the web
 * worker, executed inside `node:vm.runInContext` with a wall-clock timeout.
 * The sandbox has no fetch, no fs, no process — just `pm` + `console`.
 */
export interface ScriptContext {
    request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string;
    };
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
        time: number;
    };
    environment: Record<string, string>;
    variables: Record<string, string>;
}
export interface ScriptResult {
    ok: boolean;
    error?: string;
    tests: {
        name: string;
        pass: boolean;
        error?: string;
    }[];
    logs: {
        level: "log" | "warn" | "error";
        args: string[];
    }[];
    environment: Record<string, string>;
    variables: Record<string, string>;
    request: ScriptContext["request"];
}
export declare function runScript(script: string, ctx: ScriptContext): ScriptResult;
