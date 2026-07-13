/**
 * Pure logic for the Markdown Table Generator tool.
 * Parses delimited (TSV/CSV) text and builds aligned Markdown / HTML tables.
 * All exported functions are total and never throw.
 */

export type ColumnAlign = 'left' | 'center' | 'right'

/* ------------------------------ parseDelimited ----------------------------- */

/**
 * Parse TSV or CSV text into rows of cells.
 * The delimiter is auto-detected: tab wins if present outside quotes on the
 * first line, otherwise comma. Quoted CSV cells (including embedded
 * delimiters, doubled quotes, and newlines) are handled.
 */
export function parseDelimited(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized.trim()) return []

  const firstLine = normalized.split('\n', 1)[0]
  const delimiter = firstLine.includes('\t') ? '\t' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  row.push(cell)
  rows.push(row)

  // Drop trailing rows that are entirely empty (e.g. a trailing newline).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop()
  }
  return rows
}

/* ---------------------------- buildMarkdownTable --------------------------- */

/** Escape a cell for use inside a Markdown pipe table. */
function escapeMarkdownCell(cell: string): string {
  return cell.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

function padCell(text: string, width: number, align: ColumnAlign): string {
  const pad = width - text.length
  if (pad <= 0) return text
  if (align === 'right') return ' '.repeat(pad) + text
  if (align === 'center') {
    const left = Math.floor(pad / 2)
    return ' '.repeat(left) + text + ' '.repeat(pad - left)
  }
  return text + ' '.repeat(pad)
}

function separatorCell(width: number, align: ColumnAlign): string {
  // Minimum three dashes; colons count toward the width.
  const w = Math.max(width, 3)
  if (align === 'center') return ':' + '-'.repeat(Math.max(w - 2, 1)) + ':'
  if (align === 'right') return '-'.repeat(Math.max(w - 1, 2)) + ':'
  return '-'.repeat(w)
}

/**
 * Build a pretty-aligned Markdown pipe table. Cells are padded so that pipes
 * line up; alignment colons are emitted in the separator row.
 */
export function buildMarkdownTable(
  headers: string[],
  rows: string[][],
  aligns: ColumnAlign[],
): string {
  const cols = headers.length
  if (cols === 0) return ''

  const headerCells = headers.map(escapeMarkdownCell)
  const bodyCells = rows.map((r) =>
    Array.from({ length: cols }, (_, i) => escapeMarkdownCell(r[i] ?? '')),
  )
  const colAligns: ColumnAlign[] = Array.from({ length: cols }, (_, i) => aligns[i] ?? 'left')

  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(3, headerCells[i].length, ...bodyCells.map((r) => r[i].length)),
  )

  const line = (cells: string[]) =>
    '| ' + cells.map((c, i) => padCell(c, widths[i], colAligns[i])).join(' | ') + ' |'

  const out: string[] = []
  out.push(line(headerCells))
  out.push('| ' + widths.map((w, i) => separatorCell(w, colAligns[i])).join(' | ') + ' |')
  for (const r of bodyCells) out.push(line(r))
  return out.join('\n')
}

/* ------------------------------ buildHtmlTable ----------------------------- */

/** Escape HTML entities in text content. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Build `<table>` markup with escaped cells and per-column alignment. */
export function buildHtmlTable(
  headers: string[],
  rows: string[][],
  aligns: ColumnAlign[],
): string {
  const cols = headers.length
  if (cols === 0) return ''

  const alignAttr = (i: number) => {
    const a = aligns[i] ?? 'left'
    return a === 'left' ? '' : ` style="text-align: ${a}"`
  }

  const out: string[] = []
  out.push('<table>')
  out.push('  <thead>')
  out.push('    <tr>')
  headers.forEach((h, i) => {
    out.push(`      <th${alignAttr(i)}>${escapeHtml(h)}</th>`)
  })
  out.push('    </tr>')
  out.push('  </thead>')
  out.push('  <tbody>')
  for (const row of rows) {
    out.push('    <tr>')
    for (let i = 0; i < cols; i++) {
      out.push(`      <td${alignAttr(i)}>${escapeHtml(row[i] ?? '')}</td>`)
    }
    out.push('    </tr>')
  }
  out.push('  </tbody>')
  out.push('</table>')
  return out.join('\n')
}

/* --------------------------------- sample ---------------------------------- */

export const SAMPLE_HEADERS = ['Feature', 'Status', 'Owner']
export const SAMPLE_ROWS: string[][] = [
  ['Dark mode', 'Shipped', 'Ada'],
  ['Offline sync', 'In progress', 'Linus'],
  ['Export to CSV', 'Planned', 'Grace'],
]
export const SAMPLE_ALIGNS: ColumnAlign[] = ['left', 'center', 'left']
