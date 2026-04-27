'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type CellState = 'hidden' | 'revealed' | 'flagged' | 'questioned'
interface Cell { mine: boolean; adjacent: number; state: CellState }
type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom'
type Status = 'idle' | 'playing' | 'won' | 'lost'

// ─── Config ───────────────────────────────────────────────────────────────────

const PRESET: Record<Exclude<Difficulty,'custom'>, { rows:number; cols:number; mines:number; cell:number }> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, cell: 52 },
  intermediate: { rows: 16, cols: 16, mines: 40, cell: 40 },
  expert:       { rows: 16, cols: 30, mines: 99, cell: 32 },
}

const BEST_KEY    = (d: Difficulty) => `mydevtools-ms-best-${d}`
const STREAK_KEY  = 'mydevtools-ms-streak'
const BSTREAK_KEY = 'mydevtools-ms-best-streak'

// ─── LCG ──────────────────────────────────────────────────────────────────────

function makeLCG(seed: number) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

function buildBoard(
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

function floodReveal(
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

function checkWin(board: Cell[][]): boolean {
  return board.every(row => row.every(cell => cell.mine ? cell.state !== 'revealed' : cell.state === 'revealed'))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NUM_COLOR: Record<number, string> = {
  1: '#3B82F6', 2: '#22C55E', 3: '#EF4444',
  4: '#7C3AED', 5: '#B91C1C', 6: '#0891B2',
  7: '#1F2937', 8: '#6B7280',
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`
}

function newSeed() { return Math.floor(Math.random() * 1_000_000) + 1 }

// ─── Component ────────────────────────────────────────────────────────────────

export function MinesweeperLayout() {
  const [difficulty, setDifficulty]     = useState<Difficulty>('beginner')
  const [board, setBoard]               = useState<Cell[][] | null>(null)
  const [status, setStatus]             = useState<Status>('idle')
  const [flagCount, setFlagCount]       = useState(0)
  const [firstClick, setFirstClick]     = useState(true)
  const [timer, setTimer]               = useState(0)
  const [seed, setSeed]                 = useState<number>(() => newSeed())
  const [bestTimes, setBestTimes]       = useState<Partial<Record<Difficulty, number>>>(() => {
    if (typeof window === 'undefined') return {}
    const out: Partial<Record<Difficulty, number>> = {}
    for (const d of ['beginner','intermediate','expert'] as Difficulty[]) {
      const v = localStorage.getItem(BEST_KEY(d))
      if (v) out[d] = parseInt(v, 10)
    }
    return out
  })
  const [streak, setStreak]             = useState(() =>
    typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10)
  )
  const [bestStreak, setBestStreak]     = useState(() =>
    typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem(BSTREAK_KEY) ?? '0', 10)
  )

  // Custom board config
  const [customRows, setCustomRows]   = useState(16)
  const [customCols, setCustomCols]   = useState(16)
  const [customMines, setCustomMines] = useState(40)

  const revealDelaysRef = useRef<Record<string, number>>({})
  const mineDelaysRef   = useRef<Record<string, number>>({})
  const winDelaysRef    = useRef<Record<string, number>>({})
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const seedRef         = useRef<number>(seed)
  const streakRef       = useRef<number>(streak)

  // Effective config
  const cfg = difficulty === 'custom'
    ? {
        rows:  Math.max(5, Math.min(30, customRows)),
        cols:  Math.max(5, Math.min(30, customCols)),
        mines: Math.max(1, Math.min(customRows * customCols - 9, customMines)),
        cell:  Math.max(24, Math.min(52, Math.floor(480 / Math.max(5, customCols)))),
      }
    : PRESET[difficulty as Exclude<Difficulty,'custom'>]
  const { rows, cols, mines, cell: cellSize } = cfg

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }, [stopTimer])

  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    const handler = () => {
      if (document.hidden) stopTimer()
      else if (status === 'playing') startTimer()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [status, startTimer, stopTimer])

  const newGame = useCallback((diff?: Difficulty) => {
    stopTimer()
    revealDelaysRef.current = {}
    mineDelaysRef.current   = {}
    winDelaysRef.current    = {}
    const s = newSeed()
    seedRef.current = s
    setSeed(s)
    setBoard(null)
    setStatus('idle')
    setFlagCount(0)
    setFirstClick(true)
    setTimer(0)
    if (diff && diff !== difficulty) setDifficulty(diff)
  }, [difficulty, stopTimer])

  const onWin = useCallback((t: number, diff: Difficulty) => {
    // best time
    if (diff !== 'custom') {
      const prev = bestTimes[diff]
      if (prev === undefined || t < prev) {
        localStorage.setItem(BEST_KEY(diff), String(t))
        setBestTimes(b => ({ ...b, [diff]: t }))
      }
    }
    // streak (only preset difficulties)
    if (diff !== 'custom') {
      const cur = streakRef.current + 1
      streakRef.current = cur
      setStreak(cur)
      localStorage.setItem(STREAK_KEY, String(cur))
      if (cur > bestStreak) {
        setBestStreak(cur)
        localStorage.setItem(BSTREAK_KEY, String(cur))
      }
    }
  }, [bestTimes, bestStreak])

  const onLoss = useCallback((diff: Difficulty) => {
    if (diff !== 'custom' && streakRef.current > 0) {
      streakRef.current = 0
      setStreak(0)
      localStorage.setItem(STREAK_KEY, '0')
    }
  }, [])

  const handleReveal = useCallback((r: number, c: number) => {
    if (status === 'won' || status === 'lost') return
    let currentBoard = board
    if (!currentBoard || firstClick) {
      const rand = makeLCG(seedRef.current)
      currentBoard = buildBoard(rows, cols, mines, r, c, rand)
      revealDelaysRef.current = {}
      mineDelaysRef.current   = {}
      setFirstClick(false)
      startTimer()
    }
    const cell = currentBoard[r]![c]!
    if (cell.state === 'flagged' || cell.state === 'revealed') return

    if (cell.mine) {
      stopTimer()
      const allMines: { r: number; c: number; dist: number }[] = []
      currentBoard.forEach((row, mr) =>
        row.forEach((cl, mc) => {
          if (cl.mine) allMines.push({ r: mr, c: mc, dist: Math.abs(mr - r) + Math.abs(mc - c) })
        })
      )
      allMines.sort((a, b) => a.dist - b.dist)
      allMines.forEach(({ r: mr, c: mc, dist }) => { mineDelaysRef.current[`${mr},${mc}`] = dist * 55 })
      const lost = currentBoard.map(row =>
        row.map(cl => cl.mine ? { ...cl, state: 'revealed' as CellState } : { ...cl })
      )
      setBoard(lost)
      setStatus('lost')
      onLoss(difficulty)
      return
    }

    const { board: revealed, distances } = floodReveal(currentBoard, rows, cols, r, c)
    Object.entries(distances).forEach(([key, dist]) => { revealDelaysRef.current[key] = dist * 28 })
    const won = checkWin(revealed)
    setBoard(revealed)
    setStatus(won ? 'won' : 'playing')
    if (won) {
      stopTimer()
      const cr = Math.floor(rows / 2), cc = Math.floor(cols / 2)
      revealed.forEach((row, wr) => row.forEach((_, wc) => {
        winDelaysRef.current[`${wr},${wc}`] = (Math.abs(wr - cr) + Math.abs(wc - cc)) * 18
      }))
      const t = timer + 1
      onWin(t, difficulty)
    }
  }, [status, board, firstClick, difficulty, rows, cols, mines, timer, startTimer, stopTimer, onWin, onLoss])

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (!board || status === 'won' || status === 'lost') return
    const cell = board[r]![c]!
    if (cell.state === 'revealed') return
    const next = board.map(row => row.map(cl => ({ ...cl })))
    if (next[r]![c]!.state === 'hidden') {
      next[r]![c]!.state = 'flagged'
      setFlagCount(f => f + 1)
    } else if (next[r]![c]!.state === 'flagged') {
      next[r]![c]!.state = 'questioned'
      setFlagCount(f => f - 1)
    } else {
      next[r]![c]!.state = 'hidden'
    }
    setBoard(next)
  }, [board, status])

  const handleChord = useCallback((r: number, c: number) => {
    if (!board) return
    const cell = board[r]![c]!
    if (cell.state !== 'revealed' || cell.adjacent === 0) return
    let flagged = 0
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr]![nc]!.state === 'flagged') flagged++
      }
    if (flagged !== cell.adjacent) return
    let current = board.map(row => row.map(cl => ({ ...cl })))
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (current[nr]![nc]!.state !== 'hidden') continue
        if (current[nr]![nc]!.mine) {
          const allMines: { r: number; c: number; dist: number }[] = []
          current.forEach((row, mr) => row.forEach((cl, mc) => {
            if (cl.mine) allMines.push({ r: mr, c: mc, dist: Math.abs(mr - nr) + Math.abs(mc - nc) })
          }))
          allMines.sort((a, b) => a.dist - b.dist)
          allMines.forEach(({ r: mr, c: mc, dist }) => { mineDelaysRef.current[`${mr},${mc}`] = dist * 55 })
          const lost = current.map(row => row.map(cl => cl.mine ? { ...cl, state: 'revealed' as CellState } : { ...cl }))
          setBoard(lost); setStatus('lost'); stopTimer(); onLoss(difficulty); return
        }
        const { board: fb, distances } = floodReveal(current, rows, cols, nr, nc)
        Object.entries(distances).forEach(([key, dist]) => { revealDelaysRef.current[key] = dist * 28 })
        current = fb
      }
    const won = checkWin(current)
    setBoard(current)
    setStatus(won ? 'won' : 'playing')
    if (won) {
      stopTimer()
      const cr = Math.floor(rows / 2), cc = Math.floor(cols / 2)
      current.forEach((row, wr) => row.forEach((_, wc) => {
        winDelaysRef.current[`${wr},${wc}`] = (Math.abs(wr - cr) + Math.abs(wc - cc)) * 18
      }))
      onWin(timer, difficulty)
    }
  }, [board, rows, cols, timer, difficulty, stopTimer, onWin, onLoss])

  const minesLeft = mines - flagCount
  const bestTime  = bestTimes[difficulty]
  const isActive  = status === 'playing'

  return (
    <>
      <style>{`
        @keyframes ms-reveal {
          from { transform: scale(0.4) rotateX(40deg); opacity: 0; }
          60%  { transform: scale(1.06) rotateX(-4deg); opacity: 1; }
          to   { transform: scale(1) rotateX(0deg); opacity: 1; }
        }
        @keyframes ms-flag {
          0%   { transform: scale(0) rotate(-40deg); }
          55%  { transform: scale(1.25) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes ms-mine {
          0%   { transform: scale(0); opacity: 0; }
          45%  { transform: scale(1.4); opacity: 1; background-color: #FF6B6B; }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ms-win-pulse {
          0%,100% { filter: brightness(1); }
          50%      { filter: brightness(1.35) saturate(1.4); }
        }
        @keyframes ms-shake {
          0%,100% { transform: translateX(0); }
          15%  { transform: translateX(-6px); }
          35%  { transform: translateX(6px); }
          55%  { transform: translateX(-4px); }
          75%  { transform: translateX(4px); }
        }
        @keyframes ms-won-board {
          0%,100% { box-shadow: 0 0 0 2px #16a34a33, 0 8px 32px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 0 0 3px #4ade8088, 0 0 40px rgba(74,222,128,0.35), 0 8px 32px rgba(0,0,0,0.3); }
        }
        @keyframes ms-counter-pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-4 select-none py-2 md:py-6 px-2">

        {/* Header */}
        <div className="flex items-start justify-between w-full max-w-3xl">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-none">Minesweeper</h1>
            <p className="text-xs text-muted-foreground mt-1">Left click reveal · Right click flag/? · Double-click chord</p>
          </div>
          <div className="flex gap-2 items-start flex-shrink-0">
            {/* Streak */}
            {(streak > 0 || bestStreak > 0) && (
              <div className="rounded-xl px-3 py-2 text-center min-w-[56px]" style={{ background: 'hsl(var(--muted))' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">🔥</div>
                <div className="text-lg font-bold tabular-nums" style={{ color: streak > 0 ? '#f97316' : undefined }}>
                  {streak}
                </div>
                {bestStreak > 1 && (
                  <div className="text-[9px] text-muted-foreground">best {bestStreak}</div>
                )}
              </div>
            )}
            <div className="rounded-xl px-4 py-2 text-center min-w-[72px]"
              style={{ background: 'hsl(var(--muted))', animation: minesLeft <= 3 && isActive ? 'ms-counter-pulse 0.8s ease infinite' : undefined }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">💣</div>
              <div className="text-xl font-bold tabular-nums" style={{ color: minesLeft <= 0 ? '#EF4444' : undefined }}>{minesLeft}</div>
            </div>
            <div className="rounded-xl px-4 py-2 text-center min-w-[72px]" style={{ background: 'hsl(var(--muted))' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">⏱</div>
              <div className="text-xl font-bold tabular-nums font-mono">{formatTime(timer)}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => newGame()} className="self-center">New</Button>
          </div>
        </div>

        {/* Difficulty tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-full max-w-3xl" style={{ background: 'hsl(var(--muted))' }}>
          {(['beginner','intermediate','expert','custom'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => newGame(d)}
              className={cn(
                'flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5',
                difficulty === d ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              <span className="capitalize">{d === 'custom' ? '⚙ Custom' : d}</span>
              {d !== 'custom' && bestTimes[d] !== undefined && (
                <span className="text-[10px] font-normal" style={{ color: difficulty === d ? 'hsl(var(--muted-foreground))' : 'transparent' }}>
                  best {formatTime(bestTimes[d]!)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Custom board config */}
        {difficulty === 'custom' && (
          <div className="flex gap-3 items-center flex-wrap w-full max-w-3xl bg-muted rounded-xl px-4 py-3">
            {([
              { label: 'Rows',  val: customRows,  min: 5, max: 30, set: setCustomRows },
              { label: 'Cols',  val: customCols,  min: 5, max: 30, set: setCustomCols },
              { label: 'Mines', val: customMines, min: 1, max: Math.max(1, customRows * customCols - 9), set: setCustomMines },
            ] as const).map(({ label, val, min, max, set }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-10">{label}</span>
                <input
                  type="number" min={min} max={max} value={val}
                  disabled={isActive}
                  onChange={e => set(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                  className="w-16 h-8 rounded-lg border bg-background text-center text-sm font-bold disabled:opacity-50"
                />
              </div>
            ))}
            <Button size="sm" onClick={() => newGame('custom')} disabled={isActive} className="ml-auto">
              Apply
            </Button>
          </div>
        )}

        {/* Board */}
        <div className="overflow-auto max-w-full w-full flex justify-center">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              display: 'inline-grid',
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap: 0, padding: 4,
              background: 'hsl(var(--muted))',
              boxShadow: status === 'won'
                ? '0 0 0 2px #16a34a44,0 0 40px rgba(74,222,128,0.25),0 8px 32px rgba(0,0,0,0.15)'
                : status === 'lost'
                ? '0 0 0 2px #ef444444,0 8px 32px rgba(0,0,0,0.2)'
                : '0 4px 24px rgba(0,0,0,0.12)',
              animation: status === 'won' ? 'ms-won-board 1.8s ease infinite' : status === 'lost' ? 'ms-shake 0.45s ease' : undefined,
            }}
            onContextMenu={e => e.preventDefault()}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const cell = board?.[r]?.[c]
                const state = cell?.state ?? 'hidden'
                const isRevealed   = state === 'revealed'
                const isMine       = !!(cell?.mine && isRevealed)
                const isFlagged    = state === 'flagged'
                const isQuestioned = state === 'questioned'
                const adj          = cell?.adjacent ?? 0
                const key          = `${r},${c}`
                const revealDelay  = revealDelaysRef.current[key] ?? 0
                const mineDelay    = mineDelaysRef.current[key] ?? 0
                const winDelay     = winDelaysRef.current[key] ?? 0
                const isNewlyRevealed = isRevealed && !isMine && revealDelaysRef.current[key] !== undefined

                return (
                  <div
                    key={key}
                    onClick={() => handleReveal(r, c)}
                    onDoubleClick={() => handleChord(r, c)}
                    onContextMenu={e => handleFlag(e, r, c)}
                    style={{
                      width: cellSize, height: cellSize,
                      fontSize: Math.round(cellSize * 0.42),
                      fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: status === 'won' || status === 'lost' ? 'default' : 'pointer',
                      borderRadius: 4, margin: 1, userSelect: 'none',
                      transition: 'background-color 0.1s ease',
                      position: 'relative', overflow: 'hidden',
                      ...(isMine ? {
                        backgroundColor: '#1f1f1f',
                        animation: 'ms-mine 0.5s ease both',
                        animationDelay: `${mineDelay}ms`,
                      } : isRevealed ? {
                        backgroundColor: 'hsl(var(--background))',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
                        ...(isNewlyRevealed ? {
                          animation: 'ms-reveal 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
                          animationDelay: `${revealDelay}ms`,
                        } : {}),
                        ...(status === 'won' ? { animation: `ms-win-pulse 1.2s ease ${winDelay}ms infinite` } : {}),
                      } : {
                        backgroundColor: 'hsl(var(--muted))',
                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18),inset 0 -2px 0 rgba(0,0,0,0.15),inset 2px 0 0 rgba(255,255,255,0.1),inset -2px 0 0 rgba(0,0,0,0.1)',
                      }),
                    }}>
                    {isMine ? (
                      <span style={{ fontSize: Math.round(cellSize * 0.52), animation: 'ms-mine 0.5s ease both', animationDelay: `${mineDelay}ms` }}>💣</span>
                    ) : isFlagged ? (
                      <span style={{ fontSize: Math.round(cellSize * 0.52), display: 'inline-block', animation: 'ms-flag 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>🚩</span>
                    ) : isQuestioned ? (
                      <span style={{
                        fontSize: Math.round(cellSize * 0.5),
                        fontWeight: 900,
                        color: '#F59E0B',
                        display: 'inline-block',
                        animation: 'ms-flag 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
                      }}>?</span>
                    ) : isRevealed && adj > 0 ? (
                      <span style={{ color: NUM_COLOR[adj], lineHeight: 1 }}>{adj}</span>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 flex-wrap min-h-[48px]">
          {status === 'won' && (
            <>
              <span className="text-2xl font-extrabold" style={{ color: '#4ADE80' }}>You cleared it! 🎉</span>
              <span className="text-sm text-muted-foreground">{formatTime(timer)}</span>
              {difficulty !== 'custom' && bestTimes[difficulty] === timer && (
                <span className="text-sm font-bold" style={{ color: '#FFD700' }}>🏆 New best!</span>
              )}
              {streak > 1 && (
                <span className="text-sm font-semibold text-orange-500">🔥 {streak} win streak!</span>
              )}
              <Button onClick={() => newGame()} className="ml-2 bg-green-600 hover:bg-green-700 text-white">Play Again</Button>
            </>
          )}
          {status === 'lost' && (
            <>
              <span className="text-2xl font-extrabold text-red-500">Boom! 💥</span>
              <span className="text-xs text-muted-foreground font-mono">Seed: {seed}</span>
              <Button onClick={() => newGame()} variant="destructive" className="ml-2">Try Again</Button>
            </>
          )}
          {status === 'idle' && (
            <p className="text-sm text-muted-foreground">Click any cell to start — first click is always safe</p>
          )}
          {status === 'playing' && (
            <p className="text-xs text-muted-foreground">{flagCount} flagged · right-click to cycle 🚩 → ? → clear</p>
          )}
        </div>

      </div>
    </>
  )
}
