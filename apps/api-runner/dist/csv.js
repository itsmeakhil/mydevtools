/** Same CSV/JSON data-file parser as the web app — verbatim port for portability. */
export function parseCsv(text) {
    const rows = parseRows(text);
    if (rows.length === 0)
        return [];
    const [headers, ...body] = rows;
    return body
        .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
        .map((cells) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
        return obj;
    });
}
function parseRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuote) {
            if (c === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else if (c === '"') {
                inQuote = false;
            }
            else
                cell += c;
        }
        else {
            if (c === '"') {
                inQuote = true;
            }
            else if (c === ",") {
                row.push(cell);
                cell = "";
            }
            else if (c === "\n" || c === "\r") {
                row.push(cell);
                cell = "";
                rows.push(row);
                row = [];
                if (c === "\r" && text[i + 1] === "\n")
                    i++;
            }
            else
                cell += c;
        }
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}
export function parseDataFile(text) {
    const t = text.trimStart();
    if (t.startsWith("[")) {
        const parsed = JSON.parse(t);
        if (!Array.isArray(parsed))
            throw new Error("JSON data file must be an array");
        return parsed.map((row) => {
            if (!row || typeof row !== "object")
                return {};
            const out = {};
            for (const [k, v] of Object.entries(row)) {
                out[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
            }
            return out;
        });
    }
    return parseCsv(text);
}
//# sourceMappingURL=csv.js.map