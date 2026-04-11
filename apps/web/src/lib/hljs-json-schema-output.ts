import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import dart from 'highlight.js/lib/languages/dart';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import type { OutputLanguage } from '@/lib/json-schema-generator';

let registered = false;

function ensureRegistered() {
  if (registered) return;
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('rust', rust);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('csharp', csharp);
  hljs.registerLanguage('dart', dart);
  hljs.registerLanguage('swift', swift);
  registered = true;
}

const HLJS_LANG: Record<OutputLanguage, string> = {
  jsonSchema: 'json',
  python: 'python',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  java: 'java',
  csharp: 'csharp',
  dart: 'dart',
  swift: 'swift',
};

/**
 * Returns HTML (with span.hljs-* tokens) for read-only display. Plain text is escaped by highlight.js.
 */
export function highlightSchemaOutput(code: string, outputLang: OutputLanguage): string {
  if (!code.trim()) return '';
  ensureRegistered();
  const language = HLJS_LANG[outputLang];
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    try {
      return hljs.highlight(code, { language: 'typescript', ignoreIllegals: true }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }
}
