import { toolsMetadata } from '@/lib/metadata'

export const toolCategoryMap: Record<string, string> = {
  'api-client': 'Network & API',
  'data-explorer': 'Data & Storage',
  's3-drive': 'Data & Storage',
  'password-manager': 'Security',
  'api-keys': 'Security',
  'environment-manager': 'Security',
  'secure-files': 'Security',
  notes: 'Productivity',
  'snippet-manager': 'Productivity',
  'to-do': 'Productivity',
  'json-formatter': 'JSON',
  'json-visualizer': 'JSON',
  'email-validator': 'Utilities',
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
