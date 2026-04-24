'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CellState = 'hidden' | 'revealed' | 'flagged'

interface Cell {
  mine: boolean
  adjacent: number
  state: CellState
}

type Difficulty = 'beginner' | 'intermediate' | 'expert'

const CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
}

function buildBoard(rows: number, cols: number, mines: number, safeR: number, safeC: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, adjacent: 0, state: 'hidden' as CellState }))
  )

  // Place mines avoiding safe zone (3x3 around first click)
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (board[r]![c]!.mine) continue
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue
    board[r]![c]!.mine = true
    placed++
  }

  // Compute adjacency
  for (let r = 0; r < rows; r++) {
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
  }
  return board
}

function floodReveal(board: Cell[][], rows: number, cols: number, r: number, c: number): Cell[][] {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  const queue: [number, number][] = [[r, c]]
  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!
    const cell = next[cr]![cc]!
    if (cell.state === 'revealed' || cell.state === 'flagged' || cell.mine) continue
    cell.state = 'revealed'
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr, nc = cc + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr]![nc]!.state === 'hidden')
            queue.push([nr, nc])
        }
    }
  }
  return next
}

function checkWin(board: Cell[][]): boolean {
  return board.every(row => row.every(cell => cell.mine ? cell.state !== 'revealed' : cell.state === 'revealed'))
}

const NUM_COLOR: Record<number, string> = {
  1: 'text-blue-600 dark:text-blue-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-red-600 dark:text-red-400',
  4: 'text-purple-800 dark:text-purple-400',
  5: 'text-red-900 dark:text-red-300',
  6: 'text-teal-600 dark:text-teal-400',
  7: 'text-black dark:text-white',
  8: 'text-gray-500',
}

export function MinesweeperLayout() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [board, setBoard] = useState<Cell[][] | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle')
  const [flagCount, setFlagCount] = useState(0)
  const [firstClick, setFirstClick] = useState(true)

  const { rows, cols, mines } = CONFIG[difficulty]

  const newGame = useCallback((diff?: Difficulty) => {
    const d = diff ?? difficulty
    setBoard(null)
    setStatus('idle')
    setFlagCount(0)
    setFirstClick(true)
  }, [difficulty])

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d)
    newGame(d)
  }

  const handleReveal = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return

    let currentBoard = board
    let isFirst = firstClick

    if (!currentBoard || isFirst) {
      currentBoard = buildBoard(rows, cols, mines, r, c)
      setFirstClick(false)
      isFirst = false
    }

    const cell = currentBoard[r]![c]!
    if (cell.state === 'flagged' || cell.state === 'revealed') return

    if (cell.mine) {
      // Reveal all mines
      const lost = currentBoard.map(row =>
        row.map(cl => cl.mine ? { ...cl, state: 'revealed' as CellState } : { ...cl })
      )
      setBoard(lost)
      setStatus('lost')
      return
    }

    const revealed = floodReveal(currentBoard, rows, cols, r, c)
    setBoard(revealed)
    setStatus(checkWin(revealed) ? 'won' : 'playing')
  }

  const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (!board || status === 'won' || status === 'lost') return
    const cell = board[r]![c]!
    if (cell.state === 'revealed') return
    const next = board.map(row => row.map(cl => ({ ...cl })))
    if (next[r]![c]!.state === 'hidden') {
      next[r]![c]!.state = 'flagged'
      setFlagCount(f => f + 1)
    } else {
      next[r]![c]!.state = 'hidden'
      setFlagCount(f => f - 1)
    }
    setBoard(next)
  }

  const cellSize = difficulty === 'expert' ? 28 : difficulty === 'intermediate' ? 32 : 40

  return (
    <div className="flex flex-col items-center gap-4 select-none py-2 md:py-6">
      <div className="flex items-start justify-between w-full max-w-2xl">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-none">Minesweeper</h1>
          <p className="text-xs text-muted-foreground mt-1">Left click reveal · Right click flag</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mines</div>
            <div className="text-lg font-bold leading-tight">{mines - flagCount}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => newGame()}>New Game</Button>
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-full max-w-2xl">
        {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => changeDifficulty(d)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize',
              difficulty === d ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="overflow-auto max-w-full">
        <div
          className="border-2 border-border rounded-lg overflow-hidden"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
          onContextMenu={e => e.preventDefault()}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const cell = board?.[r]?.[c]
              const state = cell?.state ?? 'hidden'
              const isRevealed = state === 'revealed'
              const isMine = cell?.mine && isRevealed
              const isFlagged = state === 'flagged'
              const adj = cell?.adjacent ?? 0

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleReveal(r, c)}
                  onContextMenu={e => handleFlag(e, r, c)}
                  style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.45 }}
                  className={cn(
                    'flex items-center justify-center border border-border/30 font-bold cursor-pointer transition-colors',
                    isRevealed
                      ? isMine
                        ? 'bg-red-500 dark:bg-red-700'
                        : 'bg-muted/40'
                      : 'bg-muted hover:bg-muted/70 active:bg-muted/50',
                    adj > 0 && isRevealed && NUM_COLOR[adj],
                  )}
                >
                  {isMine ? '💣' : isFlagged ? '🚩' : isRevealed && adj > 0 ? adj : ''}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Status */}
      {status === 'won' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">You Win! 🎉</p>
          <Button onClick={() => newGame()} className="bg-green-600 hover:bg-green-700 text-white">Play Again</Button>
        </div>
      )}
      {status === 'lost' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">Boom! 💥</p>
          <Button onClick={() => newGame()} variant="destructive">Try Again</Button>
        </div>
      )}
      {status === 'idle' && (
        <p className="text-sm text-muted-foreground">Click any cell to start</p>
      )}
    </div>
  )
}
