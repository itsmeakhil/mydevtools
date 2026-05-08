'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Point = { x: number; y: number }
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Difficulty = 'easy' | 'normal' | 'hard' | 'infinite'
type PowerUpType = 'speed' | 'shield' | 'shrink'
interface PowerUp { type: PowerUpType; x: number; y: number }

const COLS = 20
const ROWS = 20
const CELL = 24
const BEST_KEY = 'mydevtools-snake-best'
const FOOD_COUNT = 2

const DIFFICULTY_CONFIG: Record<Difficulty, { tickStart: number; minTick: number; wrapWalls: boolean }> = {
  easy:     { tickStart: 220, minTick: 110, wrapWalls: false },
  normal:   { tickStart: 150, minTick: 60,  wrapWalls: false },
  hard:     { tickStart: 90,  minTick: 40,  wrapWalls: false },
  infinite: { tickStart: 150, minTick: 80,  wrapWalls: true  },
}

const POWERUP_EMOJI: Record<PowerUpType, string> = {
  speed: '⚡',
  shield: '🛡️',
  shrink: '✂️',
}

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

function randomFood(snake: Point[], occupied: Point[]): Point {
  let pos: Point
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (
    snake.some(s => s.x === pos.x && s.y === pos.y) ||
    occupied.some(f => f.x === pos.x && f.y === pos.y)
  )
  return pos
}

function initFoods(snake: Point[]): Point[] {
  const foods: Point[] = []
  for (let i = 0; i < FOOD_COUNT; i++) foods.push(randomFood(snake, foods))
  return foods
}

function randomPowerUpPos(snake: Point[], foods: Point[]): Point {
  return randomFood(snake, foods)
}

const INIT_SNAKE: Point[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]

export function SnakeLayout() {
  const t = useTranslations('Snake')

  const [snake, setSnake] = useState<Point[]>(INIT_SNAKE)
  const [foods, setFoods] = useState<Point[]>(() => initFoods(INIT_SNAKE))
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null)
  const [shieldActive, setShieldActive] = useState(false)
  const [speedBoostTicks, setSpeedBoostTicks] = useState(0)
  const [score, setScore] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [bests, setBests] = useState<Record<Difficulty, number>>(() => {
    if (typeof window === 'undefined') return { easy: 0, normal: 0, hard: 0, infinite: 0 }
    return {
      easy:     parseInt(localStorage.getItem(`${BEST_KEY}-easy`)     ?? '0', 10),
      normal:   parseInt(localStorage.getItem(`${BEST_KEY}-normal`)   ?? '0', 10),
      hard:     parseInt(localStorage.getItem(`${BEST_KEY}-hard`)     ?? '0', 10),
      infinite: parseInt(localStorage.getItem(`${BEST_KEY}-infinite`) ?? '0', 10),
    }
  })
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)

  const dirRef        = useRef<Dir>('RIGHT')
  const nextDirRef    = useRef<Dir>('RIGHT')
  const snakeRef      = useRef(INIT_SNAKE)
  const foodsRef      = useRef<Point[]>(initFoods(INIT_SNAKE))
  const powerUpRef    = useRef<PowerUp | null>(null)
  const shieldRef     = useRef(false)
  const speedRef      = useRef(0)
  const scoreRef      = useRef(0)
  const gameOverRef   = useRef(false)
  const difficultyRef = useRef<Difficulty>('normal')
  const loopRef       = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tick = useCallback(() => {
    if (gameOverRef.current) return

    const d = nextDirRef.current
    dirRef.current = d
    const { wrapWalls, minTick, tickStart } = DIFFICULTY_CONFIG[difficultyRef.current]

    const head = snakeRef.current[0]!
    let nx = head.x + (d === 'LEFT' ? -1 : d === 'RIGHT' ? 1 : 0)
    let ny = head.y + (d === 'UP'   ? -1 : d === 'DOWN'  ? 1 : 0)

    if (wrapWalls) {
      nx = ((nx % COLS) + COLS) % COLS
      ny = ((ny % ROWS) + ROWS) % ROWS
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      if (shieldRef.current) {
        shieldRef.current = false
        setShieldActive(false)
      } else {
        gameOverRef.current = true
        setGameOver(true)
        return
      }
    }

    if (snakeRef.current.some(s => s.x === nx && s.y === ny)) {
      if (shieldRef.current) {
        shieldRef.current = false
        setShieldActive(false)
      } else {
        gameOverRef.current = true
        setGameOver(true)
        return
      }
    }

    const next: Point = { x: nx, y: ny }
    const eatenIdx = foodsRef.current.findIndex(f => f.x === nx && f.y === ny)
    const ate = eatenIdx >= 0
    const newSnake = [next, ...snakeRef.current]
    if (!ate) newSnake.pop()
    snakeRef.current = newSnake
    setSnake([...newSnake])

    // Check power-up collection
    const pu = powerUpRef.current
    if (pu && nx === pu.x && ny === pu.y) {
      switch (pu.type) {
        case 'speed':
          speedRef.current = 10
          setSpeedBoostTicks(10)
          break
        case 'shield':
          shieldRef.current = true
          setShieldActive(true)
          break
        case 'shrink': {
          const trimmed = snakeRef.current.slice(0, Math.max(3, snakeRef.current.length - 3))
          snakeRef.current = trimmed
          setSnake([...trimmed])
          break
        }
      }
      powerUpRef.current = null
      setPowerUp(null)
    }

    if (ate) {
      const newScore = scoreRef.current + 10
      scoreRef.current = newScore
      setScore(newScore)

      const diff = difficultyRef.current
      const key = `${BEST_KEY}-${diff}`
      const prevBest = parseInt(localStorage.getItem(key) ?? '0', 10)
      if (newScore > prevBest) {
        localStorage.setItem(key, String(newScore))
        setBests(prev => ({ ...prev, [diff]: newScore }))
      }

      const remaining = foodsRef.current.filter((_, i) => i !== eatenIdx)
      const newFood = randomFood(newSnake, remaining)
      const newFoods = [...remaining, newFood]
      foodsRef.current = newFoods
      setFoods([...newFoods])

      // Spawn power-up every 50 pts (5 foods), 60% chance
      if (newScore % 50 === 0 && !powerUpRef.current) {
        const types: PowerUpType[] = ['speed', 'shield', 'shrink']
        if (Math.random() < 0.6) {
          const type = types[Math.floor(Math.random() * types.length)]!
          const pos = randomPowerUpPos(newSnake, newFoods)
          const newPU: PowerUp = { type, ...pos }
          powerUpRef.current = newPU
          setPowerUp(newPU)
        }
      }
    }

    // Speed boost countdown
    if (speedRef.current > 0) {
      speedRef.current--
      setSpeedBoostTicks(speedRef.current)
    }

    const level = Math.floor(scoreRef.current / 50)
    let interval = Math.max(minTick, tickStart - level * 10)
    if (speedRef.current > 0) interval = Math.max(20, Math.floor(interval / 2))
    loopRef.current = setTimeout(tick, interval)
  }, [])

  const startGame = useCallback((diff?: Difficulty) => {
    const useDiff = diff ?? difficultyRef.current
    difficultyRef.current = useDiff

    const initSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
    const initFoodsArr = initFoods(initSnake)

    snakeRef.current = initSnake
    foodsRef.current = initFoodsArr
    powerUpRef.current = null
    shieldRef.current = false
    speedRef.current = 0
    scoreRef.current = 0
    gameOverRef.current = false
    dirRef.current = 'RIGHT'
    nextDirRef.current = 'RIGHT'

    setSnake(initSnake)
    setFoods(initFoodsArr)
    setPowerUp(null)
    setShieldActive(false)
    setSpeedBoostTicks(0)
    setScore(0)
    setDifficulty(useDiff)
    setGameOver(false)
    setStarted(true)

    if (loopRef.current) clearTimeout(loopRef.current)
    loopRef.current = setTimeout(tick, DIFFICULTY_CONFIG[useDiff].tickStart)
  }, [tick])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
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
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, startGame])

  useEffect(() => () => { if (loopRef.current) clearTimeout(loopRef.current) }, [])

  const touchStart = useRef<{ x: number; y: number } | null>(null)
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
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    let newDir: Dir
    if (Math.abs(dx) > Math.abs(dy)) newDir = dx > 0 ? 'RIGHT' : 'LEFT'
    else newDir = dy > 0 ? 'DOWN' : 'UP'
    if (!started) { startGame(); return }
    if (OPPOSITE[newDir] !== dirRef.current) nextDirRef.current = newDir
  }

  const DIFF_LABELS: Record<Difficulty, string> = {
    easy:     t('diffEasy'),
    normal:   t('diffNormal'),
    hard:     t('diffHard'),
    infinite: t('diffInfinite'),
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none py-2 md:py-6">
      {/* Header */}
      <div className="flex items-start justify-between w-full max-w-md">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-none">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('score')}</div>
            <div className="text-lg font-bold leading-tight">{score}</div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1.5 text-center min-w-[64px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('best')}</div>
            <div className="text-lg font-bold leading-tight">{bests[difficulty]}</div>
          </div>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="flex w-full max-w-md gap-1.5">
        {(['easy', 'normal', 'hard', 'infinite'] as Difficulty[]).map(d => (
          <button
            key={d}
            disabled={started && !gameOver}
            onClick={() => {
              difficultyRef.current = d
              setDifficulty(d)
            }}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              difficulty === d
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
              started && !gameOver && 'opacity-50 cursor-not-allowed',
            )}
          >
            {DIFF_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Active power-up indicators */}
      {(shieldActive || speedBoostTicks > 0) && (
        <div className="flex gap-2 w-full max-w-md">
          {shieldActive && (
            <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              🛡️ {t('shieldActive')}
            </div>
          )}
          {speedBoostTicks > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded-lg px-3 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              ⚡ {t('speedBoost')} ×2
            </div>
          )}
        </div>
      )}

      {/* Board */}
      <div
        className="relative border-2 border-border rounded-xl overflow-hidden touch-none bg-background"
        style={{ width: COLS * CELL, height: ROWS * CELL }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Grid dots */}
        <svg className="absolute inset-0 opacity-10" width={COLS * CELL} height={ROWS * CELL}>
          {Array.from({ length: ROWS + 1 }, (_, r) =>
            Array.from({ length: COLS + 1 }, (_, c) => (
              <circle key={`${r}-${c}`} cx={c * CELL} cy={r * CELL} r={1} fill="currentColor" />
            ))
          )}
        </svg>

        {/* Food items */}
        {foods.map((f, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center text-lg"
            style={{ left: f.x * CELL + 2, top: f.y * CELL + 2, width: CELL - 4, height: CELL - 4 }}
          >
            🍎
          </div>
        ))}

        {/* Power-up */}
        {powerUp && (
          <div
            className="absolute flex items-center justify-center text-base"
            style={{
              left: powerUp.x * CELL + 1, top: powerUp.y * CELL + 1,
              width: CELL - 2, height: CELL - 2,
              animation: 'snake-pu-pulse 0.8s ease infinite',
            }}
          >
            <style>{`
              @keyframes snake-pu-pulse {
                0%,100% { transform: scale(1); opacity: 1; }
                50%     { transform: scale(1.2); opacity: 0.8; }
              }
            `}</style>
            {POWERUP_EMOJI[powerUp.type]}
          </div>
        )}

        {/* Snake */}
        {snake.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: s.x * CELL + 1,
              top: s.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              backgroundColor: i === 0
                ? shieldActive ? '#3B82F6' : 'hsl(142, 76%, 36%)'
                : `hsl(142, 76%, ${36 + (i / snake.length) * 20}%)`,
              boxShadow: i === 0 && shieldActive ? '0 0 6px 2px rgba(59,130,246,0.6)' : undefined,
            }}
          />
        ))}

        {/* Start overlay */}
        {!started && !gameOver && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <p className="text-2xl font-extrabold">{t('startPrompt')}</p>
            <p className="text-sm text-muted-foreground">{t('orTap')}</p>
            <Button onClick={() => startGame()} className="bg-green-600 hover:bg-green-700 text-white">
              {t('startButton')}
            </Button>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <p className="text-4xl font-extrabold text-white">{t('gameOver')}</p>
            <p className="text-lg text-white/80">{t('score')}: {score}</p>
            <Button onClick={() => startGame()} className="bg-green-600 hover:bg-green-700 text-white">
              {t('playAgain')}
            </Button>
          </div>
        )}
      </div>

      {/* Power-up legend */}
      {started && !gameOver && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>⚡ {t('powerSpeed')}</span>
          <span>🛡️ {t('powerShield')}</span>
          <span>✂️ {t('powerShrink')}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-md px-2">
        {difficulty === 'infinite' ? t('howToPlayInfinite') : t('howToPlay')}
      </p>
    </div>
  )
}
