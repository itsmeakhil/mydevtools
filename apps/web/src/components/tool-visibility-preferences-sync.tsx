"use client";

import { useEffect, useRef } from "react";
import useAuth from "@/utils/useAuth";
import {
  useToolVisibilityStore,
  DEFAULT_ENABLED_TOOLS,
} from "@/store/tool-visibility-store";
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api";

/** Old backend default before it matched the web app list — treat as uninitialized. */
const LEGACY_FOUR_TOOL_DEFAULT = [
  "/app/to-do",
  "/app/notes",
  "/app/password-manager",
  "/app/environment-manager",
] as const;

function normalizeToolsJson(tools: string[]) {
  return JSON.stringify([...tools].sort());
}

function normalizeToolUrl(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  const trimmed = withoutQuery.trim();
  // remove trailing slash to make exact matching more reliable
  return trimmed.endsWith("/") && trimmed.length > 1 ? trimmed.slice(0, -1) : trimmed;
}

function normalizeToolList(tools: string[]): string[] {
  const normalized = tools.map(normalizeToolUrl).filter(Boolean);
  // de-dupe while keeping deterministic sort for caching
  return Array.from(new Set(normalized));
}

function isLegacyFourToolList(tools: string[]): boolean {
  if (tools.length !== LEGACY_FOUR_TOOL_DEFAULT.length) return false;
  const set = new Set(tools.map(normalizeToolUrl));
  return LEGACY_FOUR_TOOL_DEFAULT.every((t) => set.has(t));
}

/**
 * Single place to load/save enabled tools to the API. The hook `useToolVisibility` is used from
 * multiple components (sidebar, settings); per-instance refs caused races where a second mount
 * reset the "server synced" gate and saves could PATCH post-logout defaults before GET finished.
 */
export function ToolVisibilityPreferencesSync() {
  const { user, loading: authLoading } = useAuth(false);
  const enabledTools = useToolVisibilityStore((s) => s.enabledTools);
  const setEnabledTools = useToolVisibilityStore((s) => s.setEnabledTools);
  const serverSyncedRef = useRef(false);
  const isSavingRef = useRef(false);
  const lastSavedNormRef = useRef<string>("");

  const CACHE_KEY = "enabled-tools-cache-v1";

  function readCache(): string[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((x) => typeof x === "string");
    } catch {
      return null;
    }
  }

  function writeCache(tools: string[]) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(tools));
    } catch {
      // ignore cache write failures
    }
  }

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    let settleTimerId: number | undefined;

    const scheduleEnableSavesAfterStoreSettles = () => {
      if (cancelled) return;
      settleTimerId = window.setTimeout(() => {
        if (!cancelled) {
          serverSyncedRef.current = true;
        }
      }, 0);
    };

    const load = async () => {
      if (!user?.uid) {
        serverSyncedRef.current = false;
        lastSavedNormRef.current = "";
        try {
          const legacyPrefs = localStorage.getItem("enabled-tools");
          const cur = useToolVisibilityStore.getState().enabledTools;
          if (
            legacyPrefs &&
            cur.length === DEFAULT_ENABLED_TOOLS.length &&
            cur.every((t, i) => t === DEFAULT_ENABLED_TOOLS[i])
          ) {
            setEnabledTools(JSON.parse(legacyPrefs) as string[]);
          }
          if (legacyPrefs) localStorage.removeItem("enabled-tools");
        } catch {
          // ignore
        }
        return;
      }

      serverSyncedRef.current = false;
      try {
        const data = await getUserPreferences();
        if (cancelled) return;
        let next = Array.isArray(data.enabledTools)
          ? normalizeToolList(data.enabledTools)
          : DEFAULT_ENABLED_TOOLS;
        if (isLegacyFourToolList(next)) {
          next = [...DEFAULT_ENABLED_TOOLS];
        }
        lastSavedNormRef.current = normalizeToolsJson(next);
        setEnabledTools(next);
        writeCache(next);
        scheduleEnableSavesAfterStoreSettles();
      } catch (e) {
        console.error("Tool visibility load failed:", e);
        if (cancelled) return;
        // If the server request fails, keep whatever we already have in the store (often cache),
        // otherwise fall back to defaults.
        const cached = readCache();
        if (cached && cached.length) {
          const normalizedCached = normalizeToolList(cached);
          lastSavedNormRef.current = normalizeToolsJson(normalizedCached);
          setEnabledTools(normalizedCached);
        } else {
          lastSavedNormRef.current = normalizeToolsJson(DEFAULT_ENABLED_TOOLS);
          setEnabledTools(DEFAULT_ENABLED_TOOLS);
        }
        scheduleEnableSavesAfterStoreSettles();
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (settleTimerId !== undefined) {
        window.clearTimeout(settleTimerId);
      }
    };
  }, [user?.uid, authLoading, setEnabledTools]);

  useEffect(() => {
    if (authLoading || !user?.uid || !serverSyncedRef.current || isSavingRef.current) {
      return;
    }

    const norm = normalizeToolsJson(enabledTools);
    if (norm === lastSavedNormRef.current) return;

    const save = async () => {
      isSavingRef.current = true;
      try {
        await patchUserPreferences({ enabledTools });
        lastSavedNormRef.current = norm;
        writeCache(enabledTools);
      } catch (e) {
        console.error("Tool visibility save failed:", e);
      } finally {
        isSavingRef.current = false;
      }
    };

    void save();
  }, [enabledTools, user?.uid, authLoading]);

  return null;
}
