export type CellState = 'hidden' | 'revealed' | 'flagged' | 'questioned'
export interface Cell { mine: boolean; adjacent: number; state: CellState }
export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom'
export type Status = 'idle' | 'playing' | 'won' | 'lost'

export const PRESET: Record<Exclude<Difficulty,'custom'>, { rows:number; cols:number; mines:number; cell:number }> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, cell: 52 },
  intermediate: { rows: 16, cols: 16, mines: 40, cell: 40 },
  expert:       { rows: 16, cols: 30, mines: 99, cell: 32 },
}

export const BEST_KEY    = (d: Difficulty) => `mydevtools-ms-best-${d}`
export const STREAK_KEY  = 'mydevtools-ms-streak'
export const BSTREAK_KEY = 'mydevtools-ms-best-streak'

export function makeLCG(seed: number) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

export function buildBoard(
  rows: number, cols: number, mines: number,
  safeR: number, safeC: number,
  rand: () => number,
): Cell[][] {
  const board: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, adjacent: 0, state: 'hidden' as CellState }))
  )
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(rand() * rows)
    const c = Math.floor(rand() * cols)
    if (board[r]![c]!.mine) continue
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue
    board[r]![c]!.mine = true
    placed++
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r]![c]!.mine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr]![nc]!.mine) count++
        }
      board[r]![c]!.adjacent = count
    }
  return board
}

export function floodReveal(
  board: Cell[][], rows: number, cols: number, r: number, c: number
): { board: Cell[][]; distances: Record<string, number> } {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  const distances: Record<string, number> = {}
  const visited = new Set<string>()
  const queue: [number, number, number][] = [[r, c, 0]]
  while (queue.length > 0) {
    const [cr, cc, dist] = queue.shift()!
    const key = `${cr},${cc}`
    if (visited.has(key)) continue
    visited.add(key)
    const cell = next[cr]![cc]!
    if (cell.state === 'revealed' || cell.state === 'flagged' || cell.state === 'questioned' || cell.mine) continue
    cell.state = 'revealed'
    distances[key] = dist
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr, nc = cc + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr]![nc]!.state === 'hidden')
            queue.push([nr, nc, dist + 1])
        }
    }
  }
  return { board: next, distances }
}

export function checkWin(board: Cell[][]): boolean {
  return board.every(row => row.every(cell => cell.mine ? cell.state !== 'revealed' : cell.state === 'revealed'))
}

export const NUM_COLOR: Record<number, string> = {
  1: '#3B82F6', 2: '#22C55E', 3: '#EF4444',
  4: '#7C3AED', 5: '#B91C1C', 6: '#0891B2',
  7: '#1F2937', 8: '#6B7280',
}

export function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`
}

export function newSeed() { return Math.floor(Math.random() * 1_000_000) + 1 }
