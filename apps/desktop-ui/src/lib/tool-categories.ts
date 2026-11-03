import { toolsMetadata } from '@/lib/metadata'

export const toolCategoryMap: Record<string, string> = {
  terminal: 'Developer',
  notes: 'Productivity',
  'snippet-manager': 'Productivity',
  'to-do': 'Productivity',
  'api-keys': 'Security',
  'email-validator': 'Security',
  'environment-manager': 'Security',
  'password-manager': 'Security',
  'secure-files': 'Security',
  'json-formatter': 'Formatters',
  'json-visualizer': 'Formatters',
  'api-client': 'Network & API',
  'data-explorer': 'Database',
  's3-drive': 'Database',
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
