"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Circle, LucideIcon } from "lucide-react";
import { STATUS_CONFIG } from "../config/constants";
import {
  BuiltInStatus,
  ResolvedStatusBase,
  StatusSettings,
  parseStatusSettings,
  resolveStatuses,
} from "../utils/statusSettings";

export const STATUS_SETTINGS_KEY = "tasks-status-settings";

export interface ResolvedStatus extends ResolvedStatusBase {
  label: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  dot: string;
}

const EMPTY: StatusSettings = { colors: {}, custom: [] };
let cached: StatusSettings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): StatusSettings {
  if (cached === null) {
    cached = parseStatusSettings(
      typeof window === "undefined" ? null : localStorage.getItem(STATUS_SETTINGS_KEY)
    );
  }
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveStatusSettings(settings: StatusSettings): void {
  cached = settings;
  localStorage.setItem(STATUS_SETTINGS_KEY, JSON.stringify(settings));
  listeners.forEach((l) => l());
}

/** Non-reactive read for callers outside React rendering (e.g. context callbacks). */
export function readStatusSettings(): StatusSettings {
  return getSnapshot();
}

export function useStatuses() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const tStatus = useTranslations("Tasks.status");

  const statuses = useMemo<ResolvedStatus[]>(
    () =>
      resolveStatuses(settings).map((s) => ({
        ...s,
        label: s.builtIn ? tStatus(`${s.id}.label` as never) : (s.label as string),
        description: s.builtIn ? tStatus(`${s.id}.description` as never) : undefined,
        icon: s.builtIn ? STATUS_CONFIG[s.id as BuiltInStatus].icon : Circle,
        ...s.classes,
      })),
    [settings, tStatus]
  );

  const getStatus = useCallback(
    // ponytail: unknown status (e.g. its custom entry was deleted) falls back to the first
    // column instead of a mass rewrite; the task gets a real status on its next move.
    (id: string) => statuses.find((s) => s.id === id) ?? statuses[0],
    [statuses]
  );

  return { settings, statuses, getStatus };
}
