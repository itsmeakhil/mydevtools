'use client'

import dynamic from 'next/dynamic'

const toolLoading = () => (
  <div className="flex h-full min-h-[8rem] w-full min-w-0 items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <span className="mdt-tool-spinner" aria-hidden />
      <span className="text-xs font-medium text-muted-foreground">Loading tool…</span>
    </div>
  </div>
)

export const ApiClientLazy = dynamic(
  () => import('@/components/api-client/api-client').then(m => m.ApiClient),
  { ssr: false, loading: toolLoading }
)

export const ColorPickerToolLayoutLazy = dynamic(
  () =>
    import('@/components/color-picker-tool/color-picker-tool-layout').then(
      m => m.ColorPickerToolLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const ContrastCheckerToolLayoutLazy = dynamic(
  () =>
    import('@/components/contrast-checker-tool/contrast-checker-tool-layout').then(
      m => m.ContrastCheckerToolLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const CronBuilderLayoutLazy = dynamic(
  () =>
    import('@/components/cron-builder/cron-builder-layout').then(
      m => m.CronBuilderLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const DiffCheckerLayoutLazy = dynamic(
  () =>
    import('@/components/diff-checker/diff-checker-layout').then(
      m => m.DiffCheckerLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const JsonFormatterLayoutLazy = dynamic(
  () =>
    import('@/components/json-formatter/json-formatter-layout').then(
      m => m.JsonFormatterLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const JsonSchemaGeneratorLayoutLazy = dynamic(
  () =>
    import('@/components/json-schema-generator/json-schema-generator-layout').then(
      m => m.JsonSchemaGeneratorLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const SqlFormatterLayoutLazy = dynamic(
  () =>
    import('@/components/sql-formatter/sql-formatter-layout').then(
      m => m.SqlFormatterLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const GraphqlFormatterLayoutLazy = dynamic(
  () =>
    import('@/components/graphql-formatter/graphql-formatter-layout').then(
      m => m.GraphqlFormatterLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const YamlFormatterLayoutLazy = dynamic(
  () =>
    import('@/components/yaml-formatter/yaml-formatter-layout').then(
      m => m.YamlFormatterLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const Game2048LayoutLazy = dynamic(
  () =>
    import('@/components/break-room/2048/game-2048-layout').then(
      m => m.Game2048Layout
    ),
  { ssr: false, loading: toolLoading }
)

export const SudokuLayoutLazy = dynamic(
  () =>
    import('@/components/break-room/sudoku/sudoku-layout').then(
      m => m.SudokuLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const SnakeLayoutLazy = dynamic(
  () =>
    import('@/components/break-room/snake/snake-layout').then(
      m => m.SnakeLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const MinesweeperLayoutLazy = dynamic(
  () =>
    import('@/components/break-room/minesweeper/minesweeper-layout').then(
      m => m.MinesweeperLayout
    ),
  { ssr: false, loading: toolLoading }
)

export const TetrisLayoutLazy = dynamic(
  () =>
    import('@/components/break-room/tetris/tetris-layout').then(
      m => m.TetrisLayout
    ),
  { ssr: false, loading: toolLoading }
)

