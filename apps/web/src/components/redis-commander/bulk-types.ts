export interface DryRunResult {
    affected: number;
    scanned: number;
    sample: string[];
    truncated: boolean;
}

export interface ExportedKey {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
}
