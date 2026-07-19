'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconDeviceGamepad2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'
import {
  buildConflicts, calcScore, DIFFICULTIES, emptyGrid, emptyNotes, generatePuzzle,
  isSolved, removeNoteFromPeers,
  type Difficulty, type GameScore, type Grid, type HistoryEntry, type Notes,
} from './engine'

export function SudokuLayout() {
  const t = useTranslations('Sudoku')

  const [level, setLevel] = useState<Difficulty>('easy')
  const [stage, setStage] = useState(1)
  const [grid, setGrid] = useState<Grid>(() => emptyGrid())
  const [solution, setSolution] = useState<Grid>(() => emptyGrid())
  const [given, setGiven] = useState<boolean[][]>(() => Array(9).fill(null).map(() => Array(9).fill(false)))
  const [notes, setNotes] = useState<Notes>(emptyNotes)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [pencilMode, setPencilMode] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [hintsUsed, setHintsUsed] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [failed, setFailed] = useState(false)
  const [mistakeLimitMode, setMistakeLimitMode] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [scores, setScores] = useState<GameScore[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasTimerActiveRef = useRef(false)

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
    setNotes(emptyNotes())
    setHistory([])
    setHintsUsed(0)
    setMistakes(0)
    setFailed(false)
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

  // Tab-blur pause
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        wasTimerActiveRef.current = timerActive
        if (timerActive) setTimerActive(false)
      } else {
        if (wasTimerActiveRef.current && !completed) setTimerActive(true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [timerActive, completed])

  // Load scores from local storage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('sudoku-scores')
      if (raw) setScores(JSON.parse(raw) as GameScore[])
    } catch { /* corrupt/blocked storage — start fresh */ }
  }, [])

  const getBestScore = useCallback((l: Difficulty, s: number) =>
    scores.find(sc => sc.level === l && sc.stage === s) ?? null
  , [scores])

  const saveScore = useCallback((timeSecs: number, hints: number) => {
    const score = calcScore(timeSecs, level, hints)
    const existing = getBestScore(level, stage)
    if (existing && existing.score >= score) return
    const saved: GameScore = { level, stage, score, time_seconds: timeSecs }
    setScores(prev => {
      const next = [...prev.filter(sc => !(sc.level === level && sc.stage === stage)), saved]
      try { window.localStorage.setItem('sudoku-scores', JSON.stringify(next)) } catch { /* storage blocked */ }
      return next
    })
  }, [level, stage, getBestScore])

  const pushHistory = useCallback((g: Grid, n: Notes) => {
    setHistory(prev => [...prev.slice(-49), {
      grid: g.map(row => [...row]),
      notes: n.map(row => row.map(cell => [...cell])),
    }])
  }, [])

  const inputNumber = useCallback((num: number) => {
    if (!selected || completed || failed) return
    const [r, c] = selected
    if (given[r]![c]) return

    if (!timerActive) setTimerActive(true)

    if (pencilMode) {
      pushHistory(grid, notes)
      const newNotes = notes.map(row => row.map(cell => [...cell]))
      newNotes[r]![c]![num - 1] = !newNotes[r]![c]![num - 1]
      setNotes(newNotes)
      return
    }

    // track mistake before placing
    const isWrong = num !== solution[r]![c]
    let newMistakes = mistakes
    if (isWrong) {
      newMistakes = mistakes + 1
      setMistakes(newMistakes)
      if (mistakeLimitMode && newMistakes >= 3) {
        setFailed(true)
        setTimerActive(false)
        return
      }
    }

    pushHistory(grid, notes)
    const newGrid = grid.map(row => [...row])
    newGrid[r]![c] = num
    const newNotes = removeNoteFromPeers(notes, r, c, num)
    newNotes[r]![c] = Array(9).fill(false)

    const solved = isSolved(newGrid, solution)
    setGrid(newGrid)
    setNotes(newNotes)

    if (solved) {
      setCompleted(true)
      setTimerActive(false)
      saveScore(timer, hintsUsed)
    }
  }, [selected, completed, failed, given, timerActive, pencilMode, grid, notes, solution, timer, hintsUsed, mistakes, mistakeLimitMode, pushHistory, saveScore])

  const erase = useCallback(() => {
    if (!selected || completed || failed) return
    const [r, c] = selected
    if (given[r]![c]) return
    pushHistory(grid, notes)
    const newGrid = grid.map(row => [...row])
    newGrid[r]![c] = 0
    const newNotes = notes.map(row => row.map(cell => [...cell]))
    newNotes[r]![c] = Array(9).fill(false)
    setGrid(newGrid)
    setNotes(newNotes)
  }, [selected, completed, given, grid, notes, pushHistory])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]!
    setHistory(h => h.slice(0, -1))
    setGrid(prev.grid)
    setNotes(prev.notes)
  }, [history])

  const hint = useCallback(() => {
    if (completed || failed) return
    // find first empty non-given cell
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (given[r]![c] || grid[r]![c] !== 0) continue
        const val = solution[r]![c]!
        if (!timerActive) setTimerActive(true)
        pushHistory(grid, notes)
        const newGrid = grid.map(row => [...row])
        newGrid[r]![c] = val
        const newNotes = removeNoteFromPeers(notes, r, c, val)
        newNotes[r]![c] = Array(9).fill(false)
        const newHints = hintsUsed + 1
        setGrid(newGrid)
        setNotes(newNotes)
        setHintsUsed(newHints)
        setSelected([r, c])
        if (isSolved(newGrid, solution)) {
          setCompleted(true)
          setTimerActive(false)
          saveScore(timer, newHints)
        }
        return
      }
    }
  }, [completed, given, grid, notes, solution, timerActive, hintsUsed, timer, pushHistory, saveScore])

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setPencilMode(m => !m); return }
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
  }, [inputNumber, erase, undo, selected])

  const conflicts = buildConflicts(grid)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const completedStages = scores.filter(sc => sc.level === level).length
  const bestForCurrentStage = getBestScore(level, stage)
  const currentScore = completed ? calcScore(timer, level, hintsUsed) : null

  return (
    <div className="flex flex-col items-center gap-4 select-none py-2 md:py-4 px-2">
      {/* Header */}
      <div className="flex items-start justify-between w-full max-w-xl">
        <ToolPageHeader
          icon={IconDeviceGamepad2}
          title={t('title')}
          description={`${completedStages}/150 ${t('stagesCompleted')}`}
          accent={CATEGORY_ACCENT['Break Room']}
        />
        <div className="flex gap-2">
          {mistakes > 0 && (
            <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[56px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('mistakes')}</div>
              <div className={cn('text-lg font-bold leading-tight', mistakes >= 3 && mistakeLimitMode ? 'text-red-600' : mistakes >= 2 ? 'text-orange-500' : 'text-foreground')}>{mistakes}{mistakeLimitMode ? '/3' : ''}</div>
            </div>
          )}
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
              const cellNotes = notes[r]![c]!
              const hasAnyNote = cellNotes.some(Boolean)

              const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-foreground/40' : 'border-r border-r-border/40'
              const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-foreground/40' : 'border-b border-b-border/40'

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => { if (!completed) setSelected([r, c]) }}
                  className={cn(
                    'flex items-center justify-center cursor-pointer transition-colors text-sm md:text-base font-medium',
                    borderR, borderB,
                    isSelected && 'bg-blue-200 dark:bg-blue-800',
                    !isSelected && isSameNumber && 'bg-blue-100 dark:bg-blue-900/50',
                    !isSelected && !isSameNumber && isHighlighted && 'bg-muted/60',
                    !isSelected && !isHighlighted && 'bg-background',
                    hasConflict && !isSelected && 'bg-red-100 dark:bg-red-900/40',
                    hasConflict && isSelected && 'bg-red-200 dark:bg-red-800',
                    completed && 'bg-green-50 dark:bg-green-900/20',
                  )}
                >
                  {val !== 0 ? (
                    <span className={cn(
                      isGiven ? 'font-bold text-foreground' : 'font-medium',
                      hasConflict && 'text-red-600 dark:text-red-400',
                      completed && !hasConflict && 'text-green-700 dark:text-green-400',
                    )}>
                      {val}
                    </span>
                  ) : hasAnyNote ? (
                    <div className="grid grid-cols-3 w-full h-full p-px">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <span key={n} className={cn(
                          'flex items-center justify-center leading-none text-[7px] md:text-[9px]',
                          cellNotes[n-1] ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-transparent',
                        )}>
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
            {hintsUsed > 0 && (
              <p className="text-xs text-muted-foreground">{hintsUsed} {t('hintsUsed')}</p>
            )}
            {mistakes > 0 && (
              <p className="text-xs text-muted-foreground">{mistakes} {t('mistakes')}</p>
            )}
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
                setNotes(emptyNotes()); setHistory([]); setHintsUsed(0); setMistakes(0); setFailed(false)
                setSelected(null); setTimer(0); setTimerActive(false); setCompleted(false)
              }}>
                {t('replay')}
              </Button>
            </div>
          </div>
        )}

        {/* Failed overlay */}
        {failed && (
          <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
            <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 drop-shadow">{t('failed')}</p>
            <p className="text-sm text-muted-foreground">3 {t('mistakes')}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const { puzzle, solution: sol } = generatePuzzle(level, stage)
                  const g = Array(9).fill(null).map((_, r) => Array(9).fill(null).map((__, c) => puzzle[r]![c]!))
                  const gv = Array(9).fill(null).map((_, r) => Array(9).fill(null).map((__, c) => puzzle[r]![c] !== 0))
                  setGrid(g); setSolution(sol); setGiven(gv)
                  setNotes(emptyNotes()); setHistory([]); setHintsUsed(0); setMistakes(0); setFailed(false)
                  setSelected(null); setTimer(0); setTimerActive(false); setCompleted(false)
                }}
                variant="destructive"
              >
                {t('replay')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!completed && !failed && (
        <div className="flex flex-col gap-2 w-full max-w-xl">
          {/* Number pad */}
          <div className="flex gap-2 justify-center flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => inputNumber(n)}
                className={cn(
                  'w-10 h-10 rounded-lg border text-base font-bold transition-colors',
                  pencilMode
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                    : 'bg-background hover:bg-muted',
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={erase}
              className="px-3 h-9 rounded-lg border bg-background hover:bg-muted text-sm font-medium transition-colors"
            >
              {t('erase')}
            </button>
            <button
              onClick={() => setPencilMode(m => !m)}
              className={cn(
                'px-3 h-9 rounded-lg border text-sm font-medium transition-colors',
                pencilMode
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-background hover:bg-muted',
              )}
            >
              ✏️ {t('pencil')}
            </button>
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="px-3 h-9 rounded-lg border bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↩ {t('undo')}
            </button>
            <button
              onClick={hint}
              className="px-3 h-9 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-sm font-medium transition-colors"
            >
              💡 {t('hint')}
            </button>
            <button
              onClick={() => setMistakeLimitMode(m => !m)}
              className={cn(
                'px-3 h-9 rounded-lg border text-sm font-medium transition-colors',
                mistakeLimitMode
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-background hover:bg-muted text-muted-foreground',
              )}
            >
              ⚠️ {t('mistakeMode')}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground max-w-xl text-center">{t('howToPlay')}</p>
    </div>
  )
}
