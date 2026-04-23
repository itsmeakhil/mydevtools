'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { backendFetch } from '@/lib/backend-auth'
import useAuth from '@/utils/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard'

interface GameScore {
  level: Difficulty
  stage: number
  score: number
  time_seconds: number
}

// ─── Seeded random (LCG) ──────────────────────────────────────────────────────

function makeLCG(seed: number) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// ─── Sudoku engine ────────────────────────────────────────────────────────────

type Grid = number[][]

function emptyGrid(): Grid {
  return Array(9).fill(null).map(() => Array(9).fill(0))
}

function isValidPlacement(grid: Grid, r: number, c: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r]![i] === num) return false
    if (grid[i]![c] === num) return false
    const br = 3 * Math.floor(r / 3) + Math.floor(i / 3)
    const bc = 3 * Math.floor(c / 3) + (i % 3)
    if (grid[br]![bc] === num) return false
  }
  return true
}

function fillGrid(grid: Grid, rand: () => number): boolean {
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

function generatePuzzle(level: Difficulty, stage: number): { puzzle: Grid; solution: Grid } {
  const levelOffset = level === 'easy' ? 0 : level === 'medium' ? 10000 : 20000
  const rand = makeLCG(levelOffset + stage)

  const solution = emptyGrid()
  fillGrid(solution, rand)

  const puzzle = solution.map(row => [...row])
  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i), rand)
  const toRemove = 81 - CLUES[level]

  for (let i = 0; i < toRemove; i++) {
    const idx = indices[i]!
    puzzle[Math.floor(idx / 9)]![idx % 3 === 0 ? idx % 9 : idx % 9] = 0
  }

  // undo the above line — just use idx directly
  const puzzle2 = solution.map(row => [...row])
  for (let i = 0; i < toRemove; i++) {
    const idx = indices[i]!
    puzzle2[Math.floor(idx / 9)]![idx % 9] = 0
  }

  return { puzzle: puzzle2, solution }
}

// ─── Conflict detection ───────────────────────────────────────────────────────

function buildConflicts(grid: Grid): boolean[][] {
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

function isSolved(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r]![c] !== solution[r]![c]) return false
  return true
}

// ─── Score ────────────────────────────────────────────────────────────────────

function calcScore(timeSecs: number, level: Difficulty): number {
  const base = level === 'easy' ? 1000 : level === 'medium' ? 2000 : 3000
  return Math.max(0, base - timeSecs * 2)
}

// ─── Component ────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export function SudokuLayout() {
  const t = useTranslations('Sudoku')
  const { user } = useAuth()

  const [level, setLevel] = useState<Difficulty>('easy')
  const [stage, setStage] = useState(1)
  const [grid, setGrid] = useState<Grid>(() => emptyGrid())
  const [solution, setSolution] = useState<Grid>(() => emptyGrid())
  const [given, setGiven] = useState<boolean[][]>(() => Array(9).fill(null).map(() => Array(9).fill(false)))
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [scores, setScores] = useState<GameScore[]>([])
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load puzzle on level/stage change
  useEffect(() => {
    const { puzzle, solution: sol } = generatePuzzle(level, stage)
    const g = Array(9).fill(null).map((_, r) =>
      Array(9).fill(null).map((__, c) => puzzle[r]![c]!)
    )
    const gv = Array(9).fill(null).map((_, r) =>
      Array(9).fill(null).map((__, c) => puzzle[r]![c] !== 0)
    )
    setGrid(g)
    setSolution(sol)
    setGiven(gv)
    setSelected(null)
    setTimer(0)
    setTimerActive(false)
    setCompleted(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [level, stage])

  // Timer
  useEffect(() => {
    if (timerActive && !completed) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, completed])

  // Load scores from backend
  useEffect(() => {
    if (!user) return
    backendFetch('/api/backend/game-scores?game=sudoku', { method: 'GET' })
      .then(r => r.ok ? r.json() : [])
      .then((data: GameScore[]) => setScores(data))
      .catch(() => {})
  }, [user])

  const getBestScore = useCallback((l: Difficulty, s: number) =>
    scores.find(sc => sc.level === l && sc.stage === s) ?? null
  , [scores])

  const saveScore = useCallback(async (timeSecs: number) => {
    if (!user || saving) return
    const score = calcScore(timeSecs, level)
    const existing = getBestScore(level, stage)
    if (existing && existing.score >= score) return
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/game-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'sudoku', level, stage, score, time_seconds: timeSecs }),
      })
      if (res.ok) {
        const saved: GameScore = await res.json()
        setScores(prev => {
          const filtered = prev.filter(sc => !(sc.level === level && sc.stage === stage))
          return [...filtered, saved]
        })
      }
    } finally {
      setSaving(false)
    }
  }, [user, saving, level, stage, getBestScore])

  const inputNumber = useCallback((num: number) => {
    if (!selected || completed) return
    const [r, c] = selected
    if (given[r]![c]) return

    if (!timerActive) setTimerActive(true)

    const newGrid = grid.map(row => [...row])
    newGrid[r]![c] = num

    const solved = isSolved(newGrid, solution)
    setGrid(newGrid)

    if (solved) {
      setCompleted(true)
      setTimerActive(false)
      saveScore(timer + (timerActive ? 0 : 0))
    }
  }, [selected, completed, given, timerActive, grid, solution, timer, saveScore])

  const erase = useCallback(() => {
    if (!selected || completed) return
    const [r, c] = selected
    if (given[r]![c]) return
    const newGrid = grid.map(row => [...row])
    newGrid[r]![c] = 0
    setGrid(newGrid)
  }, [selected, completed, given, grid])

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') { e.preventDefault(); inputNumber(parseInt(e.key)) }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase() }
      if (!selected) return
      const [r, c] = selected
      const moves: Record<string, [number, number]> = {
        ArrowUp: [r - 1, c], ArrowDown: [r + 1, c],
        ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1],
      }
      const next = moves[e.key]
      if (next) {
        const [nr, nc] = next
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          e.preventDefault()
          setSelected([nr, nc])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inputNumber, erase, selected])

  const conflicts = buildConflicts(grid)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const completedStages = scores.filter(sc => sc.level === level).length
  const bestForCurrentStage = getBestScore(level, stage)
  const currentScore = completed ? calcScore(timer, level) : null

  return (
    <div className="flex flex-col items-center gap-4 select-none py-2 md:py-4 px-2">
      {/* Header */}
      <div className="flex items-start justify-between w-full max-w-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight leading-none">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {completedStages}/150 {t('stagesCompleted')}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('time')}</div>
            <div className="text-lg font-bold leading-tight font-mono">{formatTime(timer)}</div>
          </div>
          {bestForCurrentStage && (
            <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('best')}</div>
              <div className="text-lg font-bold leading-tight">{bestForCurrentStage.score}</div>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-full max-w-xl">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            onClick={() => { setLevel(d); setStage(1) }}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              level === d
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`difficulty.${d}`)}
          </button>
        ))}
      </div>

      {/* Stage navigation */}
      <div className="flex items-center gap-2 w-full max-w-xl">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStage(s => Math.max(1, s - 1))}
          disabled={stage <= 1}
        >
          ‹
        </Button>
        <div className="flex-1 text-center text-sm font-medium">
          {t('stage')} {stage} / 150
          {bestForCurrentStage && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-semibold">✓</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStage(s => Math.min(150, s + 1))}
          disabled={stage >= 150}
        >
          ›
        </Button>

        {/* Stage quick jump */}
        <select
          className="text-sm border rounded px-2 py-1 bg-background"
          value={stage}
          onChange={e => setStage(parseInt(e.target.value))}
        >
          {Array.from({ length: 150 }, (_, i) => i + 1).map(s => (
            <option key={s} value={s}>
              {s}{scores.find(sc => sc.level === level && sc.stage === s) ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div
        className="relative rounded-xl overflow-hidden border-2 border-foreground/20"
        style={{ width: 'min(450px, 96vw)', height: 'min(450px, 96vw)' }}
      >
        <div className="grid grid-cols-9 h-full w-full">
          {grid.map((row, r) =>
            row.map((val, c) => {
              const isSelected = selected?.[0] === r && selected?.[1] === c
              const isHighlighted = selected
                ? selected[0] === r || selected[1] === c ||
                  (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                   Math.floor(selected[1] / 3) === Math.floor(c / 3))
                : false
              const isSameNumber = selected && val !== 0 && grid[selected[0]]![selected[1]] === val
              const isGiven = given[r]![c]
              const hasConflict = conflicts[r]![c]
              const isCompleted = completed

              const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-foreground/40' : 'border-r border-r-border/40'
              const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-foreground/40' : 'border-b border-b-border/40'

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => { if (!isCompleted) setSelected([r, c]) }}
                  className={cn(
                    'flex items-center justify-center cursor-pointer transition-colors text-sm md:text-base font-medium',
                    borderR, borderB,
                    isSelected && 'bg-blue-200 dark:bg-blue-800',
                    !isSelected && isSameNumber && 'bg-blue-100 dark:bg-blue-900/50',
                    !isSelected && !isSameNumber && isHighlighted && 'bg-muted/60',
                    !isSelected && !isHighlighted && 'bg-background',
                    hasConflict && !isSelected && 'bg-red-100 dark:bg-red-900/40',
                    hasConflict && isSelected && 'bg-red-200 dark:bg-red-800',
                    isCompleted && 'bg-green-50 dark:bg-green-900/20',
                  )}
                >
                  {val !== 0 && (
                    <span className={cn(
                      isGiven ? 'font-bold text-foreground' : 'font-medium',
                      hasConflict && 'text-red-600 dark:text-red-400',
                      isCompleted && !hasConflict && 'text-green-700 dark:text-green-400',
                    )}>
                      {val}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Completed overlay */}
        {completed && (
          <div className="absolute inset-0 bg-green-500/15 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
            <p className="text-3xl font-extrabold text-green-700 dark:text-green-300 drop-shadow">{t('solved')}</p>
            {currentScore !== null && (
              <p className="text-lg font-semibold text-foreground">{t('score')}: {currentScore}</p>
            )}
            <p className="text-sm text-muted-foreground">{formatTime(timer)}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setStage(s => Math.min(150, s + 1))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t('nextStage')}
              </Button>
              <Button variant="outline" onClick={() => {
                const { puzzle, solution: sol } = generatePuzzle(level, stage)
                const g = Array(9).fill(null).map((_, r) => Array(9).fill(null).map((__, c) => puzzle[r]![c]!))
                const gv = Array(9).fill(null).map((_, r) => Array(9).fill(null).map((__, c) => puzzle[r]![c] !== 0))
                setGrid(g); setSolution(sol); setGiven(gv)
                setSelected(null); setTimer(0); setTimerActive(false); setCompleted(false)
              }}>
                {t('replay')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Number pad */}
      {!completed && (
        <div className="flex gap-2 w-full max-w-xl justify-center flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => inputNumber(n)}
              className="w-10 h-10 rounded-lg border bg-background hover:bg-muted text-base font-bold transition-colors"
            >
              {n}
            </button>
          ))}
          <button
            onClick={erase}
            className="px-3 h-10 rounded-lg border bg-background hover:bg-muted text-sm font-medium transition-colors"
          >
            {t('erase')}
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground max-w-xl text-center">{t('howToPlay')}</p>
    </div>
  )
}
