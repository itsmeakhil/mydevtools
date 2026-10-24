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
  'secure-files': 'Security',
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
  'data-explorer': 'Database',
  's3-drive': 'Database',
  'bcrypt-generator': 'Security',
  'json-diff': 'Formatters',
  'jsonpath-playground': 'Formatters',
}

export const publicToolSlugs = Object.keys(toolsMetadata)

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
