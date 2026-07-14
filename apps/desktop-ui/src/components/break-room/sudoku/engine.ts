export type Difficulty = 'easy' | 'medium' | 'hard'
export type Grid = number[][]
// [row][col][digit-1]
export type Notes = boolean[][][]

export interface GameScore {
  level: Difficulty
  stage: number
  score: number
  time_seconds: number
}

export type HistoryEntry = { grid: Grid; notes: Notes }

// ─── Seeded random (LCG) ──────────────────────────────────────────────────────

export function makeLCG(seed: number) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// ─── Sudoku engine ────────────────────────────────────────────────────────────

export function emptyGrid(): Grid {
  return Array(9).fill(null).map(() => Array(9).fill(0))
}

export function emptyNotes(): Notes {
  return Array(9).fill(null).map(() =>
    Array(9).fill(null).map(() => Array(9).fill(false))
  )
}

export function isValidPlacement(grid: Grid, r: number, c: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r]![i] === num) return false
    if (grid[i]![c] === num) return false
    const br = 3 * Math.floor(r / 3) + Math.floor(i / 3)
    const bc = 3 * Math.floor(c / 3) + (i % 3)
    if (grid[br]![bc] === num) return false
  }
  return true
}

export function fillGrid(grid: Grid, rand: () => number): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] !== 0) continue
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand)
      for (const n of nums) {
        if (isValidPlacement(grid, r, c, n)) {
          grid[r]![c] = n
          if (fillGrid(grid, rand)) return true
          grid[r]![c] = 0
        }
      }
      return false
    }
  }
  return true
}

const CLUES: Record<Difficulty, number> = { easy: 45, medium: 35, hard: 26 }

export function generatePuzzle(level: Difficulty, stage: number): { puzzle: Grid; solution: Grid } {
  const levelOffset = level === 'easy' ? 0 : level === 'medium' ? 10000 : 20000
  const rand = makeLCG(levelOffset + stage)

  const solution = emptyGrid()
  fillGrid(solution, rand)

  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i), rand)
  const toRemove = 81 - CLUES[level]

  const puzzle = solution.map(row => [...row])
  for (let i = 0; i < toRemove; i++) {
    const idx = indices[i]!
    puzzle[Math.floor(idx / 9)]![idx % 9] = 0
  }

  return { puzzle, solution }
}

// ─── Conflict detection ───────────────────────────────────────────────────────

export function buildConflicts(grid: Grid): boolean[][] {
  const conflicts = Array(9).fill(null).map(() => Array(9).fill(false))
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r]![c]
      if (v === 0) continue
      for (let i = 0; i < 9; i++) {
        if (i !== c && grid[r]![i] === v) { conflicts[r]![c] = true; conflicts[r]![i] = true }
        if (i !== r && grid[i]![c] === v) { conflicts[r]![c] = true; conflicts[i]![c] = true }
      }
      const br = 3 * Math.floor(r / 3)
      const bc = 3 * Math.floor(c / 3)
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const nr = br + dr, nc = bc + dc
          if (nr !== r || nc !== c) {
            if (grid[nr]![nc] === v) { conflicts[r]![c] = true; conflicts[nr]![nc] = true }
          }
        }
      }
    }
  }
  return conflicts
}

export function isSolved(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r]![c] !== solution[r]![c]) return false
  return true
}

// ─── Score ────────────────────────────────────────────────────────────────────

export function calcScore(timeSecs: number, level: Difficulty, hintsUsed: number): number {
  const base = level === 'easy' ? 1000 : level === 'medium' ? 2000 : 3000
  return Math.max(0, base - timeSecs * 2 - hintsUsed * 100)
}

// ─── Notes helpers ────────────────────────────────────────────────────────────

export function removeNoteFromPeers(notes: Notes, r: number, c: number, val: number): Notes {
  const n = notes.map(row => row.map(cell => [...cell]))
  const digit = val - 1
  for (let i = 0; i < 9; i++) {
    n[r]![i]![digit] = false
    n[i]![c]![digit] = false
  }
  const br = 3 * Math.floor(r / 3)
  const bc = 3 * Math.floor(c / 3)
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      n[br + dr]![bc + dc]![digit] = false
  return n
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
