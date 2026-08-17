import { toolsMetadata } from '@/lib/metadata'

export const toolCategoryMap: Record<string, string> = {
  bookmarks: 'Productivity',
  notes: 'Productivity',
  'snippet-manager': 'Productivity',
  'to-do': 'Productivity',
  'api-keys': 'Security',
  'email-validator': 'Security',
  'environment-manager': 'Security',
  'jwt-decoder': 'Security',
  'certificate-pem-decoder': 'Security',
  'encryption-playground': 'Security',
  'password-manager': 'Security',
  'json-formatter': 'Formatters',
  'json-visualizer': 'Formatters',
  'json-schema-generator': 'Formatters',
  'json-to-code': 'Formatters',
  'beautify-minify': 'Formatters',
  'sql-formatter': 'Formatters',
  'graphql-formatter': 'Formatters',
  'yaml-formatter': 'Formatters',
  'markdown-preview-html': 'Formatters',
  'format-converter': 'Formatters',
  'diff-checker': 'Formatters',
  'regex-tester': 'Formatters',
  base64: 'Converters',
  'url-encode': 'Converters',
  'url-parser': 'Converters',
  'number-base-converter': 'Converters',
  'timestamp-converter': 'Converters',
  'unit-converter': 'Converters',
  'csv-excel-json': 'Converters',
  'image-to-base64': 'Converters',
  'string-case-converter': 'Converters',
  'line-sort-dedupe': 'Converters',
  'string-inspector': 'Converters',
  'escape-encode': 'Converters',
  'uuid-generator': 'Generators',
  'ssh-key-generator': 'Generators',
  'secret-api-key-generator': 'Generators',
  'qr-code-generator': 'Generators',
  'gitignore-generator': 'Generators',
  'docker-compose-generator': 'Generators',
  'lorem-ipsum': 'Generators',
  'mock-data-generator': 'Generators',
  'cron-builder': 'Generators',
  'hash-generator': 'Generators',
  'hmac-generator': 'Generators',
  'totp-generator': 'Generators',
  'api-client': 'Network & API',
  'curl-to-code': 'Network & API',
  'http-status-codes': 'Network & API',
  'ip-subnet-calculator': 'Network & API',
  'user-agent-parser': 'Network & API',
  'mime-type-lookup': 'Network & API',
  'data-explorer': 'Database',
  's3-drive': 'Database',
  'color-picker': 'Media & Design',
  'contrast-checker': 'Media & Design',
  'css-gradient-builder': 'Media & Design',
  'image-compressor': 'Media & Design',
  'svg-optimizer': 'Media & Design',
  'bcrypt-generator': 'Security',
  'chmod-calculator': 'Converters',
  'code-screenshot': 'Media & Design',
  'css-generators': 'Media & Design',
  'exif-viewer': 'Media & Design',
  'favicon-generator': 'Media & Design',
  'json-diff': 'Formatters',
  'jsonpath-playground': 'Formatters',
  'keycode-inspector': 'Media & Design',
  'markdown-table-generator': 'Generators',
  'timezone-converter': 'Converters',
  'token-counter': 'Converters',
  'websocket-tester': 'Network & API',
  'whois-lookup': 'Network & API',
}

export const publicToolSlugs = Object.keys(toolsMetadata).filter(
  (slug) => !slug.startsWith('break-room'),
)

/** Returns up to `limit` sibling tools in the same category, excluding `currentSlug`. */
export function getRelatedTools(
  currentSlug: string,
  limit = 4,
): { slug: string; title: string; description: string }[] {
  const cat = toolCategoryMap[currentSlug]
  if (!cat) return []
  return publicToolSlugs
    .filter((s) => s !== currentSlug && toolCategoryMap[s] === cat)
    .slice(0, limit)
    .map((s) => ({
      slug: s,
      title: toolsMetadata[s].title,
      description: toolsMetadata[s].description,
    }))
}
