/**
 * Read-only text extraction from OOXML (`.docx` / `.xlsx`) so previews show the
 * content instead of the mojibake you get decoding a zip as UTF-8. jszip is
 * already a dependency and is imported lazily — office files are a rare preview.
 *
 * ponytail: plain-text/grid fidelity only — no styles, images, merged cells or
 * evaluated formulas (cached values are what xlsx stores, so those do show).
 * Swap in mammoth + sheetjs if rendered fidelity ever matters.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

/** Strip XML tags, keeping the text nodes. */
function textOf(xml: string): string {
  return decodeEntities(xml.replace(/<[^>]*>/g, ""))
}

async function unzip(bytes: Uint8Array) {
  const JSZip = (await import("jszip")).default
  return JSZip.loadAsync(bytes)
}

/**
 * `word/document.xml` flattened to text, one line per paragraph. Only `<w:t>`
 * content is read — stripping every tag instead would pick up the whitespace
 * that sits between elements in pretty-printed documents.
 */
export async function docxToText(bytes: Uint8Array): Promise<string> {
  const zip = await unzip(bytes)
  const xml = await zip.file("word/document.xml")?.async("string")
  if (!xml) throw new Error("Not a .docx file")

  let out = ""
  for (const [tag, text] of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:(?:tab|br|cr)\b[^>]*\/?>|<\/w:p>/g)) {
    if (text !== undefined) out += decodeEntities(text)
    else if (tag.startsWith("<w:tab")) out += "\t"
    else out += "\n"
  }

  return out
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export type SheetPreview = { name: string; rows: string[][] }

/** Column letters (`"AB"`) to a zero-based index. */
function colIndex(ref: string): number {
  let n = 0
  for (const ch of ref.replace(/\d+/g, "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const MAX_ROWS = 500

/** First worksheet of an `.xlsx` as a row/column grid of display strings. */
export async function xlsxToRows(bytes: Uint8Array): Promise<SheetPreview> {
  const zip = await unzip(bytes)

  const sharedXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? ""
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => textOf(si))

  const sheetPath = Object.keys(zip.files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort()[0]
  if (!sheetPath) throw new Error("Not a .xlsx file")
  const sheetXml = (await zip.file(sheetPath)!.async("string")) ?? ""

  const workbook = (await zip.file("xl/workbook.xml")?.async("string")) ?? ""
  const name = decodeEntities(/<sheet[^>]*\bname="([^"]*)"/.exec(workbook)?.[1] ?? "Sheet1")

  const rows: string[][] = []
  for (const [, body] of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const cell of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, attrs, inner = ""] = cell
      const type = /\bt="([^"]*)"/.exec(attrs)?.[1]
      const raw = type === "inlineStr" ? textOf(inner) : textOf(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "")
      const value = type === "s" ? (shared[Number(raw)] ?? "") : raw
      const at = colIndex(/\br="([A-Z]+)\d+"/.exec(attrs)?.[1] ?? "")
      if (at >= 0) {
        while (row.length < at) row.push("")
        row[at] = value
      } else if (value) {
        row.push(value)
      }
    }
    rows.push(row)
    if (rows.length >= MAX_ROWS) break
  }

  const width = rows.reduce((w, r) => Math.max(w, r.length), 0)
  for (const row of rows) while (row.length < width) row.push("")

  return { name, rows }
}
