import { StructuralNode, TextNode } from "../types"

export const MARKDOWN_TABLE_PARSE_ERROR_KEYS = [
  "minRows",
  "pipeFormat",
  "headerMinCol",
  "separatorRow",
  "rowColumnMismatch",
  "parseFailed",
] as const

export type MarkdownTableParseErrorKey =
  (typeof MARKDOWN_TABLE_PARSE_ERROR_KEYS)[number]

export type ParseMarkdownTableResult =
  | { success: true; table: StructuralNode }
  | {
      success: false
      errorKey: MarkdownTableParseErrorKey
      params?: {
        row?: number
        got?: number
        expected?: number
      }
    }

/**
 * Parse markdown table string into table structure
 *
 * @example
 * ```
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 * ```
 */
export function parseMarkdownTable(markdown: string): ParseMarkdownTableResult {
  try {
    // Split into lines and remove empty lines
    const lines = markdown
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length < 2) {
      return {
        success: false,
        errorKey: "minRows",
      }
    }

    // Parse header row
    const headerLine = lines[0]
    if (!headerLine.startsWith("|") || !headerLine.endsWith("|")) {
      return {
        success: false,
        errorKey: "pipeFormat",
      }
    }

    const headerCells = headerLine
      .split("|")
      .slice(1, -1) // Remove first and last empty strings
      .map((cell) => cell.trim())

    if (headerCells.length === 0) {
      return {
        success: false,
        errorKey: "headerMinCol",
      }
    }

    // Check separator row
    const separatorLine = lines[1]
    if (!separatorLine.includes("---") && !separatorLine.includes("-")) {
      return {
        success: false,
        errorKey: "separatorRow",
      }
    }

    // Parse body rows
    const bodyLines = lines.slice(2)
    const numCols = headerCells.length

    // Validate all rows have same number of columns
    for (let i = 0; i < bodyLines.length; i++) {
      const cells = bodyLines[i]
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())

      if (cells.length !== numCols) {
        return {
          success: false,
          errorKey: "rowColumnMismatch",
          params: {
            row: i + 3,
            got: cells.length,
            expected: numCols,
          },
        }
      }
    }

    const timestamp = Date.now()

    // Create header cells
    const headerCellNodes: TextNode[] = headerCells.map((content, idx) => ({
      id: `th-${timestamp}-${idx}`,
      type: "th",
      content: content || "",
      attributes: {},
    }))

    // Create header row
    const headerRow: StructuralNode = {
      id: `tr-header-${timestamp}`,
      type: "tr",
      children: headerCellNodes,
      attributes: {},
    }

    // Create thead
    const thead: StructuralNode = {
      id: `thead-${timestamp}`,
      type: "thead",
      children: [headerRow],
      attributes: {},
    }

    // Create body rows
    const bodyRows: StructuralNode[] = bodyLines.map((line, rowIdx) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())

      const cellNodes: TextNode[] = cells.map((content, colIdx) => ({
        id: `td-${timestamp}-${rowIdx}-${colIdx}`,
        type: "td",
        content: content || "",
        attributes: {},
      }))

      return {
        id: `tr-${timestamp}-${rowIdx}`,
        type: "tr",
        children: cellNodes,
        attributes: {},
      }
    })

    // Create tbody
    const tbody: StructuralNode = {
      id: `tbody-${timestamp}`,
      type: "tbody",
      children: bodyRows,
      attributes: {},
    }

    // Create table
    const table: StructuralNode = {
      id: `table-${timestamp}`,
      type: "table",
      children: [thead, tbody],
      attributes: {},
    }

    return {
      success: true,
      table,
    }
  } catch {
    return {
      success: false,
      errorKey: "parseFailed",
    }
  }
}

/**
 * Validate if string looks like a markdown table
 */
export function isMarkdownTable(text: string): boolean {
  const lines = text
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) return false

  // Check if first line has pipes
  if (!lines[0].includes("|")) return false

  // Check if second line is separator
  const secondLine = lines[1]
  return (
    secondLine.includes("---") ||
    (secondLine.includes("-") && secondLine.includes("|"))
  )
}
