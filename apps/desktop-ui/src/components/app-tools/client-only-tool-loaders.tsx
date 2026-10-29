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






