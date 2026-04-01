'use client';

import { useCallback } from 'react';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '@/database/firebase';
import useAuth from '@/utils/useAuth';

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

  /**
   * Track tool usage locally and optionally in Firebase
   */
  const trackToolUsage = useCallback((toolId: string, url: string) => {
    // Track in localStorage for recently used (works without auth)
    const usage: ToolUsage = {
      toolId,
      timestamp: Date.now(),
      url,
    };

    try {
      const existingHistory = localStorage.getItem(USAGE_STORAGE_KEY);
      let history: ToolUsage[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Remove duplicates and add new entry
      history = history.filter(h => h.toolId !== toolId);
      history.unshift(usage);
      
      // Keep only recent history
      history = history.slice(0, MAX_LOCAL_HISTORY);
      
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error tracking tool usage:', error);
    }

    // Track in Firebase for authenticated users (for analytics)
    if (user?.uid) {
      try {
        const toolStatsRef = doc(db, 'users', user.uid, 'toolStats', toolId);
        updateDoc(toolStatsRef, {
          usageCount: increment(1),
          lastUsed: new Date().toISOString(),
        }).catch(() => {
          // Create document if it doesn't exist
          setDoc(toolStatsRef, {
            usageCount: 1,
            lastUsed: new Date().toISOString(),
            toolId,
          });
        });
      } catch (error) {
        console.error('Error updating tool stats in Firebase:', error);
      }
    }
  }, [user?.uid]);

  /**
   * Get recently used tools from localStorage
   */
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
