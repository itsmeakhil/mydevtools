/**
 * Classical Lorem Ipsum (Cicero-derived placeholder text).
 */

export const LOREM_PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
  'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
  'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
] as const;

export type LoremUnit = 'paragraphs' | 'sentences' | 'words' | 'list';

export const LOREM_LIMITS: Record<LoremUnit, { min: number; max: number }> = {
  paragraphs: { min: 1, max: 80 },
  sentences: { min: 1, max: 300 },
  words: { min: 1, max: 5000 },
  list: { min: 1, max: 120 },
};

let sentencesCache: string[] | null = null;
let wordsCache: string[] | null = null;

function getSentences(): string[] {
  if (!sentencesCache) {
    const joined = LOREM_PARAGRAPHS.join(' ');
    sentencesCache = joined
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return sentencesCache;
}

function getWords(): string[] {
  if (!wordsCache) {
    wordsCache = LOREM_PARAGRAPHS.join(' ').split(/\s+/).filter(Boolean);
  }
  return wordsCache;
}

function takeCycled<T>(items: readonly T[], n: number): T[] {
  const out: T[] = [];
  const len = items.length;
  if (len === 0) return out;
  for (let i = 0; i < n; i++) {
    out.push(items[i % len]!);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clampCount(unit: LoremUnit, raw: number): number {
  const { min, max } = LOREM_LIMITS[unit];
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export interface GenerateLoremOptions {
  unit: LoremUnit;
  count: number;
  asHtml: boolean;
}

export function generateLorem(options: GenerateLoremOptions): string {
  const { unit, asHtml } = options;
  const n = clampCount(unit, options.count);

  switch (unit) {
    case 'paragraphs': {
      const paras = takeCycled(LOREM_PARAGRAPHS, n);
      if (asHtml) {
        return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
      }
      return paras.join('\n\n');
    }
    case 'sentences': {
      const sents = takeCycled(getSentences(), n);
      const text = sents.join(' ');
      if (asHtml) {
        return `<p>${escapeHtml(text)}</p>`;
      }
      return text;
    }
    case 'words': {
      const words = takeCycled(getWords(), n);
      const raw = words.join(' ');
      const text = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
      if (asHtml) {
        return `<p>${escapeHtml(text)}</p>`;
      }
      return text;
    }
    case 'list': {
      const sents = takeCycled(getSentences(), n);
      if (asHtml) {
        return `<ul>\n${sents.map((s) => `  <li>${escapeHtml(s)}</li>`).join('\n')}\n</ul>`;
      }
      return sents.map((s) => `- ${s}`).join('\n');
    }
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}
