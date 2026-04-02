'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useAuth from '@/utils/useAuth';
import { useToolVisibilityStore, DEFAULT_ENABLED_TOOLS } from '@/store/tool-visibility-store';
import { getUserPreferences, patchUserPreferences } from '@/lib/user-preferences-api';

/**
 * Hook to manage which tools are visible/enabled in the sidebar navigation.
 * Defaults to Tasks, Notes, and Password Manager to keep the interface clean.
 */
export function useToolVisibility() {
  const { user, loading: authLoading } = useAuth(false);
  const { enabledTools, setEnabledTools, toggleTool: storeToggleTool } = useToolVisibilityStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const loadPreferences = async () => {
      if (authLoading) return;

      if (user?.uid) {
        setIsLoading(true);
        try {
          const data = await getUserPreferences();
          if (Array.isArray(data.enabledTools)) {
            setEnabledTools(data.enabledTools);
          } else {
            setEnabledTools(DEFAULT_ENABLED_TOOLS);
          }
          setInitialized(true);
        } catch (error) {
          console.error("Error loading tool visibility preferences:", error);
          setEnabledTools(DEFAULT_ENABLED_TOOLS);
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          const hasHydrated = (useToolVisibilityStore as any).persist?.hasHydrated?.() ?? true;
          const legacyPrefs = hasHydrated ? localStorage.getItem('enabled-tools') : null;
          if (legacyPrefs && enabledTools.length === DEFAULT_ENABLED_TOOLS.length && enabledTools.every((t, i) => t === DEFAULT_ENABLED_TOOLS[i])) {
            setEnabledTools(JSON.parse(legacyPrefs));
          }
          if (legacyPrefs) localStorage.removeItem('enabled-tools');
        } catch {
          // Ignore migration failures
        }
        setIsLoading(false);
        setInitialized(true);
      }
    };

    loadPreferences();
  }, [user?.uid, authLoading, setEnabledTools]);

  useEffect(() => {
    if (!initialized || isLoading || isSavingRef.current) {
      return;
    }

    const savePreferences = async () => {
      isSavingRef.current = true;
      try {
        if (user?.uid) {
          await patchUserPreferences({ enabledTools });
        }
      } catch (error) {
        console.error("Error saving tool visibility preferences:", error);
      } finally {
        isSavingRef.current = false;
      }
    };

    savePreferences();
  }, [enabledTools, user?.uid, initialized, isLoading]);

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
    isLoading,
    initialized,
  };
}
