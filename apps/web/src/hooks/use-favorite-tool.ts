'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useAuth from '@/utils/useAuth';
import { getUserPreferences, patchUserPreferences } from '@/lib/user-preferences-api';

/**
 * Hook to manage tool favorites
 * Centralizes favorite tool logic for consistent behavior across the app
 */
export function useFavoriteTool() {
  const { user } = useAuth(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const loadFavorites = async () => {
      if (user?.uid) {
        setIsLoading(true);
        try {
          const data = await getUserPreferences();
          setFavorites(Array.isArray(data.toolFavorites) ? data.toolFavorites : []);
          setInitialized(true);
        } catch (error) {
          console.error("Error loading favorites:", error);
          setFavorites([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFavorites([]);
        setIsLoading(false);
        setInitialized(true);
      }
    };

    loadFavorites();
  }, [user?.uid]);

  useEffect(() => {
    if (!initialized || isLoading || isSavingRef.current || !user?.uid) {
      return;
    }

    const saveFavorites = async () => {
      isSavingRef.current = true;
      try {
        await patchUserPreferences({ toolFavorites: favorites });
      } catch (error) {
        console.error("Error saving favorites:", error);
      } finally {
        isSavingRef.current = false;
      }
    };

    saveFavorites();
  }, [favorites, user?.uid, initialized, isLoading]);

  const toggleFavorite = useCallback(async (toolId: string) => {
    if (!user?.uid) {
      window.location.href = '/login';
      return;
    }

    try {
      setFavorites(prev => {
        const newFavorites = prev.includes(toolId)
          ? prev.filter(favId => favId !== toolId)
          : [...prev, toolId];
        return newFavorites;
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [user?.uid]);

  const isFavorite = useCallback((toolId: string): boolean => {
    return favorites.includes(toolId);
  }, [favorites]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    isLoading,
    initialized,
  };
}
