import {
  EditorNode,
  getNodeTextContent,
  isContainerNode,
  isStructuralNode,
  isTextNode,
} from "@/components/ui/rich-editor/types";

/** Recursively extract all plain text from rich editor content JSON. */
export function extractPlainText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const parts: string[] = [];

  function traverse(n: EditorNode) {
    if (isTextNode(n)) {
      const text = getNodeTextContent(n).trim();
      if (text) parts.push(text);
    } else if (isContainerNode(n) || isStructuralNode(n)) {
      (n.children as EditorNode[]).forEach(traverse);
    }
  }

  traverse(content as EditorNode);
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

// ─── Markdown export ─────────────────────────────────────────────────────────

function inlineToMd(children: { content: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string }[]): string {
  return children
    .map((c) => {
      let t = c.content;
      if (c.code) return "`" + t + "`";
      if (c.bold && c.italic) return `***${t}***`;
      if (c.bold) return `**${t}**`;
      if (c.italic) return `_${t}_`;
      if (c.href) return `[${t}](${c.href})`;
      return t;
    })
    .join("");
}

function nodeToMd(n: EditorNode, listDepth = 0): string {
  if (isContainerNode(n) || isStructuralNode(n)) {
    return (n.children as EditorNode[]).map((c) => nodeToMd(c, listDepth)).join("\n");
  }
  if (!isTextNode(n)) return "";

  const raw = n.content ?? "";
  const inlineText = n.children ? inlineToMd(n.children) : raw;
  const linesText = n.lines
    ? n.lines
        .map((l) =>
          l.children ? inlineToMd(l.children) : (l.content ?? "")
        )
        .join("\n")
    : null;
  const text = linesText ?? inlineText;
  const indent = "  ".repeat(listDepth);

  switch (n.type) {
    case "h1": return `# ${text}`;
    case "h2": return `## ${text}`;
    case "h3": return `### ${text}`;
    case "h4": return `#### ${text}`;
    case "h5": return `##### ${text}`;
    case "h6": return `###### ${text}`;
    case "blockquote": return `> ${text}`;
    case "li": return `${indent}- ${text}`;
    case "pre":
    case "code": return "```\n" + text + "\n```";
    case "hr": return "---";
    case "br": return "";
    default: return text;
  }
}

export function contentToMarkdown(title: string, content: unknown): string {
  if (!content || typeof content !== "object") return `# ${title}\n`;
  const body = (content as EditorNode);
  const lines = isContainerNode(body)
    ? body.children.map((c) => nodeToMd(c)).join("\n")
    : nodeToMd(body);
  return `# ${title}\n\n${lines}`.replace(/\n{3,}/g, "\n\n").trim();
}
