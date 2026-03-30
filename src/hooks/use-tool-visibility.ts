'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/database/firebase';
import useAuth from '@/utils/useAuth';
import { useToolVisibilityStore, DEFAULT_ENABLED_TOOLS } from '@/store/tool-visibility-store';

/**
 * Hook to manage which tools are visible/enabled in the sidebar navigation.
 * Defaults to Tasks, Notes, and Password Manager to keep the interface clean.
 */
export function useToolVisibility() {
  const { user } = useAuth(false);
  const { enabledTools, setEnabledTools, toggleTool: storeToggleTool } = useToolVisibilityStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const isSavingRef = useRef(false);

  // Load preferences from Firebase or localStorage
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.uid) {
        setIsLoading(true);
        try {
          const userPrefsRef = doc(db, 'users', user.uid, 'userData', 'preferences');
          const prefsDoc = await getDoc(userPrefsRef);

          if (prefsDoc.exists() && prefsDoc.data().enabledTools) {
            setEnabledTools(prefsDoc.data().enabledTools);
          } else {
            // New user, set default
            await setDoc(userPrefsRef, { enabledTools: DEFAULT_ENABLED_TOOLS }, { merge: true });
            setEnabledTools(DEFAULT_ENABLED_TOOLS);
          }
          setInitialized(true);
        } catch (error) {
          console.error("Error loading tool visibility preferences:", error);
          setEnabledTools(DEFAULT_ENABLED_TOOLS); // Fallback
        } finally {
          setIsLoading(false);
        }
      } else {
        // Not logged in: try localStorage or default
        try {
          const localPrefs = localStorage.getItem('enabled-tools');
          if (localPrefs) {
            setEnabledTools(JSON.parse(localPrefs));
          } else {
            setEnabledTools(DEFAULT_ENABLED_TOOLS);
          }
        } catch (e) {
          setEnabledTools(DEFAULT_ENABLED_TOOLS);
        }
        setIsLoading(false);
        setInitialized(true);
      }
    };

    loadPreferences();
  }, [user?.uid]);

  // Save preferences whenever they change
  useEffect(() => {
    if (!initialized || isLoading || isSavingRef.current) {
      return;
    }

    const savePreferences = async () => {
      isSavingRef.current = true;
      try {
        if (user?.uid) {
          const userPrefsRef = doc(db, 'users', user.uid, 'userData', 'preferences');
          await setDoc(userPrefsRef, { enabledTools }, { merge: true });
        } else {
          localStorage.setItem('enabled-tools', JSON.stringify(enabledTools));
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
