'use client';

import { useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import { trackToolUsageApi } from '@/lib/user-preferences-api';
import {
  appendEvent,
  deriveRecents,
  deriveCounts,
  type ToolUsage,
} from '@/lib/tool-usage-utils';

const USAGE_STORAGE_KEY = 'tool-usage-history';

function isValidEvent(e: unknown): e is ToolUsage {
  if (!e || typeof e !== 'object') return false;
  const ev = e as Record<string, unknown>;
  return (
    typeof ev.toolId === 'string' &&
    typeof ev.url === 'string' &&
    typeof ev.timestamp === 'number' &&
    Number.isFinite(ev.timestamp)
  );
}

function readLog(): ToolUsage[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEvent);
  } catch (error) {
    console.error('Error reading tool usage history:', error);
    return [];
  }
}

/**
 * Hook to track tool usage for analytics and recently-used features.
 * Stores an append-only event log (pruned to 90 days / 500 events).
 */
export function useToolUsage() {
  const { user } = useAuth(false);

  const trackToolUsage = useCallback((toolId: string, url: string) => {
    try {
      const next = appendEvent(readLog(), { toolId, url, timestamp: Date.now() });
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Error tracking tool usage:', error);
    }

    if (user?.uid) {
      void trackToolUsageApi(toolId).catch((error) => {
        console.error('Error updating tool stats:', error);
      });
    }
  }, [user?.uid]);

  const getRecentlyUsedTools = useCallback(
    (limit: number = 10): ToolUsage[] => deriveRecents(readLog(), limit),
    [],
  );

  const getUsageEvents = useCallback(
    (): ToolUsage[] => [...readLog()].sort((a, b) => b.timestamp - a.timestamp),
    [],
  );

  const getToolUsageCounts = useCallback(() => deriveCounts(readLog()), []);

  return {
    trackToolUsage,
    getRecentlyUsedTools,
    getUsageEvents,
    getToolUsageCounts,
  };
}
