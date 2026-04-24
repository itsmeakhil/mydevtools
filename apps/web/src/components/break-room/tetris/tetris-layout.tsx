'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 10
const ROWS = 20
const CELL = 36
const BEST_KEY = 'mydevtools-tetris-best'

// ─── Types ────────────────────────────────────────────────────────────────────

type Board = (string | null)[][]
type PieceDef = { shape: number[][]; color: string }
type Piece = PieceDef & { x: number; y: number }

// ─── Pieces ───────────────────────────────────────────────────────────────────

const PIECES: PieceDef[] = [
  { shape: [[1,1,1,1]],           color: '#22D3EE' }, // I – cyan
  { shape: [[1,1],[1,1]],         color: '#FACC15' }, // O – yellow
  { shape: [[0,1,0],[1,1,1]],     color: '#A855F7' }, // T – purple
  { shape: [[1,0],[1,1],[0,1]],   color: '#4ADE80' }, // S – green
  { shape: [[0,1],[1,1],[1,0]],   color: '#F87171' }, // Z – red
  { shape: [[1,0],[1,0],[1,1]],   color: '#60A5FA' }, // J – blue
  { shape: [[0,1],[0,1],[1,1]],   color: '#FB923C' }, // L – orange
]

// ─── 7-bag randomiser ─────────────────────────────────────────────────────────

let bagQueue: number[] = []
function makeBag(): number[] {
  const bag = [0,1,2,3,4,5,6]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}
function nextFromBag(): number {
  if (!bagQueue.length) bagQueue = makeBag()
  return bagQueue.shift()!
}
function randomPiece(): Piece {
  const p = PIECES[nextFromBag()]!
  return { ...p, shape: p.shape.map(r => [...r]), x: Math.floor((COLS - p.shape[0]!.length) / 2), y: 0 }
}

// ─── Engine helpers ───────────────────────────────────────────────────────────

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

const SCORE_TABLE = [0, 100, 300, 500, 800]
function calcScore(lines: number, level: number): number {
  return (SCORE_TABLE[Math.min(lines, 4)] ?? 0) * (level + 1)
}

function ghostY(board: Board, piece: Piece): number {
  let dy = 0
  while (!collides(board, piece, 0, dy + 1)) dy++
  return piece.y + dy
}

// ─── Mini preview grid ────────────────────────────────────────────────────────

function PiecePreview({ piece, size = 22, label }: { piece: PieceDef | null; size?: number; label: string }) {
  const grid: (string | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))
  if (piece) {
    const offR = Math.floor((4 - piece.shape.length) / 2)
    const offC = Math.floor((4 - piece.shape[0]!.length) / 2)
    piece.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) grid[offR + r]![offC + c] = piece.color
    }))
  }
  return (
    <div className="rounded-xl p-3" style={{ background: '#0a0a18', border: '1px solid #1e1e3a' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(4, ${size}px)`, gap: 2 }}>
        {grid.flat().map((color, i) => (
          <div key={i} style={{
            width: size, height: size, borderRadius: 3,
            backgroundColor: color ?? 'rgba(255,255,255,0.03)',
            boxShadow: color
              ? `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3), 0 0 6px ${color}55`
              : undefined,
            transition: 'background-color 0.15s ease',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center" style={{ background: '#0a0a18', border: `1px solid ${highlight ? '#3d1d7a' : '#1e1e3a'}` }}>
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
      <div className="text-lg font-extrabold leading-tight mt-0.5" style={{ color: highlight ? '#C084FC' : 'white' }}>{value}</div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ScorePop { id: number; val: number; label?: string }

export function TetrisLayout() {
  const [board, setBoard]         = useState<Board>(emptyBoard)
  const [piece, setPiece]         = useState<Piece | null>(null)
  const [next, setNext]           = useState<Piece>(() => { bagQueue = []; return randomPiece() })
  const [hold, setHold]           = useState<PieceDef | null>(null)
  const [score, setScore]         = useState(0)
  const [lines, setLines]         = useState(0)
  const [level, setLevel]         = useState(0)
  const [combo, setCombo]         = useState(-1)
  const [best, setBest]           = useState(() =>
    typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)
  )
  const [gameOver, setGameOver]   = useState(false)
  const [started, setStarted]     = useState(false)
  const [paused, setPaused]       = useState(false)
  const [flashRows, setFlashRows] = useState<number[]>([])
  const [scorePops, setScorePops] = useState<ScorePop[]>([])
  const [levelUpMsg, setLevelUpMsg] = useState(false)
  const [lockFlash, setLockFlash] = useState(false)
  const [dropTrail, setDropTrail] = useState<{c: number; yFrom: number; yTo: number} | null>(null)

  const boardRef    = useRef<Board>(emptyBoard())
  const pieceRef    = useRef<Piece | null>(null)
  const nextRef     = useRef<Piece>(next)
  const holdRef     = useRef<PieceDef | null>(null)
  const canHoldRef  = useRef(true)
  const scoreRef    = useRef(0)
  const linesRef    = useRef(0)
  const levelRef    = useRef(0)
  const comboRef    = useRef(-1)
  const gameOverRef = useRef(false)
  const pausedRef   = useRef(false)
  const flashingRef = useRef(false)
  const loopRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popIdRef    = useRef(0)

  const triggerPop = useCallback((val: number, label?: string) => {
    if (val <= 0) return
    const id = ++popIdRef.current
    setScorePops(prev => [...prev, { id, val, label }])
    setTimeout(() => setScorePops(prev => prev.filter(p => p.id !== id)), 1000)
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
    canHoldRef.current = true

    const placed = place(boardRef.current, pieceRef.current)
    const fullRows = findFullRows(placed)

    setLockFlash(true)
    setTimeout(() => setLockFlash(false), 100)

    if (fullRows.length > 0) {
      boardRef.current = placed
      setBoard(placed.map(r => [...r]))
      flashingRef.current = true
      setFlashRows(fullRows)

      setTimeout(() => {
        const { board: cleared, lines: clearedLines } = clearLines(placed)
        boardRef.current = cleared
        setBoard(cleared.map(r => [...r]))
        setFlashRows([])
        flashingRef.current = false

        const prevLevel = levelRef.current
        const newCombo = comboRef.current + 1
        const newLines = linesRef.current + clearedLines
        const newLevel = Math.floor(newLines / 10)
        const baseGain = calcScore(clearedLines, levelRef.current)
        const comboBonus = newCombo > 0 ? newCombo * 50 * (levelRef.current + 1) : 0
        const newScore = scoreRef.current + baseGain + comboBonus

        comboRef.current = newCombo
        linesRef.current = newLines
        levelRef.current = newLevel
        scoreRef.current = newScore

        setCombo(newCombo)
        setLines(newLines)
        setLevel(newLevel)
        setScore(newScore)
        triggerPop(baseGain, clearedLines === 4 ? 'TETRIS!' : undefined)
        if (comboBonus > 0) triggerPop(comboBonus, `${newCombo}× COMBO`)

        if (newLevel > prevLevel) {
          setLevelUpMsg(true)
          setTimeout(() => setLevelUpMsg(false), 1400)
        }
        if (newScore > parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)) {
          localStorage.setItem(BEST_KEY, String(newScore))
          setBest(newScore)
        }

        pieceRef.current = null
        setPiece(null)
        spawnPiece()
      }, 230)
    } else {
      comboRef.current = -1
      setCombo(-1)
      boardRef.current = placed
      setBoard(placed.map(r => [...r]))
      pieceRef.current = null
      setPiece(null)
      spawnPiece()
    }
  }, [spawnPiece, triggerPop])

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
    loopRef.current = setTimeout(tick, Math.max(55, 500 - levelRef.current * 42))
  }, [spawnPiece, lockAndSpawn])

  const startGame = useCallback(() => {
    bagQueue = []
    const b = emptyBoard(), p = randomPiece(), n = randomPiece()
    boardRef.current = b; pieceRef.current = p; nextRef.current = n
    holdRef.current = null; canHoldRef.current = true
    scoreRef.current = 0; linesRef.current = 0; levelRef.current = 0; comboRef.current = -1
    gameOverRef.current = false; pausedRef.current = false; flashingRef.current = false
    setBoard(b); setPiece(p); setNext(n); setHold(null)
    setScore(0); setLines(0); setLevel(0); setCombo(-1)
    setGameOver(false); setPaused(false)
    setFlashRows([]); setScorePops([]); setLevelUpMsg(false); setDropTrail(null)
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
    } else lockAndSpawn()
  }, [lockAndSpawn])

  const rotatePiece = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    const rotated = rotate(pieceRef.current.shape)
    let dx = 0
    if (collides(boardRef.current, pieceRef.current, 0, 0, rotated)) {
      dx = 1
      if (collides(boardRef.current, pieceRef.current, 1, 0, rotated)) {
        dx = -2
        if (collides(boardRef.current, pieceRef.current, -2, 0, rotated)) {
          dx = 2
          if (collides(boardRef.current, pieceRef.current, 2, 0, rotated)) return
        }
      }
    }
    pieceRef.current = { ...pieceRef.current, shape: rotated, x: pieceRef.current.x + dx }
    setPiece({ ...pieceRef.current })
  }, [])

  const hardDrop = useCallback(() => {
    if (!pieceRef.current || pausedRef.current || flashingRef.current) return
    const p = pieceRef.current
    let dy = 0
    while (!collides(boardRef.current, p, 0, dy + 1)) dy++
    // Show drop trail
    setDropTrail({ c: p.x, yFrom: p.y, yTo: p.y + dy })
    setTimeout(() => setDropTrail(null), 160)
    pieceRef.current = { ...p, y: p.y + dy }
    lockAndSpawn()
  }, [lockAndSpawn])

  const holdPiece = useCallback(() => {
    if (!pieceRef.current || !canHoldRef.current || pausedRef.current || flashingRef.current) return
    canHoldRef.current = false
    const current: PieceDef = { shape: pieceRef.current.shape, color: pieceRef.current.color }
    const prev = holdRef.current
    holdRef.current = current
    setHold(current)

    if (prev) {
      const spawned: Piece = { ...prev, shape: prev.shape.map(r => [...r]), x: Math.floor((COLS - prev.shape[0]!.length) / 2), y: 0 }
      if (collides(boardRef.current, spawned)) { gameOverRef.current = true; setGameOver(true); return }
      pieceRef.current = spawned
      setPiece({ ...spawned })
    } else {
      pieceRef.current = null
      setPiece(null)
      spawnPiece()
    }
  }, [spawnPiece])

  const togglePause = useCallback(() => {
    if (!started || gameOverRef.current) return
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
    if (!pausedRef.current) loopRef.current = setTimeout(tick, Math.max(55, 500 - levelRef.current * 42))
  }, [started, tick])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started) { if (e.key === 'Enter' || e.key === ' ') startGame(); return }
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); moveLeft(); break
        case 'ArrowRight': e.preventDefault(); moveRight(); break
        case 'ArrowDown':  e.preventDefault(); moveDown(); break
        case 'ArrowUp':    e.preventDefault(); rotatePiece(); break
        case ' ':          e.preventDefault(); hardDrop(); break
        case 'c': case 'C': holdPiece(); break
        case 'Shift':      e.preventDefault(); holdPiece(); break
        case 'p': case 'P': togglePause(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, startGame, moveLeft, moveRight, moveDown, rotatePiece, hardDrop, holdPiece, togglePause])

  useEffect(() => () => { if (loopRef.current) clearTimeout(loopRef.current) }, [])

  // Touch
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
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 200) { rotatePiece(); return }
    if (Math.abs(dx) > Math.abs(dy)) dx > 0 ? moveRight() : moveLeft()
    else dy > 0 ? (Math.abs(dy) > 80 ? hardDrop() : moveDown()) : rotatePiece()
  }

  // Build display
  const display: (string | null)[][] = board.map(r => [...r])
  const gY = piece ? ghostY(boardRef.current, piece) : null
  const ghostCells = new Set<string>()

  if (piece && gY !== null && gY !== piece.y) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[0]!.length; c++) {
        if (!piece.shape[r]![c]) continue
        const nr = gY + r, nc = piece.x + c
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && display[nr]![nc] === null) {
          display[nr]![nc] = `__ghost__${piece.color}`
          ghostCells.add(`${nr},${nc}`)
        }
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

  const levelProgress = Math.min(100, (lines % 10) / 10 * 100)

  const BOARD_W = COLS * CELL
  const BOARD_H = ROWS * CELL
  const PANEL_W = 130

  return (
    <>
      <style>{`
        @keyframes t-flash {
          0%,100% { background-color: rgba(255,255,255,0.12); }
          50%      { background-color: rgba(255,255,255,0.98); box-shadow: 0 0 20px 6px rgba(255,255,255,0.7); }
        }
        @keyframes t-score-pop {
          0%   { opacity:0; transform: translateX(-50%) translateY(0) scale(0.8); }
          15%  { opacity:1; transform: translateX(-50%) translateY(-10px) scale(1.1); }
          75%  { opacity:1; transform: translateX(-50%) translateY(-36px) scale(1); }
          100% { opacity:0; transform: translateX(-50%) translateY(-56px) scale(0.9); }
        }
        @keyframes t-level-up {
          0%   { opacity:0; transform: translateX(-50%) translateY(-12px) scale(0.85); }
          18%  { opacity:1; transform: translateX(-50%) translateY(0) scale(1.06); }
          80%  { opacity:1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity:0; transform: translateX(-50%) translateY(8px); }
        }
        @keyframes t-lock {
          0%,100% { filter: brightness(1); }
          40%      { filter: brightness(2.2); }
        }
        @keyframes t-shake {
          0%,100% { transform: translateX(0); }
          15%  { transform: translateX(-5px); }
          35%  { transform: translateX(5px); }
          55%  { transform: translateX(-4px); }
          75%  { transform: translateX(4px); }
        }
        @keyframes t-drop-trail {
          0%   { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes t-gameover-fill {
          from { clip-path: inset(100% 0 0 0); }
          to   { clip-path: inset(0% 0 0 0); }
        }
        @keyframes t-hold-flash {
          0%,100% { border-color: #3d1d7a; }
          50%     { border-color: #a855f7; box-shadow: 0 0 16px rgba(168,85,247,0.6); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-3 select-none py-2 md:py-4 px-2">

        {/* Header */}
        <div style={{ width: BOARD_W + PANEL_W * 2 + 24, maxWidth: '100%' }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-none">Tetris</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
              ← → · ↑ rotate · Space drop · C hold · P pause
            </p>
          </div>
          {started && !gameOver && (
            <Button size="sm" variant="outline" onClick={togglePause} className="text-xs">
              {paused ? '▶ Resume' : '⏸ Pause'}
            </Button>
          )}
        </div>

        {/* Game area: hold | board | stats */}
        <div className="flex gap-3 items-start">

          {/* Left panel – HOLD */}
          <div className="flex flex-col gap-3" style={{ width: PANEL_W }}>
            <div style={{ animation: !canHoldRef.current && started ? 'none' : undefined }}>
              <PiecePreview piece={hold} size={22} label="Hold (C)" />
            </div>
            {/* Controls hint */}
            <div className="rounded-xl p-3 hidden sm:block" style={{ background: '#0a0a18', border: '1px solid #1e1e3a' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Controls</div>
              {[['← →','Move'],['↑','Rotate'],['↓','Soft drop'],['Space','Hard drop'],['C / ⇧','Hold'],['P','Pause']].map(([k,v]) => (
                <div key={k} className="flex justify-between text-[10px] mb-0.5">
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{k}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Board */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: BOARD_W, height: BOARD_H,
              background: '#06060f',
              boxShadow: '0 0 0 2px #1a1a35, 0 0 40px rgba(90,60,220,0.3), 0 12px 40px rgba(0,0,0,0.7)',
              animation: gameOver ? 't-shake 0.45s ease' : undefined,
              flexShrink: 0,
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Grid lines */}
            <svg className="absolute inset-0 pointer-events-none" width={BOARD_W} height={BOARD_H} style={{ opacity: 0.055 }}>
              {Array.from({ length: COLS + 1 }, (_, c) => (
                <line key={`v${c}`} x1={c*CELL} y1={0} x2={c*CELL} y2={BOARD_H} stroke="white" strokeWidth={1} />
              ))}
              {Array.from({ length: ROWS + 1 }, (_, r) => (
                <line key={`h${r}`} x1={0} y1={r*CELL} x2={BOARD_W} y2={r*CELL} stroke="white" strokeWidth={1} />
              ))}
            </svg>

            {/* Drop trail */}
            {dropTrail && piece && (
              <>
                {piece.shape[0]!.map((_, sc) => {
                  const nc = dropTrail.c + sc
                  if (nc < 0 || nc >= COLS) return null
                  return (
                    <div key={sc} style={{
                      position: 'absolute',
                      left: nc * CELL + 2,
                      top: dropTrail.yFrom * CELL,
                      width: CELL - 4,
                      height: (dropTrail.yTo - dropTrail.yFrom) * CELL,
                      borderRadius: 4,
                      backgroundColor: piece.color,
                      opacity: 0.25,
                      animation: 't-drop-trail 0.16s ease forwards',
                      pointerEvents: 'none',
                    }} />
                  )
                })}
              </>
            )}

            {/* Cells */}
            {display.map((row, r) =>
              row.map((color, c) => {
                const isGhost = typeof color === 'string' && color.startsWith('__ghost__')
                const ghostColor = isGhost ? color.replace('__ghost__', '') : null
                const isFlashing = flashRows.includes(r)
                const isLocked = lockFlash && !isGhost && color !== null && !isFlashing

                return (
                  <div key={`${r}-${c}`} style={{
                    position: 'absolute',
                    left: c * CELL + 1, top: r * CELL + 1,
                    width: CELL - 2, height: CELL - 2,
                    borderRadius: 4,
                    ...(isFlashing ? {
                      backgroundColor: 'white',
                      animation: 't-flash 0.23s ease infinite',
                    } : isGhost && ghostColor ? {
                      backgroundColor: ghostColor + '18',
                      border: `1.5px solid ${ghostColor}50`,
                    } : color ? {
                      backgroundColor: color,
                      boxShadow: `inset 0 3px 0 rgba(255,255,255,0.38), inset 0 -3px 0 rgba(0,0,0,0.38), inset 3px 0 0 rgba(255,255,255,0.18), inset -3px 0 0 rgba(0,0,0,0.28), 0 0 8px ${color}44`,
                      animation: isLocked ? 't-lock 0.1s ease' : undefined,
                    } : {
                      backgroundColor: 'transparent',
                    }),
                  }} />
                )
              })
            )}

            {/* Score pops */}
            {scorePops.map(p => (
              <div key={p.id} style={{
                position: 'absolute', left: '50%', top: '38%',
                animation: 't-score-pop 1s ease forwards',
                pointerEvents: 'none', zIndex: 20, whiteSpace: 'nowrap',
                fontWeight: 900, fontSize: p.label ? 15 : 20,
                textShadow: '0 0 16px currentColor',
                color: p.val >= 800 ? '#FFD700' : p.val >= 300 ? '#C084FC' : '#4ADE80',
              }}>
                {p.label ?? `+${p.val.toLocaleString()}`}
              </div>
            ))}

            {/* Level up */}
            {levelUpMsg && (
              <div style={{
                position: 'absolute', left: '50%', top: '28%',
                animation: 't-level-up 1.4s ease forwards',
                pointerEvents: 'none', zIndex: 21, whiteSpace: 'nowrap',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6d28d9, #a855f7)',
                  color: 'white', fontWeight: 900, fontSize: 18,
                  padding: '8px 22px', borderRadius: 999,
                  boxShadow: '0 0 30px rgba(168,85,247,0.7)',
                  textShadow: '0 0 20px rgba(255,255,255,0.5)',
                }}>
                  ↑ Level {level + 1}!
                </div>
              </div>
            )}

            {/* Start overlay */}
            {!started && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                style={{ background: 'rgba(6,6,15,0.94)', backdropFilter: 'blur(3px)' }}>
                <div className="text-center">
                  <p className="font-extrabold text-white tracking-[0.25em]" style={{ fontSize: 42, textShadow: '0 0 40px rgba(168,85,247,0.8)' }}>TETRIS</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Stack blocks · Clear lines · Level up</p>
                </div>
                <Button onClick={startGame}
                  className="font-bold px-10 py-2.5 text-base rounded-full text-white border-0"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 0 28px rgba(168,85,247,0.55)' }}>
                  Start Game
                </Button>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Enter or Space to begin</p>
              </div>
            )}

            {/* Paused */}
            {paused && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ background: 'rgba(6,6,15,0.9)', backdropFilter: 'blur(4px)' }}>
                <p className="font-extrabold text-white tracking-widest" style={{ fontSize: 36 }}>PAUSED</p>
                <Button onClick={togglePause} className="rounded-full px-8 text-white border-0"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)' }}>
                  ▶ Resume
                </Button>
              </div>
            )}

            {/* Game over */}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(6,6,15,0.93)', backdropFilter: 'blur(4px)', animation: 't-gameover-fill 0.5s ease forwards' }}>
                <p className="font-extrabold tracking-wider" style={{ fontSize: 38, color: '#F87171', textShadow: '0 0 30px rgba(248,113,113,0.7)' }}>GAME OVER</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  Score: <span style={{ color: 'white', fontWeight: 700 }}>{score.toLocaleString()}</span>
                </p>
                {score > 0 && score >= best && (
                  <p style={{ color: '#FFD700', fontSize: 13, fontWeight: 600 }}>🏆 New Best!</p>
                )}
                <Button onClick={startGame} className="mt-1 rounded-full px-10 font-bold text-white border-0"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 0 24px rgba(168,85,247,0.5)' }}>
                  Play Again
                </Button>
              </div>
            )}
          </div>

          {/* Right panel – NEXT + STATS */}
          <div className="flex flex-col gap-3" style={{ width: PANEL_W }}>
            <PiecePreview piece={next} size={22} label="Next" />

            <StatCard label="Score" value={score.toLocaleString()} />
            <StatCard label="Best"  value={best.toLocaleString()} />
            <StatCard label="Lines" value={lines} />
            <StatCard label="Level" value={level + 1} highlight />

            {/* Level bar */}
            {started && !gameOver && (
              <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a18', border: '1px solid #1e1e3a' }}>
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <span>Progress</span>
                  <span>{10 - (lines % 10)} left</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#12122a' }}>
                  <div className="h-full rounded-full transition-all duration-300 ease-out" style={{
                    width: `${levelProgress}%`,
                    background: 'linear-gradient(90deg, #6d28d9, #c084fc)',
                    boxShadow: '0 0 8px rgba(168,85,247,0.7)',
                  }} />
                </div>
              </div>
            )}

            {/* Combo */}
            {combo > 0 && (
              <div className="rounded-xl px-3 py-2 text-center" style={{
                background: 'linear-gradient(135deg, #1a0a3a, #2d1b69)',
                border: '1px solid #4c1d95',
                boxShadow: '0 0 14px rgba(168,85,247,0.35)',
              }}>
                <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(192,132,252,0.7)' }}>Combo</div>
                <div className="font-extrabold" style={{ fontSize: 22, color: '#C084FC', textShadow: '0 0 16px rgba(192,132,252,0.8)' }}>
                  {combo}×
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex flex-col items-center gap-2 sm:hidden mt-2">
          <div className="flex gap-2">
            {[
              { label: '←', action: moveLeft, w: 56 },
              { label: '↻', action: rotatePiece, w: 56, accent: true },
              { label: '→', action: moveRight, w: 56 },
            ].map(({ label, action, w, accent }) => (
              <button key={label} onPointerDown={action}
                className="h-12 rounded-xl font-bold text-xl text-white flex items-center justify-center active:scale-95 transition-transform"
                style={{ width: w, background: accent ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : '#0f0f22', border: `1px solid ${accent ? '#6d28d9' : '#1e1e3a'}` }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { label: '↓', action: moveDown, w: 56 },
              { label: 'C', action: holdPiece, w: 56, accent: true },
              { label: 'DROP', action: hardDrop, w: 92, accent: true },
            ].map(({ label, action, w, accent }) => (
              <button key={label} onPointerDown={action}
                className="h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center active:scale-95 transition-transform"
                style={{ width: w, background: accent ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : '#0f0f22', border: `1px solid ${accent ? '#6d28d9' : '#1e1e3a'}`, letterSpacing: '0.05em' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
