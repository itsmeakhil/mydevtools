/**
 * Centralized configuration for all tools
 * Single source of truth for authentication requirements and tool metadata
 */

export const AUTH_REQUIRED_URLS = [
  '/app/to-do',
] as const;

/**
 * Check if a URL requires authentication
 */
export function requiresAuth(url: string): boolean {
  // Check exact matches
  return AUTH_REQUIRED_URLS.some(authUrl => authUrl === url);
}

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
  requiresAuth: boolean;
  featured?: boolean;
  badge?: string;
}

/**
 * Get all auth-required URLs as a readonly array
 */
export function getAuthRequiredUrls(): readonly string[] {
  return AUTH_REQUIRED_URLS;
}
