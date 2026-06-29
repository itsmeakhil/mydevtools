'use client';

import { useCallback } from 'react';
import { useToolVisibilityStore } from '@/store/tool-visibility-store';
import { useWorkspaceStore } from '@/store/workspace-store';

/**
 * Per-workspace tool visibility. The active workspace's enabled-list is the
 * source of truth; toggling only affects the active workspace.
 */
export function useToolVisibility() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const byWorkspace = useToolVisibilityStore((s) => s.enabledToolsByWorkspace);
  const globalEnabled = useToolVisibilityStore((s) => s.enabledTools);
  const toggleForWorkspace = useToolVisibilityStore((s) => s.toggleToolForWorkspace);
  const toggleGlobal = useToolVisibilityStore((s) => s.toggleTool);

  const enabledTools = activeWorkspaceId
    ? byWorkspace[activeWorkspaceId] ?? globalEnabled
    : globalEnabled;

  const toggleTool = useCallback(
    (toolUrl: string) => {
      if (activeWorkspaceId) toggleForWorkspace(activeWorkspaceId, toolUrl);
      else toggleGlobal(toolUrl);
    },
    [activeWorkspaceId, toggleForWorkspace, toggleGlobal],
  );

  const isToolEnabled = useCallback(
    (toolUrl: string): boolean => enabledTools.includes(toolUrl),
    [enabledTools],
  );

  return {
    enabledTools,
    isToolEnabled,
    toggleTool,
  };
}
