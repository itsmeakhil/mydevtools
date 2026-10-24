import { toolsMetadata } from '@/lib/metadata'

export const toolCategoryMap: Record<string, string> = {
  bookmarks: 'Productivity',
  notes: 'Productivity',
  'snippet-manager': 'Productivity',
  'to-do': 'Productivity',
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
  'api-client': 'Network & API',
  'curl-to-code': 'Network & API',
  'http-status-codes': 'Network & API',
  'ip-subnet-calculator': 'Network & API',
  'user-agent-parser': 'Network & API',
  'mime-type-lookup': 'Network & API',
  'sql-client': 'Database',
  'database-explorer': 'Database',
  's3-drive': 'Database',
  'redis-commander': 'Database',
  'bcrypt-generator': 'Security',
  'json-diff': 'Formatters',
  'jsonpath-playground': 'Formatters',
  'webhook-tester': 'Network & API',
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
