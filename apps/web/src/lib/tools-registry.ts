/**
 * Enhanced tools registry with metadata for search, filtering, and discovery
 */

import { sidebarData } from '@/components/sidebar/data/sidebar-data';
import { ToolMetadata } from './tool-config';
import { requiresAuth } from './tool-config';

/**
 * Extract enhanced metadata from sidebar data
 */
export function getAllToolsMetadata(): ToolMetadata[] {
  const tools: ToolMetadata[] = [];

  sidebarData.navGroups.forEach((group) => {
    group.items.forEach((item) => {
      if (!item.items) {
        // Top-level item
        if (item.url) {
          const url = typeof item.url === 'string' ? item.url : item.url.toString();
          tools.push({
            title: item.title,
            url,
            description: item.description || '',
            tags: extractTags(item.title, item.description || '', group.title),
            category: group.title,
            keywords: extractKeywords(item.title, item.description || ''),
            requiresAuth: requiresAuth(url),
            badge: item.badge,
            featured: false,
          });
        }
      } else {
        // Nested items
        item.items.forEach((subItem) => {
          if (subItem.url) {
            const url = typeof subItem.url === 'string' ? subItem.url : subItem.url.toString();
            tools.push({
              title: subItem.title,
              url,
              description: subItem.description || '',
              tags: extractTags(subItem.title, subItem.description || '', item.title, group.title),
              category: `${group.title} > ${item.title}`,
              keywords: extractKeywords(subItem.title, subItem.description || ''),
              requiresAuth: requiresAuth(url),
              badge: subItem.badge,
              featured: false,
            });
          }
        });
      }
    });
  });

  return tools;
}

/**
 * Extract tags from tool data
 */
function extractTags(title: string, description: string, ...categories: string[]): string[] {
  const tags = new Set<string>();
  
  // Add category tags
  categories.forEach(cat => {
    tags.add(cat.toLowerCase().replace(/\s+/g, '-'));
  });
  
  // Extract common tool types from title/description
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('generator') || text.includes('generate')) tags.add('generator');
  if (text.includes('converter') || text.includes('convert')) tags.add('converter');
  if (text.includes('encrypt') || text.includes('decrypt') || text.includes('hash')) tags.add('crypto');
  if (text.includes('uuid') || text.includes('token') || text.includes('id')) tags.add('identifier');
  if (text.includes('json') || text.includes('xml') || text.includes('yaml')) tags.add('format');
  if (text.includes('url') || text.includes('link')) tags.add('web');
  if (text.includes('text') || text.includes('string')) tags.add('text');
  if (text.includes('image') || text.includes('qr') || text.includes('code')) tags.add('media');
  if (text.includes('network') || text.includes('ip') || text.includes('subnet')) tags.add('network');
  if (text.includes('git') || text.includes('cron') || text.includes('chmod')) tags.add('devops');
  
  return Array.from(tags);
}

/**
 * Extract keywords for search
 */
function extractKeywords(title: string, description: string): string[] {
  const keywords = new Set<string>();
  
  // Add title words
  title.toLowerCase().split(/\s+/).forEach(word => {
    if (word.length > 2) keywords.add(word);
  });
  
  // Add description words
  description.toLowerCase().split(/\s+/).forEach(word => {
    if (word.length > 3) keywords.add(word);
  });
  
  return Array.from(keywords);
}

/**
 * Search tools by query
 */
export function searchTools(query: string, tools?: ToolMetadata[]): ToolMetadata[] {
  const toolsList = tools || getAllToolsMetadata();
  if (!query.trim()) return toolsList;
  
  const lowerQuery = query.toLowerCase();
  
  return toolsList.filter(tool => {
    // Search in title
    if (tool.title.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in description
    if (tool.description.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in tags
    if (tool.tags.some(tag => tag.includes(lowerQuery))) return true;
    
    // Search in keywords
    if (tool.keywords.some(keyword => keyword.includes(lowerQuery))) return true;
    
    return false;
  });
}

/**
 * Filter tools by category
 */
export function filterToolsByCategory(category: string, tools?: ToolMetadata[]): ToolMetadata[] {
  const toolsList = tools || getAllToolsMetadata();
  if (!category) return toolsList;
  
  return toolsList.filter(tool => 
    tool.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Filter tools by tag
 */
export function filterToolsByTag(tag: string, tools?: ToolMetadata[]): ToolMetadata[] {
  const toolsList = tools || getAllToolsMetadata();
  if (!tag) return toolsList;
  
  return toolsList.filter(tool => 
    tool.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  const tools = getAllToolsMetadata();
  
  tools.forEach(tool => {
    categories.add(tool.category);
  });
  
  return Array.from(categories).sort();
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  const tools = getAllToolsMetadata();
  
  tools.forEach(tool => {
    tool.tags.forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).sort();
}
