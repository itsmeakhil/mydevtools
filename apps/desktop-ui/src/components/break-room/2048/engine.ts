export type Board = number[][]
export type Dir = 'left' | 'right' | 'up' | 'down'
export type BoardSize = 4 | 5 | 6

export type HistoryEntry = { board: Board; score: number; won: boolean; continueGame: boolean }
export type CellAnim = 'merge' | 'appear' | null

export const BEST_KEY = (size: BoardSize) => `mydevtools-2048-best-${size}`

export function emptyBoard(size: number): Board {
  return Array(size).fill(null).map(() => Array(size).fill(0))
}

export function addRandomTile(board: Board, size: number): { board: Board; pos: number | null } {
  const empty: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r]![c] === 0) empty.push([r, c])
  if (empty.length === 0) return { board, pos: null }
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]!
  const next = board.map(row => [...row])
  next[r]![c] = Math.random() < 0.9 ? 2 : 4
  return { board: next, pos: r * size + c }
}

export function initBoard(size: number): Board {
  const { board: b1 } = addRandomTile(emptyBoard(size), size)
  const { board: b2 } = addRandomTile(b1, size)
  return b2
}

function slideRow(row: number[], size: number): { row: number[]; score: number; mergedAt: number[] } {
  const filled = row.filter(v => v !== 0)
  let score = 0
  const merged: number[] = []
  const mergedAt: number[] = []
  let i = 0
  while (i < filled.length) {
    if (i + 1 < filled.length && filled[i] === filled[i + 1]) {
      const val = filled[i]! * 2
      mergedAt.push(merged.length)
      merged.push(val)
      score += val
      i += 2
    } else {
      merged.push(filled[i]!)
      i++
    }
  }
  while (merged.length < size) merged.push(0)
  return { row: merged, score, mergedAt }
}

function moveLeft(board: Board, size: number): { board: Board; score: number; moved: boolean; mergedAt: [number, number][] } {
  let score = 0
  let moved = false
  const mergedAt: [number, number][] = []
  const next = board.map((row, r) => {
    const { row: newRow, score: s, mergedAt: rowMerged } = slideRow(row, size)
    score += s
    if (newRow.some((v, i) => v !== row[i])) moved = true
    rowMerged.forEach(c => mergedAt.push([r, c]))
    return newRow
  })
  return { board: next, score, moved, mergedAt }
}

function rotateRight(board: Board): Board {
  return board[0]!.map((_, c) => board.map(row => row[c]!).reverse())
}

function rotateLeft(board: Board): Board {
  return board[0]!.map((_, c) => board.map(row => row[row.length - 1 - c]!))
}

export function applyDir(board: Board, dir: Dir, size: number): { board: Board; score: number; moved: boolean; mergedPositions: Set<number> } {
  if (dir === 'right') {
    const flipped = board.map(row => [...row].reverse())
    const res = moveLeft(flipped, size)
    const mergedPositions = new Set(res.mergedAt.map(([r, c]) => r * size + (size - 1 - c)))
    return { board: res.board.map(row => [...row].reverse()), score: res.score, moved: res.moved, mergedPositions }
  }
  if (dir === 'up') {
    const res = moveLeft(rotateLeft(board), size)
    const mergedPositions = new Set(res.mergedAt.map(([r, c]) => c * size + (size - 1 - r)))
    return { board: rotateRight(res.board), score: res.score, moved: res.moved, mergedPositions }
  }
  if (dir === 'down') {
    const res = moveLeft(rotateRight(board), size)
    const mergedPositions = new Set(res.mergedAt.map(([r, c]) => (size - 1 - c) * size + r))
    return { board: rotateLeft(res.board), score: res.score, moved: res.moved, mergedPositions }
  }
  const res = moveLeft(board, size)
  const mergedPositions = new Set(res.mergedAt.map(([r, c]) => r * size + c))
  return { board: res.board, score: res.score, moved: res.moved, mergedPositions }
}

export function hasWon(board: Board): boolean {
  return board.some(row => row.some(v => v === 2048))
}

export function hasMovesLeft(board: Board, size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r]![c] === 0) return true
      if (c < size - 1 && board[r]![c] === board[r]![c + 1]) return true
      if (r < size - 1 && board[r]![c] === board[r + 1]![c]) return true
    }
  }
  return false
}

const TILE_STYLE: Record<number, string> = {
  0: 'bg-[#cdc1b4]',
  2: 'bg-[#eee4da] text-[#776e65]',
  4: 'bg-[#ede0c8] text-[#776e65]',
  8: 'bg-[#f2b179] text-white',
  16: 'bg-[#f59563] text-white',
  32: 'bg-[#f67c5f] text-white',
  64: 'bg-[#f65e3b] text-white',
  128: 'bg-[#edcf72] text-white',
  256: 'bg-[#edcc61] text-white',
  512: 'bg-[#edc850] text-white',
  1024: 'bg-[#edc53f] text-white',
  2048: 'bg-[#edc22e] text-white shadow-[0_0_30px_10px_rgba(237,194,46,0.4)]',
}

export function tileStyle(v: number) {
  return TILE_STYLE[v] ?? 'bg-[#3c3a32] text-white'
}

export function tileFont(v: number, size: number) {
  const big = size <= 4
  if (v >= 1024) return big ? 'text-base font-bold md:text-lg' : 'text-xs font-bold md:text-sm'
  if (v >= 128)  return big ? 'text-lg font-bold md:text-xl'  : 'text-sm font-bold md:text-base'
  return big ? 'text-xl font-bold md:text-2xl' : 'text-base font-bold md:text-lg'
}
