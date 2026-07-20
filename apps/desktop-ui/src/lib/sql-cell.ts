/** Mirror the nosql-explorer cell commit: auto-type null / booleans / numbers. */
export function typeCellInput(raw: string): unknown {
    const trimmed = raw.trim();
    if (trimmed === "null" || trimmed === "NULL") return null;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed !== "" && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return raw;
}
