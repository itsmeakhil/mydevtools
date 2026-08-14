/**
 * Centralized configuration for all tools.
 * Single source of truth for tool metadata.
 */

/**
 * Tool metadata for enhanced discovery and search
 */
export interface ToolMetadata {
  title: string;
  url: string;
  description: string;
  tags: string[];
  category: string;
  keywords: string[];
  featured?: boolean;
  badge?: string;
}
