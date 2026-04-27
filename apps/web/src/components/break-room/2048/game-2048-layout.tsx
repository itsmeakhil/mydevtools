'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Board = number[][]
type Dir = 'left' | 'right' | 'up' | 'down'
type BoardSize = 4 | 5 | 6

function emptyBoard(size: number): Board {
  return Array(size).fill(null).map(() => Array(size).fill(0))
}

function addRandomTile(board: Board, size: number): { board: Board; pos: number | null } {
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

function initBoard(size: number): Board {
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

function applyDir(board: Board, dir: Dir, size: number): { board: Board; score: number; moved: boolean; mergedPositions: Set<number> } {
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

function hasWon(board: Board): boolean {
  return board.some(row => row.some(v => v === 2048))
}

function hasMovesLeft(board: Board, size: number): boolean {
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

function tileStyle(v: number) {
  return TILE_STYLE[v] ?? 'bg-[#3c3a32] text-white'
}

function tileFont(v: number, size: number) {
  const big = size <= 4
  if (v >= 1024) return big ? 'text-base font-bold md:text-lg' : 'text-xs font-bold md:text-sm'
  if (v >= 128)  return big ? 'text-lg font-bold md:text-xl'  : 'text-sm font-bold md:text-base'
  return big ? 'text-xl font-bold md:text-2xl' : 'text-base font-bold md:text-lg'
}

const BEST_KEY = (size: BoardSize) => `mydevtools-2048-best-${size}`

type HistoryEntry = { board: Board; score: number; won: boolean; continueGame: boolean }
type CellAnim = 'merge' | 'appear' | null

export function Game2048Layout() {
  const t = useTranslations('Game2048')

  const [boardSize, setBoardSize] = useState<BoardSize>(4)
  const boardSizeRef = useRef<BoardSize>(4)

  const [board, setBoard] = useState<Board>(() => initBoard(4))
  const [score, setScore] = useState(0)
  const [bestScores, setBestScores] = useState<Record<BoardSize, number>>(() => {
    if (typeof window === 'undefined') return { 4: 0, 5: 0, 6: 0 }
    return {
      4: parseInt(localStorage.getItem(BEST_KEY(4)) ?? '0', 10),
      5: parseInt(localStorage.getItem(BEST_KEY(5)) ?? '0', 10),
      6: parseInt(localStorage.getItem(BEST_KEY(6)) ?? '0', 10),
    }
  })
  const [won, setWon] = useState(false)
  const [continueGame, setContinueGame] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [history, setHistory] = useState<HistoryEntry | null>(null)
  const [cellAnims, setCellAnims] = useState<CellAnim[]>(() => Array(16).fill(null))
  const [animKeys, setAnimKeys] = useState<number[]>(() => Array(16).fill(0))

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const newGame = useCallback((size?: BoardSize) => {
    const s = size ?? boardSizeRef.current
    boardSizeRef.current = s
    setBoardSize(s)
    setBoard(initBoard(s))
    setScore(0)
    setWon(false)
    setContinueGame(false)
    setGameOver(false)
    setHistory(null)
    setCellAnims(Array(s * s).fill(null))
    setAnimKeys(Array(s * s).fill(0))
  }, [])

  const doMove = useCallback((dir: Dir) => {
    if (gameOver) return
    if (won && !continueGame) return

    const size = boardSizeRef.current
    const { board: next, score: gained, moved, mergedPositions } = applyDir(board, dir, size)
    if (!moved) return

    setHistory({ board, score, won, continueGame })

    const { board: withTile, pos: newTilePos } = addRandomTile(next, size)
    const newScore = score + gained
    const newBest = Math.max(bestScores[size], newScore)

    const newAnims: CellAnim[] = Array(size * size).fill(null)
    mergedPositions.forEach(i => { newAnims[i] = 'merge' })
    if (newTilePos !== null) newAnims[newTilePos] = 'appear'

    setAnimKeys(prev => {
      const updated = [...prev]
      newAnims.forEach((anim, i) => { if (anim) updated[i]++ })
      return updated
    })
    setCellAnims(newAnims)
    setBoard(withTile)
    setScore(newScore)
    if (newBest > bestScores[size]) {
      setBestScores(prev => ({ ...prev, [size]: newBest }))
      localStorage.setItem(BEST_KEY(size), String(newBest))
    }
    if (!continueGame && hasWon(withTile)) setWon(true)
    if (!hasMovesLeft(withTile, size)) setGameOver(true)
  }, [board, score, bestScores, won, continueGame, gameOver])

  const undo = useCallback(() => {
    if (!history) return
    setBoard(history.board)
    setScore(history.score)
    setWon(history.won)
    setContinueGame(history.continueGame)
    setGameOver(false)
    setHistory(null)
    setCellAnims(Array(boardSizeRef.current * boardSizeRef.current).fill(null))
  }, [history])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left', ArrowRight: 'right',
        ArrowUp: 'up', ArrowDown: 'down',
      }
      const dir = map[e.key]
      if (dir) { e.preventDefault(); doMove(dir) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doMove])

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]!
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const touch = e.changedTouches[0]!
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left')
    else doMove(dy > 0 ? 'down' : 'up')
  }

  const showWin = won && !continueGame
  const cells = board.flat()
  const size = boardSize

  return (
    <>
      <style>{`
        @keyframes tile-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes tile-appear {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .tile-merge  { animation: tile-pop    0.14s ease; }
        .tile-appear { animation: tile-appear 0.12s ease; }
      `}</style>

      <div className="flex flex-col items-center gap-4 select-none py-2 md:py-6">
        {/* Header row */}
        <div className="flex items-start justify-between w-full max-w-sm">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-none">{t('title')}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-[#bbada0] text-white rounded-lg px-3 py-1.5 text-center min-w-[64px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{t('score')}</div>
              <div className="text-lg font-bold leading-tight">{score}</div>
            </div>
            <div className="bg-[#bbada0] text-white rounded-lg px-3 py-1.5 text-center min-w-[64px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{t('best')}</div>
              <div className="text-lg font-bold leading-tight">{bestScores[boardSize]}</div>
            </div>
          </div>
        </div>

        {/* Board size + action buttons */}
        <div className="flex w-full max-w-sm justify-between items-center gap-2">
          {/* Size selector */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {([4, 5, 6] as BoardSize[]).map(s => (
              <button
                key={s}
                onClick={() => newGame(s)}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-semibold transition-colors',
                  boardSize === s
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s}×{s}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[#8f7a66] text-[#8f7a66] hover:bg-[#8f7a66] hover:text-white disabled:opacity-30"
              onClick={undo}
              disabled={!history}
            >
              {t('undo')}
            </Button>
            <Button size="sm" className="bg-[#8f7a66] hover:bg-[#7a6a58] text-white border-0" onClick={() => newGame()}>
              {t('newGame')}
            </Button>
          </div>
        </div>

        {/* Board */}
        <div
          className="relative bg-[#bbada0] rounded-2xl p-2.5 touch-none"
          style={{ width: 'min(348px, 92vw)', height: 'min(348px, 92vw)' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="grid h-full gap-2"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {cells.map((value, flatIdx) => (
              <div
                key={`${flatIdx}-${animKeys[flatIdx]}`}
                className={cn(
                  'flex items-center justify-center rounded-xl transition-colors duration-75',
                  tileStyle(value),
                  value !== 0 && tileFont(value, size),
                  cellAnims[flatIdx] === 'merge' && 'tile-merge',
                  cellAnims[flatIdx] === 'appear' && 'tile-appear',
                )}
              >
                {value !== 0 ? value : ''}
              </div>
            ))}
          </div>

          {showWin && (
            <div className="absolute inset-0 rounded-2xl bg-yellow-300/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
              <p className="text-4xl font-extrabold text-white drop-shadow">{t('youWin')}</p>
              <div className="flex gap-2">
                <Button onClick={() => setContinueGame(true)} className="bg-[#f65e3b] hover:bg-[#e04d2a] text-white border-0">
                  {t('keepGoing')}
                </Button>
                <Button variant="outline" onClick={() => newGame()}>{t('newGame')}</Button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
              <p className="text-4xl font-extrabold text-white">{t('gameOver')}</p>
              <p className="text-sm text-white/75">{t('gameOverMessage')}</p>
              <Button onClick={() => newGame()} className="bg-[#f65e3b] hover:bg-[#e04d2a] text-white border-0">
                {t('tryAgain')}
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground max-w-sm text-center px-2">{t('howToPlay')}</p>
      </div>
    </>
  )
}
