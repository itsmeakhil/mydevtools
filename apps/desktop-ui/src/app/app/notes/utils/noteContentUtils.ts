// Note content helpers.
//
// Notes are stored as a **markdown string** in `Note.content`. Older notes were
// stored as the legacy rich-editor tree (a JSON object rooted at a "container"
// node); those are converted to markdown on read (lazy migration) and re-saved
// as a string on the next edit. Every function here therefore accepts either
// shape and normalizes internally — no dependency on the (removed) rich-editor.

// ─── Legacy tree shape (minimal, self-contained) ─────────────────────────────

interface LegacyInline {
  content: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  href?: string;
}
interface LegacyLine {
  content?: string;
  children?: LegacyInline[];
}
interface LegacyNode {
  type: string;
  content?: string;
  children?: LegacyNode[] | LegacyInline[];
  lines?: LegacyLine[];
  attributes?: Record<string, unknown>;
}

function isLegacyTree(content: unknown): content is LegacyNode {
  return (
    !!content &&
    typeof content === "object" &&
    typeof (content as LegacyNode).type === "string"
  );
}

const CONTAINER_TYPES = new Set(["container", "table", "thead", "tbody", "tr"]);

function isInlineArray(children: unknown): children is LegacyInline[] {
  return (
    Array.isArray(children) &&
    (children.length === 0 ||
      (typeof children[0] === "object" &&
        children[0] !== null &&
        "content" in children[0] &&
        !("type" in children[0])))
  );
}

/** Plain text of a single legacy node (recursively, inline markers stripped). */
function legacyNodeText(n: LegacyNode): string {
  if (n.lines && n.lines.length) {
    return n.lines
      .map((l) => (l.children ? l.children.map((c) => c.content).join("") : l.content ?? ""))
      .join(" ");
  }
  if (n.children && isInlineArray(n.children)) {
    return n.children.map((c) => c.content).join("");
  }
  if (n.children && Array.isArray(n.children)) {
    return (n.children as LegacyNode[]).map(legacyNodeText).join(" ");
  }
  return n.content ?? "";
}

// ─── Plain text extraction (markdown OR legacy tree) ─────────────────────────

/** Strip markdown syntax down to readable plain text. Good enough for search
 *  indexing, word counts, and snippets — not a full parser. */
function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s{0,3}>\s?/gm, "") // blockquotes
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "") // list markers
    .replace(/^\s*\|.*\|\s*$/gm, (row) => row.replace(/\|/g, " ")) // table pipes
    .replace(/[*_~]{1,3}/g, "") // emphasis markers
    .replace(/^\s*[-*_]{3,}\s*$/gm, " ") // hr
    .replace(/\s+/g, " ")
    .trim();
}

/** Recursively extract all plain text from note content (markdown or legacy). */
export function extractPlainText(content: unknown): string {
  if (typeof content === "string") return markdownToPlainText(content);
  if (!isLegacyTree(content)) return "";
  const parts: string[] = [];
  function traverse(n: LegacyNode) {
    if (CONTAINER_TYPES.has(n.type) && Array.isArray(n.children) && !isInlineArray(n.children)) {
      (n.children as LegacyNode[]).forEach(traverse);
    } else {
      const text = legacyNodeText(n).trim();
      if (text) parts.push(text);
    }
  }
  traverse(content);
  return parts.join(" ");
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Returns reading time in minutes (200 wpm). */
export function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/** Extract a short snippet around the first match of `query` in `text`. */
export function extractSnippet(text: string, query: string, maxLen = 80): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, start + maxLen);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

// ─── Legacy tree → markdown (migration + export) ─────────────────────────────

function inlineToMd(children: LegacyInline[]): string {
  return children
    .map((c) => {
      const t = c.content;
      if (c.code) return "`" + t + "`";
      if (c.href) return `[${t}](${c.href})`;
      if (c.bold && c.italic) return `***${t}***`;
      if (c.bold) return `**${t}**`;
      if (c.italic) return `_${t}_`;
      return t;
    })
    .join("");
}

/** Text of a legacy node with inline markdown markers preserved. */
function legacyNodeMd(n: LegacyNode): string {
  if (n.lines && n.lines.length) {
    return n.lines
      .map((l) => (l.children ? inlineToMd(l.children) : l.content ?? ""))
      .join("\n");
  }
  if (n.children && isInlineArray(n.children)) return inlineToMd(n.children);
  return n.content ?? "";
}

/** Collect visible cell text from a table row's children. */
function rowCells(tr: LegacyNode): string[] {
  const cells = (tr.children as LegacyNode[]) ?? [];
  return cells.map((c) => legacyNodeText(c).replace(/\|/g, "\\|").trim());
}

function tableToMd(table: LegacyNode): string {
  const rows: string[][] = [];
  function collectRows(n: LegacyNode) {
    if (n.type === "tr") {
      rows.push(rowCells(n));
    } else if (Array.isArray(n.children) && !isInlineArray(n.children)) {
      (n.children as LegacyNode[]).forEach(collectRows);
    }
  }
  collectRows(table);
  if (!rows.length) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? "");
  const header = pad(rows[0]);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((r) => `| ${pad(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function nodeToMd(n: LegacyNode, listDepth = 0, orderedIndex?: number): string {
  if (n.type === "table") return tableToMd(n);

  if (CONTAINER_TYPES.has(n.type) && Array.isArray(n.children) && !isInlineArray(n.children)) {
    // Ordered list container: number its direct list-item children.
    if (n.type === "container" && n.attributes?.listType === "ordered") {
      let i = 0;
      return (n.children as LegacyNode[])
        .map((c) => nodeToMd(c, listDepth, c.type === "li" ? ++i : undefined))
        .join("\n");
    }
    return (n.children as LegacyNode[]).map((c) => nodeToMd(c, listDepth)).join("\n");
  }

  const indent = "  ".repeat(listDepth);
  const src = n.attributes ?? {};

  switch (n.type) {
    case "img": {
      const alt = (src.alt as string) ?? "";
      const url = (src.src as string) ?? "";
      return url ? `![${alt}](${url})` : "";
    }
    case "a": {
      const href = (src.href as string) ?? "";
      const text = legacyNodeMd(n) || href;
      return href ? `[${text}](${href})` : text;
    }
    case "hr":
      return "---";
    case "br":
      return "";
    default:
      break;
  }

  const text = legacyNodeMd(n);
  switch (n.type) {
    case "h1": return `# ${text}`;
    case "h2": return `## ${text}`;
    case "h3": return `### ${text}`;
    case "h4": return `#### ${text}`;
    case "h5": return `##### ${text}`;
    case "h6": return `###### ${text}`;
    case "blockquote": return `> ${text}`;
    case "li":
      return orderedIndex != null ? `${indent}${orderedIndex}. ${text}` : `${indent}- ${text}`;
    case "pre":
    case "code": return "```\n" + text + "\n```";
    default: return text;
  }
}

/** Convert legacy tree content to a markdown body (no title heading). */
function legacyTreeToMarkdown(content: LegacyNode): string {
  // nodeToMd handles both containers (joining children, honoring ordered lists)
  // and leaf nodes, so the root routes through it uniformly.
  return nodeToMd(content).replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Normalize any stored `Note.content` to the markdown string the editor loads.
 * New notes are already strings; legacy tree notes are converted on the fly.
 */
export function noteContentToMarkdown(content: unknown): string {
  if (typeof content === "string") return content;
  if (isLegacyTree(content)) return legacyTreeToMarkdown(content);
  return "";
}

/** Full markdown document for export: `# title` + body. */
export function contentToMarkdown(title: string, content: unknown): string {
  const body = noteContentToMarkdown(content);
  return `# ${title}\n\n${body}`.replace(/\n{3,}/g, "\n\n").trim();
}
