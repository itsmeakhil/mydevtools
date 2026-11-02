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

export const JsonFormatterLayoutLazy = dynamic(
  () =>
    import('@/components/json-formatter/json-formatter-layout').then(
      m => m.JsonFormatterLayout
    ),
  { ssr: false, loading: toolLoading }
)






