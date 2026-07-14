export const COLS = 10
export const ROWS = 20
export const CELL = 36
export const BEST_KEY = 'mydevtools-tetris-best'
export const SPRINT_LINES = 40
export const ULTRA_MS = 120_000

export type Board = (string | null)[][]
export type PieceDef = { shape: number[][]; color: string; idx: number }
export type Piece = PieceDef & { x: number; y: number; rot: number }
export type GameMode = 'marathon' | 'sprint' | 'ultra'
export type TSpin = 'tspin' | 'tspin-mini' | null

export const PIECES: PieceDef[] = [
  { idx: 0, shape: [[1,1,1,1]],           color: '#22D3EE' }, // I
  { idx: 1, shape: [[1,1],[1,1]],         color: '#FACC15' }, // O
  { idx: 2, shape: [[0,1,0],[1,1,1]],     color: '#A855F7' }, // T
  { idx: 3, shape: [[1,0],[1,1],[0,1]],   color: '#4ADE80' }, // S
  { idx: 4, shape: [[0,1],[1,1],[1,0]],   color: '#F87171' }, // Z
  { idx: 5, shape: [[1,0],[1,0],[1,1]],   color: '#60A5FA' }, // J
  { idx: 6, shape: [[0,1],[0,1],[1,1]],   color: '#FB923C' }, // L
]

let bagQueue: number[] = []
function makeBag(): number[] {
  const bag = [0,1,2,3,4,5,6]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}
function nextFromBag(): number {
  if (!bagQueue.length) bagQueue = makeBag()
  return bagQueue.shift()!
}
export function resetBag(): void {
  bagQueue = []
}
export function randomPiece(): Piece {
  const p = PIECES[nextFromBag()]!
  return { ...p, shape: p.shape.map(r => [...r]), x: Math.floor((COLS - p.shape[0]!.length) / 2), y: 0, rot: 0 }
}

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

export function rotate(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0]!.length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r]![c]!)
  )
}

export function collides(board: Board, piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0]!.length; c++) {
      if (!shape[r]![c]) continue
      const nr = piece.y + r + dy, nc = piece.x + c + dx
      if (nr >= ROWS || nc < 0 || nc >= COLS) return true
      if (nr >= 0 && board[nr]![nc] !== null) return true
    }
  return false
}

export function place(board: Board, piece: Piece): Board {
  const next = board.map(row => [...row])
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[0]!.length; c++) {
      if (!piece.shape[r]![c]) continue
      const nr = piece.y + r, nc = piece.x + c
      if (nr >= 0) next[nr]![nc] = piece.color
    }
  return next
}

export function findFullRows(board: Board): number[] {
  return board.reduce<number[]>((acc, row, i) => {
    if (row.every(c => c !== null)) acc.push(i)
    return acc
  }, [])
}

export function clearLines(board: Board): { board: Board; lines: number } {
  const remaining = board.filter(row => row.some(c => c === null))
  const lines = ROWS - remaining.length
  const empty = Array.from({ length: lines }, () => Array(COLS).fill(null))
  return { board: [...empty, ...remaining], lines }
}

export function ghostY(board: Board, piece: Piece): number {
  let dy = 0
  while (!collides(board, piece, 0, dy + 1)) dy++
  return piece.y + dy
}

// T-spin: 3-corner rule (Guideline)
export function detectTSpin(board: Board, piece: Piece, lastWasRotation: boolean): TSpin {
  if (!lastWasRotation || piece.idx !== 2) return null
  const cx = piece.x + 1, cy = piece.y + 1
  const corners = [[cy-1,cx-1],[cy-1,cx+1],[cy+1,cx-1],[cy+1,cx+1]] as const
  const filled = corners.map(([r,c]) => r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r]![c] !== null)
  const count = filled.filter(Boolean).length
  if (count >= 3) return 'tspin'
  if (count >= 2) {
    const FRONT = [[0,1],[1,3],[2,3],[0,2]] as const
    if (FRONT[piece.rot % 4]!.every(i => filled[i])) return 'tspin-mini'
  }
  return null
}

const LINE_SCORE  = [0, 100, 300, 500, 800]
const TSPIN_SCORE = [400, 800, 1200, 1600]
const TMINI_SCORE = [100, 200, 400]

export function calcScore(lines: number, level: number, tSpin: TSpin, b2b: boolean): { gain: number; label?: string } {
  let base: number
  let label: string | undefined
  if (tSpin === 'tspin') {
    base = TSPIN_SCORE[Math.min(lines, 3)]! * (level + 1)
    label = ['T-SPIN','T-SPIN SINGLE','T-SPIN DOUBLE','T-SPIN TRIPLE'][Math.min(lines, 3)]
  } else if (tSpin === 'tspin-mini') {
    base = TMINI_SCORE[Math.min(lines, 2)]! * (level + 1)
    label = 'T-SPIN MINI'
  } else {
    base = (LINE_SCORE[Math.min(lines, 4)] ?? 0) * (level + 1)
    label = lines === 4 ? 'TETRIS!' : undefined
  }
  const isSpecial = tSpin !== null || lines === 4
  if (b2b && isSpecial) { base = Math.floor(base * 1.5); if (label) label = 'B2B ' + label }
  return { gain: base, label }
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}.${String(Math.floor((ms % 1000) / 10)).padStart(2,'0')}`
}
