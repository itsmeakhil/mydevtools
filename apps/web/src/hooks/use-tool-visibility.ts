'use client';

import { useCallback } from 'react';
import { useToolVisibilityStore } from '@/store/tool-visibility-store';

/**
 * Read/update enabled tools in the sidebar. Load/save to the API is handled by
 * `ToolVisibilityPreferencesSync` in the root layout so login only triggers GET, not PATCH.
 */
export function useToolVisibility() {
  const { enabledTools, toggleTool: storeToggleTool } = useToolVisibilityStore();

  const toggleTool = useCallback((toolUrl: string) => {
    storeToggleTool(toolUrl);
  }, [storeToggleTool]);

  const isToolEnabled = useCallback((toolUrl: string): boolean => {
    return enabledTools.includes(toolUrl);
  }, [enabledTools]);

  return {
    enabledTools,
    isToolEnabled,
    toggleTool,
  };
}
