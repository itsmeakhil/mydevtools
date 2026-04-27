# Break Room Games — Improvement Plan
Generated: 2026-04-27

## 2048

| Priority | Feature | Details |
|----------|---------|---------|
| High | Tile merge animation | Scale + color flash on merge |
| High | Undo button | 1-move undo (store prev board state) |
| Medium | 5x5 / 6x6 modes | Difficulty variation |
| Medium | Swipe momentum | Smoother mobile feel |
| Low | Statistics overlay | Moves made, merges, time per game |
| Low | Share score card | OG image with board state |

## Snake

| Priority | Feature | Details |
|----------|---------|---------|
| High | Difficulty presets | Easy (slow) / Hard (fast) / Infinite (no walls) |
| High | Multi-food mode | 2-3 apples simultaneously |
| Medium | Power-ups | Speed boost, shrink, shield — random spawns |
| Medium | Grid size picker | 15x15 / 20x20 / 30x30 |
| Low | Skin picker | Different snake colors/styles |
| Low | Death replay | Show last 3 seconds of path |

## Tetris

| Priority | Feature | Details |
|----------|---------|---------|
| High | T-spin detection + bonus | T-spin single/double/triple scoring |
| High | DAS / ARR settings | Configurable delayed auto-shift + auto-repeat |
| High | All-spin bonus | Mini spins for other pieces |
| Medium | Marathon / Sprint / Ultra modes | 40-line sprint timer, 2-min ultra |
| Medium | Board skin themes | Classic / Neon / Minimal |
| Low | Replay system | Store input sequence, replay game |
| Low | Statistics panel | Pieces per second, tetris rate, KPP |

## Minesweeper

| Priority | Feature | Details |
|----------|---------|---------|
| High | Custom board mode | User sets rows/cols/mines |
| High | Pause on tab blur | visibilitychange listener stops timer |
| High | Question mark flag | 3-state cycle: unflagged → flagged → ? |
| Medium | No-flag challenge mode | Solve without flagging, time bonus |
| Medium | Seed-based boards | Share a specific board by seed |
| Medium | Win/loss streak counter | Persistent across sessions |
| Low | Heatmap overlay | After win: show probability of each unrevealed cell |
| Low | Chord on hover preview | Highlight cells that would be revealed |

## Sudoku

| Priority | Feature | Details |
|----------|---------|---------|
| CRITICAL | Fix gen bug line 92 | Incorrect modulo in LCG — affects puzzle validity |
| High | Pencil/notes mode | Per-cell candidate numbers (1-9 toggleable) |
| High | Undo/redo stack | Full move history |
| High | Hint system | Reveal 1 correct cell, costs score points |
| High | Pause on blur | Stop timer on visibilitychange |
| Medium | Auto-remove notes | When number placed, clear candidates in row/col/box |
| Medium | Difficulty auto-detect | Show actual difficulty based on techniques needed |
| Medium | Mistake counter | Track errors, optional "3 mistakes = game over" mode |
| Low | Highlight techniques | Show which solving technique applies next |
| Low | Import custom puzzle | Paste 81-char string to play any puzzle |

## Cross-Game

| Feature | Applies To | Details |
|---------|-----------|---------|
| Global leaderboard | All | Backend scores, top-10 per game per difficulty |
| Achievement system | All | "First 2048", "100 line Tetris", "Sub-60s Minesweeper beginner" |
| Daily challenge | 2048, Sudoku, Minesweeper | Same seed for everyone each day |
| Sound effects | All | Muted by default, toggle in header |
| Keyboard shortcut help | All | ? key shows controls overlay |

## Recommended Order
1. Sudoku gen bug fix (correctness)
2. Sudoku pencil mode (highest UX gap)
3. Tetris T-spin + DAS (most requested)
4. Minesweeper custom board
5. Cross-game achievements
