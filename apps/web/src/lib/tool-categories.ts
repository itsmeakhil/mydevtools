import { toolsMetadata } from '@/lib/metadata'

export const toolCategoryMap: Record<string, string> = {
  notes: 'Productivity',
  'snippet-manager': 'Productivity',
  'to-do': 'Productivity',
  'email-validator': 'Security',
  'environment-manager': 'Security',
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
  'sql-client': 'Database',
  'database-explorer': 'Database',
  's3-drive': 'Database',
  'redis-commander': 'Database',
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
