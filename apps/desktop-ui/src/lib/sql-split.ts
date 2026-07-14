/**
 * Split a SQL script into individual statements, splitting only on top-level
 * semicolons. Semicolons inside string literals, quoted identifiers, comments,
 * and Postgres dollar-quoted bodies are ignored.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  const n = sql.length;

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) statements.push(trimmed);
    current = "";
  };

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment: -- ... until newline
    if (ch === "-" && next === "-") {
      while (i < n && sql[i] !== "\n") current += sql[i++];
      continue;
    }

    // Block comment: /* ... */
    if (ch === "/" && next === "*") {
      current += ch;
      current += next;
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) current += sql[i++];
      if (i < n) {
        current += sql[i]; // *
        current += sql[i + 1]; // /
        i += 2;
      }
      continue;
    }

    // Single- or double-quoted string, or backtick identifier
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      current += ch;
      i++;
      while (i < n) {
        current += sql[i];
        // Escaped quote by doubling (e.g. '') stays inside the string
        if (sql[i] === quote && sql[i + 1] === quote) {
          current += sql[i + 1];
          i += 2;
          continue;
        }
        if (sql[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Dollar-quoted body: $tag$ ... $tag$  (tag may be empty: $$)
    if (ch === "$") {
      const tagMatch = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0]; // includes both $ delimiters
        current += tag;
        i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end === -1) {
          current += sql.slice(i);
          i = n;
        } else {
          current += sql.slice(i, end + tag.length);
          i = end + tag.length;
        }
        continue;
      }
    }

    // Top-level statement terminator
    if (ch === ";") {
      push();
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  push();
  return statements;
}
