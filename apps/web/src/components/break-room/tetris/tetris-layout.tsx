'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 10
const ROWS = 20
const CELL = 30
const BEST_KEY = 'mydevtools-tetris-best'

// ─── Types ────────────────────────────────────────────────────────────────────

type Board = (string | null)[][]
type Piece = { shape: number[][]; color: string; x: number; y: number }

// ─── Pieces ───────────────────────────────────────────────────────────────────

const PIECES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: '#22D3EE' },            // I – cyan
  { shape: [[1, 1], [1, 1]], color: '#FACC15' },          // O – yellow
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#A855F7' },    // T – purple
  { shape: [[1, 0], [1, 1], [0, 1]], color: '#4ADE80' },  // S – green
  { shape: [[0, 1], [1, 1], [1, 0]], color: '#F87171' },  // Z – red
  { shape: [[1, 0], [1, 0], [1, 1]], color: '#60A5FA' },  // J – blue
  { shape: [[0, 1], [0, 1], [1, 1]], color: '#FB923C' },  // L – orange
]

// ─── Bag randomiser (7-bag) ───────────────────────────────────────────────────

function makeBag(): number[] {
  const bag = [0, 1, 2, 3, 4, 5, 6]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}

let bagQueue: number[] = []
function nextFromBag(): number {
  if (bagQueue.length === 0) bagQueue = makeBag()
  return bagQueue.shift()!
}

function randomPiece(): Piece {
  const idx = nextFromBag()
  const p = PIECES[idx]!
  return { ...p, x: Math.floor((COLS - p.shape[0]!.length) / 2), y: 0 }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0]!.length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r]![c]!)
  )
}

function collides(board: Board, piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0]!.length; c++) {
      if (!shape[r]![c]) continue
      const nr = piece.y + r + dy, nc = piece.x + c + dx
      if (nr >= ROWS || nc < 0 || nc >= COLS) return true
      if (nr >= 0 && board[nr]![nc] !== null) return true
    }
  return false
}

function place(board: Board, piece: Piece): Board {
  const next = board.map(row => [...row])
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[0]!.length; c++) {
      if (!piece.shape[r]![c]) continue
      const nr = piece.y + r, nc = piece.x + c
      if (nr >= 0) next[nr]![nc] = piece.color
    }
  return next
}

function findFullRows(board: Board): number[] {
  return board.reduce<number[]>((acc, row, i) => {
    if (row.every(c => c !== null)) acc.push(i)
    return acc
  }, [])
}

function clearLines(board: Board): { board: Board; lines: number } {
  const remaining = board.filter(row => row.some(c => c === null))
  const lines = ROWS - remaining.length
  const empty = Array.from({ length: lines }, () => Array(COLS).fill(null))
  return { board: [...empty, ...remaining], lines }
}

function calcScore(lines: number, level: number): number {
  const base = [0, 100, 300, 500, 800]
  return (base[Math.min(lines, 4)] ?? 0) * (level + 1)
}

function ghostY(board: Board, piece: Piece): number {
  let dy = 0
  while (!collides(board, piece, 0, dy + 1)) dy++
  return piece.y + dy
}

// ─── Score popup ──────────────────────────────────────────────────────────────

interface ScorePop { id: number; val: number }

// ─── Component ────────────────────────────────────────────────────────────────

export function TetrisLayout() {
  const [board, setBoard] = useState<Board>(emptyBoard)
  const [piece, setPiece] = useState<Piece | null>(null)
  const [next, setNext] = useState<Piece>(() => { bagQueue = []; return randomPiece() })
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(0)
  const [best, setBest] = useState(() =>
    typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)
  )
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [flashingRows, setFlashingRows] = useState<number[]>([])
  const [scorePops, setScorePops] = useState<ScorePop[]>([])
  const [levelUpMsg, setLevelUpMsg] = useState(false)
  const [lockFlash, setLockFlash] = useState(false)

  const boardRef = useRef<Board>(emptyBoard())
  const pieceRef = useRef<Piece | null>(null)
  const nextRef = useRef<Piece>(next)
  const scoreRef = useRef(0)
  const linesRef = useRef(0)
  const levelRef = useRef(0)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)
  const flashingRef = useRef(false)
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popIdRef = useRef(0)

  const triggerScorePop = useCallback((val: number) => {
    if (val <= 0) return
    const id = ++popIdRef.current
    setScorePops(prev => [...prev, { id, val }])
    setTimeout(() => setScorePops(prev => prev.filter(p => p.id !== id)), 900)
  }, [])

  const spawnPiece = useCallback(() => {
    const p = nextRef.current
    const newNext = randomPiece()
    nextRef.current = newNext
    setNext(newNext)

    if (collides(boardRef.current, p)) {
      gameOverRef.current = true
      setGameOver(true)
      return
    }
    pieceRef.current = p
    setPiece({ ...p })
  }, [])

  const lockAndSpawn = useCallback(() => {
    if (!pieceRef.current) return

    const placed = place(boardRef.current, pieceRef.current)
    const fullRows = findFullRows(placed)

    // Lock flash
    setLockFlash(true)
    setTimeout(() => setLockFlash(false), 80)

    if (fullRows.length > 0) {
      // Flash clearing rows
      boardRef.current = placed
      setBoard(placed.map(r => [...r]))
      flashingRef.current = true
      setFlashingRows(fullRows)

      setTimeout(() => {
        const { board: cleared, lines: clearedLines } = clearLines(placed)
        boardRef.current = cleared
        setBoard(cleared.map(r => [...r]))
        setFlashingRows([])
        flashingRef.current = false

        const prevLevel = levelRef.current
        const newLines = linesRef.current + clearedLines
        const newLevel = Math.floor(newLines / 10)
        const gained = calcScore(clearedLines, levelRef.current)
        const newScore = scoreRef.current + gained

        linesRef.current = newLines
        levelRef.current = newLevel
        scoreRef.current = newScore

        setLines(newLines)
        setLevel(newLevel)
        setScore(newScore)
        triggerScorePop(gained)

        if (newLevel > prevLevel) {
          setLevelUpMsg(true)
          setTimeout(() => setLevelUpMsg(false), 1200)
        }

        if (newScore > parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)) {
          localStorage.setItem(BEST_KEY, String(newScore))
          setBest(newScore)
        }

        pieceRef.current = null
        setPiece(null)
        spawnPiece()
      }, 220)
    } else {
      boardRef.current = placed
      setBoard(placed.map(r => [...r]))
      pieceRef.current = null
      setPiece(null)
      spawnPiece()
    }
  }, [spawnPiece, triggerScorePop])

  const tick = useCallback(() => {
    if (gameOverRef.current || pausedRef.current || flashingRef.current) return

    if (!pieceRef.current) {
      spawnPiece()
    } else if (collides(boardRef.current, pieceRef.current, 0, 1)) {
      lockAndSpawn()
    } else {
      pieceRef.current = { ...pieceRef.current, y: pieceRef.current.y + 1 }
      setPiece({ ...pieceRef.current })
    }

    const interval = Math.max(60, 500 - levelRef.current * 40)
    loopRef.current = setTimeout(tick, interval)
  }, [spawnPiece, lockAndSpawn])

  const startGame = useCallback(() => {
    bagQueue = []
    const initBoard = emptyBoard()
    const p = randomPiece()
    const n = randomPiece()

    boardRef.current = initBoard
    pieceRef.current = p
    nextRef.current = n
    scoreRef.current = 0
    linesRef.current = 0
    levelRef.current = 0
    gameOverRef.current = false
    pausedRef.current = false
    flashingRef.current = false

    setBoard(initBoard)
    setPiece(p)
    setNext(n)
    setScore(0)
    setLines(0)
    setLevel(0)
    setGameOver(false)
    setPaused(false)
    setFlashingRows([])
    setScorePops([])
    setLevelUpMsg(false)
    setStarted(true)

    if (loopRef.current) clearTimeout(loopRef.current)
    loopRef.current = setTimeout(tick, 500)
  }, [tick])

  const moveLeft = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    if (!collides(boardRef.current, pieceRef.current, -1)) {
      pieceRef.current = { ...pieceRef.current, x: pieceRef.current.x - 1 }
      setPiece({ ...pieceRef.current })
    }
  }, [])

  const moveRight = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    if (!collides(boardRef.current, pieceRef.current, 1)) {
      pieceRef.current = { ...pieceRef.current, x: pieceRef.current.x + 1 }
      setPiece({ ...pieceRef.current })
    }
  }, [])

  const moveDown = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    if (!collides(boardRef.current, pieceRef.current, 0, 1)) {
      pieceRef.current = { ...pieceRef.current, y: pieceRef.current.y + 1 }
      setPiece({ ...pieceRef.current })
    } else {
      lockAndSpawn()
    }
  }, [lockAndSpawn])

  const rotatePiece = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    const rotated = rotate(pieceRef.current.shape)
    let dx = 0
    if (collides(boardRef.current, pieceRef.current, 0, 0, rotated)) {
      dx = 1
      if (collides(boardRef.current, pieceRef.current, 1, 0, rotated)) {
        dx = -1
        if (collides(boardRef.current, pieceRef.current, -1, 0, rotated)) return
      }
    }
    pieceRef.current = { ...pieceRef.current, shape: rotated, x: pieceRef.current.x + dx }
    setPiece({ ...pieceRef.current })
  }, [])

  const hardDrop = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    let dy = 0
    while (!collides(boardRef.current, pieceRef.current, 0, dy + 1)) dy++
    pieceRef.current = { ...pieceRef.current, y: pieceRef.current.y + dy }
    lockAndSpawn()
  }, [lockAndSpawn])

  const togglePause = useCallback(() => {
    if (!started || gameOverRef.current) return
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
    if (!pausedRef.current) {
      const interval = Math.max(60, 500 - levelRef.current * 40)
      loopRef.current = setTimeout(tick, interval)
    }
  }, [started, tick])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started) {
        if (e.key === 'Enter' || e.key === ' ') startGame()
        return
      }
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); moveLeft(); break
        case 'ArrowRight': e.preventDefault(); moveRight(); break
        case 'ArrowDown':  e.preventDefault(); moveDown(); break
        case 'ArrowUp':    e.preventDefault(); rotatePiece(); break
        case ' ':          e.preventDefault(); hardDrop(); break
        case 'p': case 'P': togglePause(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, startGame, moveLeft, moveRight, moveDown, rotatePiece, hardDrop, togglePause])

  useEffect(() => () => { if (loopRef.current) clearTimeout(loopRef.current) }, [])

  // Touch swipe on board
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]!
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]!
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    const dt = Date.now() - touchStart.current.t
    touchStart.current = null
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 200) { rotatePiece(); return }
    if (Math.abs(dx) > Math.abs(dy)) dx > 0 ? moveRight() : moveLeft()
    else dy > 0 ? (Math.abs(dy) > 60 ? hardDrop() : moveDown()) : rotatePiece()
  }

  // Build display grid
  const display: (string | null)[][] = board.map(r => [...r])
  const gY = piece ? ghostY(boardRef.current, piece) : null

  if (piece && gY !== null) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[0]!.length; c++) {
        if (!piece.shape[r]![c]) continue
        const nr = gY + r, nc = piece.x + c
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && display[nr]![nc] === null)
          display[nr]![nc] = `__ghost__${piece.color}`
      }
  }
  if (piece) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[0]!.length; c++) {
        if (!piece.shape[r]![c]) continue
        const nr = piece.y + r, nc = piece.x + c
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
          display[nr]![nc] = piece.color
      }
  }

  // Next piece preview (4×4 grid)
  const nextDisplay: (string | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))
  const ns = next.shape
  const offR = Math.floor((4 - ns.length) / 2)
  const offC = Math.floor((4 - ns[0]!.length) / 2)
  ns.forEach((row, r) => row.forEach((v, c) => {
    if (v) nextDisplay[offR + r]![offC + c] = next.color
  }))

  const linesForNextLevel = ((level + 1) * 10) - lines
  const levelProgress = Math.min(100, ((lines % 10) / 10) * 100)

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @keyframes tetris-flash {
          0%, 100% { background-color: rgba(255,255,255,0.15); }
          50% { background-color: rgba(255,255,255,0.95); }
        }
        @keyframes score-pop {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 1; transform: translateY(-28px) scale(1.15); }
          100% { opacity: 0; transform: translateY(-52px) scale(0.9); }
        }
        @keyframes level-up {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.9); }
          20%  { opacity: 1; transform: translateY(0) scale(1.05); }
          80%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(4px); }
        }
        @keyframes lock-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes piece-appear {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes board-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-4 select-none py-2 md:py-4 px-2">

        {/* Header */}
        <div className="flex items-center justify-between w-full max-w-[380px]">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-none">Tetris</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
              ← → move · ↑ rotate · ↓ soft drop · Space hard drop · P pause
            </p>
          </div>
          {started && !gameOver && (
            <Button size="sm" variant="outline" onClick={togglePause} className="text-xs">
              {paused ? '▶ Resume' : '⏸ Pause'}
            </Button>
          )}
        </div>

        {/* Game area */}
        <div className="flex gap-3 items-start">

          {/* Board */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: COLS * CELL,
              height: ROWS * CELL,
              background: '#0a0a14',
              boxShadow: '0 0 0 2px #1e1e3a, 0 0 32px rgba(100,80,220,0.25), 0 8px 32px rgba(0,0,0,0.6)',
              animation: gameOver ? 'board-shake 0.4s ease' : undefined,
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Subtle grid lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={COLS * CELL}
              height={ROWS * CELL}
              style={{ opacity: 0.07 }}
            >
              {Array.from({ length: COLS + 1 }, (_, c) => (
                <line key={`v${c}`} x1={c * CELL} y1={0} x2={c * CELL} y2={ROWS * CELL} stroke="white" strokeWidth={1} />
              ))}
              {Array.from({ length: ROWS + 1 }, (_, r) => (
                <line key={`h${r}`} x1={0} y1={r * CELL} x2={COLS * CELL} y2={r * CELL} stroke="white" strokeWidth={1} />
              ))}
            </svg>

            {/* Cells */}
            {display.map((row, r) =>
              row.map((color, c) => {
                const isGhost = typeof color === 'string' && color.startsWith('__ghost__')
                const ghostColor = isGhost ? color.replace('__ghost__', '') : null
                const isFlashing = flashingRows.includes(r)
                const isLocked = lockFlash && !isGhost && color !== null

                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      position: 'absolute',
                      left: c * CELL + 1,
                      top: r * CELL + 1,
                      width: CELL - 2,
                      height: CELL - 2,
                      borderRadius: 3,
                      ...(isFlashing
                        ? {
                            backgroundColor: 'white',
                            animation: 'tetris-flash 0.22s ease infinite',
                            boxShadow: '0 0 12px 4px rgba(255,255,255,0.8)',
                          }
                        : isGhost && ghostColor
                        ? {
                            backgroundColor: ghostColor + '22',
                            border: `1px solid ${ghostColor}66`,
                            borderRadius: 3,
                          }
                        : color
                        ? {
                            backgroundColor: color,
                            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.35), inset 2px 0 0 rgba(255,255,255,0.2), inset -2px 0 0 rgba(0,0,0,0.2), 0 0 6px ${color}55`,
                            animation: isLocked ? 'lock-flash 0.08s ease' : undefined,
                          }
                        : {
                            backgroundColor: 'transparent',
                          }),
                    }}
                  />
                )
              })
            )}

            {/* Score pops */}
            {scorePops.map(p => (
              <div
                key={p.id}
                className="absolute left-1/2 font-extrabold text-white text-lg pointer-events-none z-20"
                style={{
                  top: '40%',
                  transform: 'translateX(-50%)',
                  animation: 'score-pop 0.9s ease forwards',
                  textShadow: '0 0 12px rgba(255,220,0,0.9)',
                  color: p.val >= 800 ? '#FFD700' : p.val >= 300 ? '#A855F7' : '#4ADE80',
                }}
              >
                +{p.val}
              </div>
            ))}

            {/* Level up banner */}
            {levelUpMsg && (
              <div
                className="absolute inset-x-0 top-16 flex items-center justify-center pointer-events-none z-20"
                style={{ animation: 'level-up 1.2s ease forwards' }}
              >
                <div className="bg-purple-600/90 text-white font-extrabold text-lg px-6 py-2 rounded-full shadow-lg"
                  style={{ textShadow: '0 0 20px rgba(168,85,247,0.8)' }}>
                  Level {level}!
                </div>
              </div>
            )}

            {/* Overlays */}
            {!started && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(2px)' }}>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-white tracking-wider mb-1">TETRIS</p>
                  <p className="text-xs text-white/50">Classic block-stacking game</p>
                </div>
                <Button
                  onClick={startGame}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-2 text-base rounded-full"
                  style={{ boxShadow: '0 0 20px rgba(168,85,247,0.5)' }}
                >
                  Start Game
                </Button>
                <p className="text-[11px] text-white/30">or press Enter / Space</p>
              </div>
            )}
            {paused && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(10,10,20,0.88)', backdropFilter: 'blur(3px)' }}>
                <p className="text-3xl font-extrabold text-white tracking-widest">PAUSED</p>
                <Button onClick={togglePause} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-6">
                  ▶ Resume
                </Button>
              </div>
            )}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(3px)' }}>
                <p className="text-3xl font-extrabold text-red-400 tracking-wider">GAME OVER</p>
                <p className="text-white/60 text-sm">Score: <span className="text-white font-bold">{score}</span></p>
                {score >= best && score > 0 && (
                  <p className="text-yellow-400 text-xs font-semibold">🏆 New Best!</p>
                )}
                <Button
                  onClick={startGame}
                  className="mt-1 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 rounded-full"
                  style={{ boxShadow: '0 0 20px rgba(168,85,247,0.5)' }}
                >
                  Play Again
                </Button>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-3 w-[110px]">

            {/* Next piece */}
            <div className="rounded-xl p-3" style={{ background: '#0f0f1e', border: '1px solid #1e1e3a' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">Next</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(4, 18px)`,
                  gap: 2,
                }}
              >
                {nextDisplay.flat().map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      backgroundColor: color ?? 'transparent',
                      boxShadow: color
                        ? `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 4px ${color}44`
                        : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            {[
              { label: 'Score', val: score.toLocaleString() },
              { label: 'Best',  val: best.toLocaleString() },
              { label: 'Lines', val: lines },
              { label: 'Level', val: level + 1 },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-2 text-center"
                style={{ background: '#0f0f1e', border: '1px solid #1e1e3a' }}
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</div>
                <div className="text-base font-extrabold text-white leading-tight mt-0.5">{val}</div>
              </div>
            ))}

            {/* Level progress bar */}
            {started && !gameOver && (
              <div className="rounded-xl px-3 py-2" style={{ background: '#0f0f1e', border: '1px solid #1e1e3a' }}>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                  Next lvl
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e3a' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${levelProgress}%`,
                      background: 'linear-gradient(90deg, #7C3AED, #A855F7)',
                      boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                    }}
                  />
                </div>
                <div className="text-[9px] text-white/30 mt-1 text-center">{linesForNextLevel} lines</div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile touch controls */}
        <div className="flex flex-col items-center gap-2 sm:hidden mt-1">
          <div className="flex gap-3">
            <button
              onPointerDown={moveLeft}
              className="w-14 h-12 rounded-xl text-xl font-bold text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: '#1e1e3a', border: '1px solid #2e2e5a' }}
            >←</button>
            <button
              onPointerDown={rotatePiece}
              className="w-14 h-12 rounded-xl text-xl font-bold text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: '#2d1b69', border: '1px solid #4c1d95' }}
            >↻</button>
            <button
              onPointerDown={moveRight}
              className="w-14 h-12 rounded-xl text-xl font-bold text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: '#1e1e3a', border: '1px solid #2e2e5a' }}
            >→</button>
          </div>
          <div className="flex gap-3">
            <button
              onPointerDown={moveDown}
              className="w-14 h-12 rounded-xl text-xl font-bold text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: '#1e1e3a', border: '1px solid #2e2e5a' }}
            >↓</button>
            <button
              onPointerDown={hardDrop}
              className="w-28 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: '#2d1b69', border: '1px solid #4c1d95', letterSpacing: '0.05em' }}
            >HARD DROP</button>
          </div>
        </div>

      </div>
    </>
  )
}
