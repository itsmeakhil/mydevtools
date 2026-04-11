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
