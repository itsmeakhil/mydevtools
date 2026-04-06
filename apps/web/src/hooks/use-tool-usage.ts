'use client';

import { useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import { trackToolUsageApi } from '@/lib/user-preferences-api';

const USAGE_STORAGE_KEY = 'tool-usage-history';
const MAX_LOCAL_HISTORY = 20;

interface ToolUsage {
  toolId: string;
  timestamp: number;
  url: string;
}

/**
 * Hook to track tool usage for analytics and recently used features
 */
export function useToolUsage() {
  const { user } = useAuth(false);

  const trackToolUsage = useCallback((toolId: string, url: string) => {
    const usage: ToolUsage = {
      toolId,
      timestamp: Date.now(),
      url,
    };

    try {
      const existingHistory = localStorage.getItem(USAGE_STORAGE_KEY);
      let history: ToolUsage[] = existingHistory ? JSON.parse(existingHistory) : [];

      history = history.filter(h => h.toolId !== toolId);
      history.unshift(usage);

      history = history.slice(0, MAX_LOCAL_HISTORY);

      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error tracking tool usage:', error);
    }

    if (user?.uid) {
      void trackToolUsageApi(toolId).catch((error) => {
        console.error('Error updating tool stats:', error);
      });
    }
  }, [user?.uid]);

  const getRecentlyUsedTools = useCallback((limit: number = 10): ToolUsage[] => {
    try {
      const history = localStorage.getItem(USAGE_STORAGE_KEY);
      if (!history) return [];

      const usageHistory: ToolUsage[] = JSON.parse(history);
      return usageHistory.slice(0, limit);
    } catch (error) {
      console.error('Error reading tool usage history:', error);
      return [];
    }
  }, []);

  return {
    trackToolUsage,
    getRecentlyUsedTools,
  };
}
