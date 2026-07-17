// Pure logic for summarizing MongoDB explain output (nosql-explorer).
// The output shape varies by server version and find vs aggregate, so the
// summary walks the whole tree instead of assuming a fixed path.

function collectValues(node: unknown, key: string, out: unknown[]) {
    if (Array.isArray(node)) {
        node.forEach((n) => collectValues(n, key, out));
    } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            if (k === key) out.push(v);
            collectValues(v, key, out);
        }
    }
}

export interface ExplainSummary {
    stages: string[];
    indexNames: string[];
    collscan: boolean;
    nReturned?: number;
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    executionTimeMillis?: number;
}

export function summarizeExplain(explain: unknown): ExplainSummary {
    const stages: unknown[] = [];
    collectValues(explain, "stage", stages);
    const indexNames: unknown[] = [];
    collectValues(explain, "indexName", indexNames);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: any[] = [];
    collectValues(explain, "executionStats", stats);
    const s = stats[0] ?? {};
    const stageNames = [...new Set(stages.filter((x): x is string => typeof x === "string"))];
    return {
        stages: stageNames,
        indexNames: [...new Set(indexNames.filter((x): x is string => typeof x === "string"))],
        collscan: stageNames.includes("COLLSCAN"),
        nReturned: typeof s.nReturned === "number" ? s.nReturned : undefined,
        totalDocsExamined: typeof s.totalDocsExamined === "number" ? s.totalDocsExamined : undefined,
        totalKeysExamined: typeof s.totalKeysExamined === "number" ? s.totalKeysExamined : undefined,
        executionTimeMillis: typeof s.executionTimeMillis === "number" ? s.executionTimeMillis : undefined,
    };
}
