'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/database/firebase';
import useAuth from '@/utils/useAuth';

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

  // Load favorites from Firebase for authenticated users
  useEffect(() => {
    const loadFavorites = async () => {
      if (user?.uid) {
        setIsLoading(true);
        try {
          const userFavoritesRef = doc(db, 'users', user.uid, 'userData', 'favorites');
          const favoritesDoc = await getDoc(userFavoritesRef);

          if (favoritesDoc.exists()) {
            const userData = favoritesDoc.data();
            setFavorites(userData.toolFavorites || []);
          } else {
            await setDoc(userFavoritesRef, { toolFavorites: [] });
            setFavorites([]);
          }
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

  // Save favorites to Firebase whenever they change (but only after initial load)
  useEffect(() => {
    if (!initialized || isLoading || isSavingRef.current || !user?.uid) {
      return;
    }

    const saveFavorites = async () => {
      isSavingRef.current = true;
      try {
        const userFavoritesRef = doc(db, 'users', user.uid, 'userData', 'favorites');
        await setDoc(userFavoritesRef, { toolFavorites: favorites }, { merge: true });
      } catch (error) {
        console.error("Error saving favorites:", error);
      } finally {
        isSavingRef.current = false;
      }
    };

    saveFavorites();
  }, [favorites, user?.uid, initialized, isLoading]);

  /**
   * Toggle favorite status for a tool
   */
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

  /**
   * Check if a tool is favorited
   */
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
