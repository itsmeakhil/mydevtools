'use client'

import dynamic from 'next/dynamic'

const toolLoading = () => (
  <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
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

export const PdfToJpgPanelLazy = dynamic(
  () => import('@/components/pdf-to-jpg/pdf-to-jpg-panel').then(m => m.PdfToJpgPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfSplitterPanelLazy = dynamic(
  () => import('@/components/pdf-splitter/pdf-splitter-panel').then(m => m.PdfSplitterPanel),
  { ssr: false, loading: toolLoading }
)

export const JpgToPdfPanelLazy = dynamic(
  () => import('@/components/jpg-to-pdf/jpg-to-pdf-panel').then(m => m.JpgToPdfPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfCompressorPanelLazy = dynamic(
  () => import('@/components/pdf-compressor/pdf-compressor-panel').then(m => m.PdfCompressorPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfMergePanelLazy = dynamic(
  () => import('@/components/pdf-merge/pdf-merge-panel').then(m => m.PdfMergePanel),
  { ssr: false, loading: toolLoading }
)


export const PdfToPdfaPanelLazy = dynamic(
  () => import('@/components/pdf-to-pdfa/pdf-to-pdfa-panel').then(m => m.PdfToPdfaPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfComparePanelLazy = dynamic(
  () => import('@/components/pdf-compare/pdf-compare-panel').then(m => m.PdfComparePanel),
  { ssr: false, loading: toolLoading }
)

export const PdfWatermarkPanelLazy = dynamic(
  () => import('@/components/pdf-watermark/pdf-watermark-panel').then(m => m.PdfWatermarkPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfUnlockerPanelLazy = dynamic(
  () => import('@/components/pdf-unlocker/pdf-unlocker-panel').then(m => m.PdfUnlockerPanel),
  { ssr: false, loading: toolLoading }
)

export const PdfLockerPanelLazy = dynamic(
  () => import('@/components/pdf-locker/pdf-locker-panel').then(m => m.PdfLockerPanel),
  { ssr: false, loading: toolLoading }
)


export const HtmlToPdfPanelLazy = dynamic(
  () => import('@/components/html-to-pdf/html-to-pdf-panel').then(m => m.HtmlToPdfPanel),
  { ssr: false, loading: toolLoading }
)

export const ExcelToPdfPanelLazy = dynamic(
  () => import('@/components/excel-to-pdf/excel-to-pdf-panel').then(m => m.ExcelToPdfPanel),
  { ssr: false, loading: toolLoading }
)
