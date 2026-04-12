/**
 * Map stored language mode + code → Monaco editor language id.
 * "auto" runs lightweight heuristics (no network).
 */

export const SNIPPET_LANGUAGE_AUTO = "auto";

/** Monaco-supported ids we expose in the UI */
export const SNIPPET_MONACO_LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "json",
  "html",
  "css",
  "scss",
  "less",
  "python",
  "markdown",
  "xml",
  "yaml",
  "shell",
  "sql",
  "dockerfile",
  "ini",
  "csharp",
  "java",
  "go",
  "rust",
  "php",
] as const;

export type SnippetMonacoLanguage = (typeof SNIPPET_MONACO_LANGUAGES)[number];

export function detectLanguage(code: string): SnippetMonacoLanguage | "plaintext" {
  const t = code.trim();
  if (!t) return "plaintext";

  if (t.startsWith("#!")) {
    const line = t.slice(0, 80).toLowerCase();
    if (line.includes("python")) return "python";
    if (line.includes("node")) return "javascript";
    if (line.includes("bash") || line.includes("/sh")) return "shell";
  }

  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      JSON.parse(t);
      return "json";
    } catch {
      /* continue */
    }
  }

  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return "html";
  if (/^<\?xml\s/i.test(t)) return "xml";

  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|WITH\s+\w+\s+AS\s*\()/i.test(t))
    return "sql";

  if (/^(def |class |from |import |if __name__\s*=\s*['"]__main__)/m.test(t)) return "python";

  if (/^---\s*$/m.test(t) && /(^|\n)#{1,6}\s/m.test(t)) return "markdown";
  if (/^#{1,6}\s/m.test(t) || /(^|\n)```[\w]*\n/m.test(t)) return "markdown";

  if (/\b(interface |type \w+\s*=|: string\b|: number\b|as const\b|readonly )\b/.test(t))
    return "typescript";

  if (
    /\b(function\*? |const |let |var |=>|async function|require\(|module\.exports|export default)\b/.test(
      t
    )
  )
    return "javascript";

  if (/^\s*(\.|#)?[\w-]+\s*\{[^}]*\}/m.test(t) && /@(media|import|keyframes)\b/.test(t))
    return "css";
  if (
    /^\s*[\w.#\[][^{]*\{[^}]*\}/m.test(t.slice(0, 4000)) &&
    t.includes("{") &&
    t.includes("}") &&
    !t.includes(";function") &&
    /:\s*[^;{]+;/m.test(t)
  ) {
    return "css";
  }

  if (/^(FROM |RUN |WORKDIR |COPY |ADD |ENV |EXPOSE |CMD |ENTRYPOINT )/im.test(t))
    return "dockerfile";

  if (/^\[[\w.-]+\]\s*$/m.test(t) && t.includes("=")) return "ini";

  if (/^(package |import |func |const |var )\b/m.test(t) && /\bfunc\s+\w+\s*\(/.test(t))
    return "go";

  if (/\bfn\s+\w+\s*\(|let\s+mut\s|impl\s+\w+/.test(t)) return "rust";

  if (/^\s*(using |namespace |public class |#region)/m.test(t)) return "csharp";

  if (/^\s*(package |public class |import java\.)/m.test(t)) return "java";

  if (/^\s*<\?php|\$\w+\s*=/.test(t)) return "php";

  return "plaintext";
}

export function resolveEditorLanguage(
  stored: string,
  code: string
): SnippetMonacoLanguage | "plaintext" {
  if (stored === SNIPPET_LANGUAGE_AUTO || !stored) {
    return detectLanguage(code);
  }
  if (
    (SNIPPET_MONACO_LANGUAGES as readonly string[]).includes(stored)
  ) {
    return stored as SnippetMonacoLanguage;
  }
  return "plaintext";
}
