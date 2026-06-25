export type Point = { x: number; y: number }
export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Difficulty = 'easy' | 'normal' | 'hard' | 'infinite'
export type PowerUpType = 'speed' | 'shield' | 'shrink'
export interface PowerUp { type: PowerUpType; x: number; y: number }

export const COLS = 20
export const ROWS = 20
export const CELL = 24
export const BEST_KEY = 'mydevtools-snake-best'
export const FOOD_COUNT = 2

export const DIFFICULTY_CONFIG: Record<Difficulty, { tickStart: number; minTick: number; wrapWalls: boolean }> = {
  easy:     { tickStart: 220, minTick: 110, wrapWalls: false },
  normal:   { tickStart: 150, minTick: 60,  wrapWalls: false },
  hard:     { tickStart: 90,  minTick: 40,  wrapWalls: false },
  infinite: { tickStart: 150, minTick: 80,  wrapWalls: true  },
}

export const POWERUP_EMOJI: Record<PowerUpType, string> = {
  speed: '⚡',
  shield: '🛡️',
  shrink: '✂️',
}

export const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

export function randomFood(snake: Point[], occupied: Point[]): Point {
  let pos: Point
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (
    snake.some(s => s.x === pos.x && s.y === pos.y) ||
    occupied.some(f => f.x === pos.x && f.y === pos.y)
  )
  return pos
}

export function initFoods(snake: Point[]): Point[] {
  const foods: Point[] = []
  for (let i = 0; i < FOOD_COUNT; i++) foods.push(randomFood(snake, foods))
  return foods
}

export function randomPowerUpPos(snake: Point[], foods: Point[]): Point {
  return randomFood(snake, foods)
}

export const INIT_SNAKE: Point[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
