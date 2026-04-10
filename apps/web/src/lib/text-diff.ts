import { diffLines } from 'diff';

export type DiffRowKind = 'equal' | 'added' | 'removed';

export interface DiffRow {
  left: string;
  right: string;
  kind: DiffRowKind;
}

function splitLines(text: string): string[] {
  const n = text.replace(/\r\n/g, '\n');
  if (n === '') return [];
  const lines = n.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Line-aligned side-by-side rows for classic diff view. */
export function buildLineDiffRows(before: string, after: string): DiffRow[] {
  const parts = diffLines(before, after);
  const rows: DiffRow[] = [];

  for (const part of parts) {
    const lines = splitLines(part.value);
    if (part.added) {
      for (const line of lines) {
        rows.push({ left: '', right: line, kind: 'added' });
      }
    } else if (part.removed) {
      for (const line of lines) {
        rows.push({ left: line, right: '', kind: 'removed' });
      }
    } else {
      for (const line of lines) {
        rows.push({ left: line, right: line, kind: 'equal' });
      }
    }
  }

  return rows;
}

export function countDiffRows(rows: DiffRow[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const r of rows) {
    if (r.kind === 'added') added += 1;
    if (r.kind === 'removed') removed += 1;
  }
  return { added, removed };
}

export const DIFF_MAX_INPUT_CHARS = 250_000;
export const DIFF_MAX_ROWS = 5_000;
