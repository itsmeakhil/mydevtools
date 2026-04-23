'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Board = number[][]
type Dir = 'left' | 'right' | 'up' | 'down'

function emptyBoard(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(0))
}

function addRandomTile(board: Board): Board {
  const empty: [number, number][] = []
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 0) empty.push([r, c])
  if (empty.length === 0) return board
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]!
  const next = board.map(row => [...row])
  next[r]![c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function initBoard(): Board {
  return addRandomTile(addRandomTile(emptyBoard()))
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const filled = row.filter(v => v !== 0)
  let score = 0
  const merged: number[] = []
  let i = 0
  while (i < filled.length) {
    if (i + 1 < filled.length && filled[i] === filled[i + 1]) {
      const val = filled[i]! * 2
      merged.push(val)
      score += val
      i += 2
    } else {
      merged.push(filled[i]!)
      i++
    }
  }
  while (merged.length < 4) merged.push(0)
  return { row: merged, score }
}

function moveLeft(board: Board): { board: Board; score: number; moved: boolean } {
  let score = 0
  let moved = false
  const next = board.map(row => {
    const { row: newRow, score: s } = slideRow(row)
    score += s
    if (newRow.some((v, i) => v !== row[i])) moved = true
    return newRow
  })
  return { board: next, score, moved }
}

function rotateRight(board: Board): Board {
  return board[0]!.map((_, c) => board.map(row => row[c]!).reverse())
}

function rotateLeft(board: Board): Board {
  return board[0]!.map((_, c) => board.map(row => row[row.length - 1 - c]!))
}

function applyDir(board: Board, dir: Dir): { board: Board; score: number; moved: boolean } {
  if (dir === 'right') {
    const flipped = board.map(row => [...row].reverse())
    const res = moveLeft(flipped)
    return { ...res, board: res.board.map(row => [...row].reverse()) }
  }
  if (dir === 'up') {
    const res = moveLeft(rotateLeft(board))
    return { ...res, board: rotateRight(res.board) }
  }
  if (dir === 'down') {
    const res = moveLeft(rotateRight(board))
    return { ...res, board: rotateLeft(res.board) }
  }
  return moveLeft(board)
}

function hasWon(board: Board): boolean {
  return board.some(row => row.some(v => v === 2048))
}

function hasMovesLeft(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r]![c] === 0) return true
      if (c < 3 && board[r]![c] === board[r]![c + 1]) return true
      if (r < 3 && board[r]![c] === board[r + 1]![c]) return true
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

function tileFont(v: number) {
  if (v >= 1024) return 'text-base font-bold md:text-lg'
  if (v >= 128) return 'text-lg font-bold md:text-xl'
  return 'text-xl font-bold md:text-2xl'
}

const BEST_KEY = 'mydevtools-2048-best'

export function Game2048Layout() {
  const t = useTranslations('Game2048')

  const [board, setBoard] = useState<Board>(initBoard)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)
  })
  const [won, setWon] = useState(false)
  const [continueGame, setContinueGame] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const newGame = useCallback(() => {
    setBoard(initBoard())
    setScore(0)
    setWon(false)
    setContinueGame(false)
    setGameOver(false)
  }, [])

  const doMove = useCallback((dir: Dir) => {
    if (gameOver) return
    if (won && !continueGame) return

    const { board: next, score: gained, moved } = applyDir(board, dir)
    if (!moved) return

    const withTile = addRandomTile(next)
    const newScore = score + gained
    const newBest = Math.max(bestScore, newScore)

    setBoard(withTile)
    setScore(newScore)
    if (newBest > bestScore) {
      setBestScore(newBest)
      localStorage.setItem(BEST_KEY, String(newBest))
    }
    if (!continueGame && hasWon(withTile)) setWon(true)
    if (!hasMovesLeft(withTile)) setGameOver(true)
  }, [board, score, bestScore, won, continueGame, gameOver])

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

  return (
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
            <div className="text-lg font-bold leading-tight">{bestScore}</div>
          </div>
        </div>
      </div>

      {/* New Game button */}
      <div className="flex w-full max-w-sm justify-end">
        <Button size="sm" className="bg-[#8f7a66] hover:bg-[#7a6a58] text-white border-0" onClick={newGame}>
          {t('newGame')}
        </Button>
      </div>

      {/* Board */}
      <div
        className="relative bg-[#bbada0] rounded-2xl p-2.5 touch-none"
        style={{ width: 'min(348px, 92vw)', height: 'min(348px, 92vw)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid grid-cols-4 gap-2 h-full">
          {cells.map((value, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center rounded-xl transition-colors duration-75',
                tileStyle(value),
                value !== 0 && tileFont(value)
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
              <Button variant="outline" onClick={newGame}>{t('newGame')}</Button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <p className="text-4xl font-extrabold text-white">{t('gameOver')}</p>
            <p className="text-sm text-white/75">{t('gameOverMessage')}</p>
            <Button onClick={newGame} className="bg-[#f65e3b] hover:bg-[#e04d2a] text-white border-0">
              {t('tryAgain')}
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground max-w-sm text-center px-2">{t('howToPlay')}</p>
    </div>
  )
}
