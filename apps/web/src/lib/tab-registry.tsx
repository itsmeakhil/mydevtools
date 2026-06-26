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
  '/app/environment-manager': dynamic(() => import('@/app/app/environment-manager/page'), { ssr: false, loading }),
  '/app/api-keys': dynamic(() => import('@/app/app/api-keys/page'), { ssr: false, loading }),
  '/app/bookmarks': dynamic(() => import('@/app/app/bookmarks/page'), { ssr: false, loading }),
  '/app/base64': dynamic(() => import('@/app/app/base64/page'), { ssr: false, loading }),
  '/app/number-base-converter': dynamic(() => import('@/app/app/number-base-converter/page'), { ssr: false, loading }),
  '/app/image-to-base64': dynamic(() => import('@/app/app/image-to-base64/page'), { ssr: false, loading }),
  '/app/image-compressor': dynamic(() => import('@/app/app/image-compressor/page'), { ssr: false, loading }),
  '/app/json-formatter': dynamic(() => import('@/app/app/json-formatter/page'), { ssr: false, loading }),
  '/app/json-schema-generator': dynamic(() => import('@/app/app/json-schema-generator/page'), { ssr: false, loading }),
  '/app/api-client': dynamic(() => import('@/app/app/api-client/page'), { ssr: false, loading }),
  '/app/http-status-codes': dynamic(() => import('@/app/app/http-status-codes/page'), { ssr: false, loading }),
  '/app/database-explorer': dynamic(() => import('@/app/app/database-explorer/page'), { ssr: false, loading }),
  '/app/email-validator': dynamic(() => import('@/app/app/email-validator/page'), { ssr: false, loading }),
  '/app/url-encode': dynamic(() => import('@/app/app/url-encode/page'), { ssr: false, loading }),
  '/app/uuid-generator': dynamic(() => import('@/app/app/uuid-generator/page'), { ssr: false, loading }),
  '/app/secret-api-key-generator': dynamic(() => import('@/app/app/secret-api-key-generator/page'), { ssr: false, loading }),
  '/app/qr-code-generator': dynamic(() => import('@/app/app/qr-code-generator/page'), { ssr: false, loading }),
  '/app/dns-lookup': dynamic(() => import('@/app/app/dns-lookup/page'), { ssr: false, loading }),
  '/app/ip-subnet-calculator': dynamic(() => import('@/app/app/ip-subnet-calculator/page'), { ssr: false, loading }),
  '/app/hash-generator': dynamic(() => import('@/app/app/hash-generator/page'), { ssr: false, loading }),
  '/app/hmac-generator': dynamic(() => import('@/app/app/hmac-generator/page'), { ssr: false, loading }),
  '/app/totp-generator': dynamic(() => import('@/app/app/totp-generator/page'), { ssr: false, loading }),
  '/app/markdown-preview-html': dynamic(() => import('@/app/app/markdown-preview-html/page'), { ssr: false, loading }),
  '/app/format-converter': dynamic(() => import('@/app/app/format-converter/page'), { ssr: false, loading }),
  '/app/lorem-ipsum': dynamic(() => import('@/app/app/lorem-ipsum/page'), { ssr: false, loading }),
  '/app/color-picker': dynamic(() => import('@/app/app/color-picker/page'), { ssr: false, loading }),
  '/app/contrast-checker': dynamic(() => import('@/app/app/contrast-checker/page'), { ssr: false, loading }),
  '/app/css-gradient-builder': dynamic(() => import('@/app/app/css-gradient-builder/page'), { ssr: false, loading }),
  '/app/gitignore-generator': dynamic(() => import('@/app/app/gitignore-generator/page'), { ssr: false, loading }),
  '/app/docker-compose-generator': dynamic(() => import('@/app/app/docker-compose-generator/page'), { ssr: false, loading }),
  '/app/jwt-decoder': dynamic(() => import('@/app/app/jwt-decoder/page'), { ssr: false, loading }),
  '/app/encryption-playground': dynamic(() => import('@/app/app/encryption-playground/page'), { ssr: false, loading }),
  '/app/certificate-pem-decoder': dynamic(() => import('@/app/app/certificate-pem-decoder/page'), { ssr: false, loading }),
  '/app/ssh-key-generator': dynamic(() => import('@/app/app/ssh-key-generator/page'), { ssr: false, loading }),
  '/app/regex-tester': dynamic(() => import('@/app/app/regex-tester/page'), { ssr: false, loading }),
  '/app/timestamp-converter': dynamic(() => import('@/app/app/timestamp-converter/page'), { ssr: false, loading }),
  '/app/cron-builder': dynamic(() => import('@/app/app/cron-builder/page'), { ssr: false, loading }),
  '/app/sql-formatter': dynamic(() => import('@/app/app/sql-formatter/page'), { ssr: false, loading }),
  '/app/graphql-formatter': dynamic(() => import('@/app/app/graphql-formatter/page'), { ssr: false, loading }),
  '/app/yaml-formatter': dynamic(() => import('@/app/app/yaml-formatter/page'), { ssr: false, loading }),
  '/app/diff-checker': dynamic(() => import('@/app/app/diff-checker/page'), { ssr: false, loading }),
  '/app/csv-excel-json': dynamic(() => import('@/app/app/csv-excel-json/page'), { ssr: false, loading }),
  '/app/snippet-manager': dynamic(() => import('@/app/app/snippet-manager/page'), { ssr: false, loading }),
  '/app/mock-data-generator': dynamic(() => import('@/app/app/mock-data-generator/page'), { ssr: false, loading }),
  '/app/unit-converter': dynamic(() => import('@/app/app/unit-converter/page'), { ssr: false, loading }),
  '/app/svg-optimizer': dynamic(() => import('@/app/app/svg-optimizer/page'), { ssr: false, loading }),
  '/app/mime-type-lookup': dynamic(() => import('@/app/app/mime-type-lookup/page'), { ssr: false, loading }),
  '/app/url-parser': dynamic(() => import('@/app/app/url-parser/page'), { ssr: false, loading }),
  '/app/user-agent-parser': dynamic(() => import('@/app/app/user-agent-parser/page'), { ssr: false, loading }),
  '/app/sql-client': dynamic(() => import('@/app/app/sql-client/page'), { ssr: false, loading }),
  '/app/s3-drive': dynamic(() => import('@/app/app/s3-drive/page'), { ssr: false, loading }),
  '/app/redis-commander': dynamic(() => import('@/app/app/redis-commander/page'), { ssr: false, loading }),
  '/app/url-shortener': dynamic(() => import('@/app/app/url-shortener/page'), { ssr: false, loading }),
  '/app/break-room/2048': dynamic(() => import('@/app/app/break-room/2048/page'), { ssr: false, loading }),
  '/app/break-room/sudoku': dynamic(() => import('@/app/app/break-room/sudoku/page'), { ssr: false, loading }),
  '/app/break-room/snake': dynamic(() => import('@/app/app/break-room/snake/page'), { ssr: false, loading }),
  '/app/break-room/minesweeper': dynamic(() => import('@/app/app/break-room/minesweeper/page'), { ssr: false, loading }),
  '/app/break-room/tetris': dynamic(() => import('@/app/app/break-room/tetris/page'), { ssr: false, loading }),
}

export function getTabComponent(path: string): React.ComponentType | null {
  return TAB_REGISTRY[path] ?? null
}

export function isRegisteredTab(path: string): boolean {
  return path in TAB_REGISTRY
}
