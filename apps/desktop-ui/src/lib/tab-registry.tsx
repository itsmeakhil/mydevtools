'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const loading = () => (
  <div className="h-full w-full min-h-0">
    <div className="h-full min-h-[8rem] w-full bg-muted/20 animate-pulse rounded-lg" />
  </div>
)

// Registry maps route paths to their dynamically-imported page components.
// Each entry is created once at module level so React never sees a new component
// type on re-render (which would cause unwanted remounts).
const TAB_REGISTRY: Record<string, React.ComponentType> = {
  '/app/to-do': dynamic(() => import('@/app/app/to-do/page'), { ssr: false, loading }),
  '/app/notes': dynamic(
    () =>
      Promise.all([
        import('@/app/app/notes/notes-client-layout'),
        import('@/app/app/notes/page'),
      ]).then(([{ default: NotesClientLayout }, { default: NotesPage }]) =>
        function NotesTab() {
          return <NotesClientLayout><NotesPage /></NotesClientLayout>
        }
      ),
    { ssr: false, loading }
  ),
  '/app/password-manager': dynamic(() => import('@/app/app/password-manager/page'), { ssr: false, loading }),
  '/app/secure-files': dynamic(() => import('@/app/app/secure-files/page'), { ssr: false, loading }),
  '/app/environment-manager': dynamic(() => import('@/app/app/environment-manager/page'), { ssr: false, loading }),
  '/app/api-keys': dynamic(() => import('@/app/app/api-keys/page'), { ssr: false, loading }),
  '/app/bookmarks': dynamic(() => import('@/app/app/bookmarks/page'), { ssr: false, loading }),
  '/app/json-formatter': dynamic(() => import('@/app/app/json-formatter/page'), { ssr: false, loading }),
  '/app/json-schema-generator': dynamic(() => import('@/app/app/json-schema-generator/page'), { ssr: false, loading }),
  '/app/api-client': dynamic(() => import('@/app/app/api-client/page'), { ssr: false, loading }),
  '/app/http-status-codes': dynamic(() => import('@/app/app/http-status-codes/page'), { ssr: false, loading }),
  '/app/data-explorer': dynamic(() => import('@/app/app/data-explorer/page'), { ssr: false, loading }),
  '/app/email-validator': dynamic(() => import('@/app/app/email-validator/page'), { ssr: false, loading }),
  '/app/dns-lookup': dynamic(() => import('@/app/app/dns-lookup/page'), { ssr: false, loading }),
  '/app/ip-subnet-calculator': dynamic(() => import('@/app/app/ip-subnet-calculator/page'), { ssr: false, loading }),
  '/app/markdown-preview-html': dynamic(() => import('@/app/app/markdown-preview-html/page'), { ssr: false, loading }),
  '/app/format-converter': dynamic(() => import('@/app/app/format-converter/page'), { ssr: false, loading }),
  '/app/jwt-decoder': dynamic(() => import('@/app/app/jwt-decoder/page'), { ssr: false, loading }),
  '/app/encryption-playground': dynamic(() => import('@/app/app/encryption-playground/page'), { ssr: false, loading }),
  '/app/certificate-pem-decoder': dynamic(() => import('@/app/app/certificate-pem-decoder/page'), { ssr: false, loading }),
  '/app/regex-tester': dynamic(() => import('@/app/app/regex-tester/page'), { ssr: false, loading }),
  '/app/sql-formatter': dynamic(() => import('@/app/app/sql-formatter/page'), { ssr: false, loading }),
  '/app/graphql-formatter': dynamic(() => import('@/app/app/graphql-formatter/page'), { ssr: false, loading }),
  '/app/yaml-formatter': dynamic(() => import('@/app/app/yaml-formatter/page'), { ssr: false, loading }),
  '/app/diff-checker': dynamic(() => import('@/app/app/diff-checker/page'), { ssr: false, loading }),
  '/app/snippet-manager': dynamic(() => import('@/app/app/snippet-manager/page'), { ssr: false, loading }),
  '/app/mime-type-lookup': dynamic(() => import('@/app/app/mime-type-lookup/page'), { ssr: false, loading }),
  '/app/user-agent-parser': dynamic(() => import('@/app/app/user-agent-parser/page'), { ssr: false, loading }),
  '/app/s3-drive': dynamic(() => import('@/app/app/s3-drive/page'), { ssr: false, loading }),
  '/app/curl-to-code': dynamic(() => import('@/app/app/curl-to-code/page'), { ssr: false, loading }),
  '/app/json-to-code': dynamic(() => import('@/app/app/json-to-code/page'), { ssr: false, loading }),
  '/app/json-visualizer': dynamic(() => import('@/app/app/json-visualizer/page'), { ssr: false, loading }),
  '/app/beautify-minify': dynamic(() => import('@/app/app/beautify-minify/page'), { ssr: false, loading }),
  '/app/bcrypt-generator': dynamic(() => import('@/app/app/bcrypt-generator/page'), { ssr: false, loading }),
  '/app/json-diff': dynamic(() => import('@/app/app/json-diff/page'), { ssr: false, loading }),
  '/app/jsonpath-playground': dynamic(() => import('@/app/app/jsonpath-playground/page'), { ssr: false, loading }),
  '/app/websocket-tester': dynamic(() => import('@/app/app/websocket-tester/page'), { ssr: false, loading }),
  '/app/whois-lookup': dynamic(() => import('@/app/app/whois-lookup/page'), { ssr: false, loading }),
}

export function getTabComponent(path: string): React.ComponentType | null {
  return TAB_REGISTRY[path] ?? null
}

export function isRegisteredTab(path: string): boolean {
  return path in TAB_REGISTRY
}
