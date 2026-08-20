/**
 * Custom status settings for the Tasks tool.
 *
 * Pure logic only (no React, no localStorage) so it stays testable. Persistence and i18n
 * live in `hooks/useStatuses`. Statuses are stored on tasks as free strings — the Rust
 * handler never validates them — so custom ids round-trip through the DB unchanged.
 */

export const BUILT_IN_STATUSES = ["not-started", "ongoing", "completed"] as const;
export type BuiltInStatus = (typeof BUILT_IN_STATUSES)[number];

export interface StatusColorClasses {
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  dot: string;
}

// Literal class strings so Tailwind's scanner picks them up.
export const STATUS_COLORS = {
  blue: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/30",
    borderColor: "border-blue-200/50 dark:border-blue-800/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  orange: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50/50 dark:bg-orange-950/30",
    borderColor: "border-orange-200/50 dark:border-orange-800/50",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    dot: "bg-orange-500 dark:bg-orange-400",
  },
  green: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50/50 dark:bg-green-950/30",
    borderColor: "border-green-200/50 dark:border-green-800/50",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    dot: "bg-green-500 dark:bg-green-400",
  },
  red: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50/50 dark:bg-red-950/30",
    borderColor: "border-red-200/50 dark:border-red-800/50",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    dot: "bg-red-500 dark:bg-red-400",
  },
  purple: {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50/50 dark:bg-purple-950/30",
    borderColor: "border-purple-200/50 dark:border-purple-800/50",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    dot: "bg-purple-500 dark:bg-purple-400",
  },
  pink: {
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50/50 dark:bg-pink-950/30",
    borderColor: "border-pink-200/50 dark:border-pink-800/50",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
    dot: "bg-pink-500 dark:bg-pink-400",
  },
  teal: {
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50/50 dark:bg-teal-950/30",
    borderColor: "border-teal-200/50 dark:border-teal-800/50",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    dot: "bg-teal-500 dark:bg-teal-400",
  },
  yellow: {
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50/50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200/50 dark:border-yellow-800/50",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
    dot: "bg-yellow-500 dark:bg-yellow-400",
  },
  indigo: {
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50/50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200/50 dark:border-indigo-800/50",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    dot: "bg-indigo-500 dark:bg-indigo-400",
  },
  gray: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50/50 dark:bg-gray-800/30",
    borderColor: "border-gray-200/50 dark:border-gray-700/50",
    iconBg: "bg-gray-100 dark:bg-gray-800/50",
    dot: "bg-gray-500 dark:bg-gray-400",
  },
} satisfies Record<string, StatusColorClasses>;

export type StatusColorKey = keyof typeof STATUS_COLORS;

export const DEFAULT_STATUS_COLORS: Record<BuiltInStatus, StatusColorKey> = {
  "not-started": "blue",
  ongoing: "orange",
  completed: "green",
};

export interface CustomStatus {
  id: string;
  label: string;
  color: StatusColorKey;
}

export interface StatusSettings {
  /** Color overrides for the built-in statuses. */
  colors: Partial<Record<BuiltInStatus, StatusColorKey>>;
  custom: CustomStatus[];
}

export interface ResolvedStatusBase {
  id: string;
  builtIn: boolean;
  /** Custom statuses only — built-in labels come from i18n. */
  label?: string;
  colorKey: StatusColorKey;
  classes: StatusColorClasses;
}

const isColorKey = (v: unknown): v is StatusColorKey =>
  typeof v === "string" && v in STATUS_COLORS;

export function parseStatusSettings(raw: string | null): StatusSettings {
  const empty: StatusSettings = { colors: {}, custom: [] };
  if (!raw) return empty;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof data !== "object" || data === null) return empty;
  const { colors, custom } = data as { colors?: unknown; custom?: unknown };

  const settings: StatusSettings = { colors: {}, custom: [] };
  if (typeof colors === "object" && colors !== null) {
    for (const key of BUILT_IN_STATUSES) {
      const value = (colors as Record<string, unknown>)[key];
      if (isColorKey(value)) settings.colors[key] = value;
    }
  }
  if (Array.isArray(custom)) {
    for (const entry of custom) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.id === "string" &&
        entry.id.length > 0 &&
        typeof entry.label === "string" &&
        isColorKey(entry.color)
      ) {
        settings.custom.push({ id: entry.id, label: entry.label, color: entry.color });
      }
    }
  }
  return settings;
}

export function resolveStatuses(settings: StatusSettings): ResolvedStatusBase[] {
  const builtIns = BUILT_IN_STATUSES.map((id) => {
    const colorKey = settings.colors[id] ?? DEFAULT_STATUS_COLORS[id];
    return { id, builtIn: true, colorKey, classes: STATUS_COLORS[colorKey] };
  });
  const customs = settings.custom.map((c) => ({
    id: c.id,
    builtIn: false,
    label: c.label,
    colorKey: c.color,
    classes: STATUS_COLORS[c.color],
  }));
  return [...builtIns, ...customs];
}

/** "all" is the status-filter sentinel in the tasks list query — never a valid status id. */
const RESERVED_IDS = new Set<string>([...BUILT_IN_STATUSES, "all"]);

export function customStatusId(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "status";
  const used = new Set([...RESERVED_IDS, ...taken]);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
