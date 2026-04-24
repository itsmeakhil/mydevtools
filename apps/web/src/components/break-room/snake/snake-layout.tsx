'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Point = { x: number; y: number }
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const COLS = 20
const ROWS = 20
const CELL = 24
const TICK_START = 150
const BEST_KEY = 'mydevtools-snake-best'

function randomFood(snake: Point[]): Point {
  let pos: Point
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === pos.x && s.y === pos.y))
  return pos
}

const INIT_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
]

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

export function SnakeLayout() {
  const [snake, setSnake] = useState<Point[]>(INIT_SNAKE)
  const [food, setFood] = useState<Point>({ x: 15, y: 10 })
  const [dir, setDir] = useState<Dir>('RIGHT')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() =>
    typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)
  )
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)

  const dirRef = useRef<Dir>('RIGHT')
  const nextDirRef = useRef<Dir>('RIGHT')
  const snakeRef = useRef(INIT_SNAKE)
  const foodRef = useRef<Point>({ x: 15, y: 10 })
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tick = useCallback(() => {
    if (gameOverRef.current) return

    const d = nextDirRef.current
    dirRef.current = d

    const head = snakeRef.current[0]!
    const moves: Record<Dir, Point> = {
      UP: { x: head.x, y: head.y - 1 },
      DOWN: { x: head.x, y: head.y + 1 },
      LEFT: { x: head.x - 1, y: head.y },
      RIGHT: { x: head.x + 1, y: head.y },
    }
    const next = moves[d]!

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      gameOverRef.current = true
      setGameOver(true)
      return
    }
    // Self collision
    if (snakeRef.current.some(s => s.x === next.x && s.y === next.y)) {
      gameOverRef.current = true
      setGameOver(true)
      return
    }

    const ate = next.x === foodRef.current.x && next.y === foodRef.current.y
    const newSnake = [next, ...snakeRef.current]
    if (!ate) newSnake.pop()

    snakeRef.current = newSnake
    setSnake([...newSnake])

    if (ate) {
      const newScore = scoreRef.current + 10
      scoreRef.current = newScore
      setScore(newScore)
      if (newScore > parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)) {
        localStorage.setItem(BEST_KEY, String(newScore))
        setBest(newScore)
      }
      const newFood = randomFood(newSnake)
      foodRef.current = newFood
      setFood(newFood)
    }

    const level = Math.floor(scoreRef.current / 50)
    const interval = Math.max(60, TICK_START - level * 10)
    loopRef.current = setTimeout(tick, interval)
  }, [])

  const startGame = useCallback(() => {
    const initSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
    const initFood = randomFood(initSnake)
    snakeRef.current = initSnake
    foodRef.current = initFood
    scoreRef.current = 0
    gameOverRef.current = false
    dirRef.current = 'RIGHT'
    nextDirRef.current = 'RIGHT'

    setSnake(initSnake)
    setFood(initFood)
    setScore(0)
    setDir('RIGHT')
    setGameOver(false)
    setStarted(true)

    if (loopRef.current) clearTimeout(loopRef.current)
    loopRef.current = setTimeout(tick, TICK_START)
  }, [tick])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
      }
      const newDir = map[e.key]
      if (!newDir) return
      e.preventDefault()
      if (!started) { startGame(); return }
      if (OPPOSITE[newDir] !== dirRef.current) {
        nextDirRef.current = newDir
        setDir(newDir)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, startGame])

  useEffect(() => () => { if (loopRef.current) clearTimeout(loopRef.current) }, [])

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]!
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]!
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    let newDir: Dir
    if (Math.abs(dx) > Math.abs(dy)) newDir = dx > 0 ? 'RIGHT' : 'LEFT'
    else newDir = dy > 0 ? 'DOWN' : 'UP'
    if (!started) { startGame(); return }
    if (OPPOSITE[newDir] !== dirRef.current) nextDirRef.current = newDir
  }

  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`))
  const isHead = (p: Point) => snake[0]?.x === p.x && snake[0]?.y === p.y

  return (
    <div className="flex flex-col items-center gap-4 select-none py-2 md:py-6">
      <div className="flex items-start justify-between w-full max-w-md">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-none">Snake</h1>
          <p className="text-xs text-muted-foreground mt-1">Arrow keys or WASD to move</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="text-lg font-bold leading-tight">{score}</div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Best</div>
            <div className="text-lg font-bold leading-tight">{best}</div>
          </div>
        </div>
      </div>

      <div
        className="relative border-2 border-border rounded-xl overflow-hidden touch-none bg-background"
        style={{ width: COLS * CELL, height: ROWS * CELL }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Grid dots */}
        <svg
          className="absolute inset-0 opacity-10"
          width={COLS * CELL}
          height={ROWS * CELL}
        >
          {Array.from({ length: ROWS + 1 }, (_, r) =>
            Array.from({ length: COLS + 1 }, (_, c) => (
              <circle key={`${r}-${c}`} cx={c * CELL} cy={r * CELL} r={1} fill="currentColor" />
            ))
          )}
        </svg>

        {/* Food */}
        <div
          className="absolute flex items-center justify-center text-lg"
          style={{
            left: food.x * CELL + 2,
            top: food.y * CELL + 2,
            width: CELL - 4,
            height: CELL - 4,
          }}
        >
          🍎
        </div>

        {/* Snake */}
        {snake.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-sm transition-none"
            style={{
              left: s.x * CELL + 1,
              top: s.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              backgroundColor: i === 0
                ? 'hsl(142, 76%, 36%)'
                : `hsl(142, 76%, ${36 + (i / snake.length) * 20}%)`,
            }}
          />
        ))}

        {/* Start overlay */}
        {!started && !gameOver && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <p className="text-2xl font-extrabold">Press any arrow key</p>
            <p className="text-sm text-muted-foreground">or tap the button below</p>
            <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white">
              Start Game
            </Button>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <p className="text-4xl font-extrabold text-white">Game Over</p>
            <p className="text-lg text-white/80">Score: {score}</p>
            <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white">
              Play Again
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Eat food to grow. Speed increases every 50 points.
      </p>
    </div>
  )
}
