import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_ENABLED_TOOLS = [
  '/app/to-do',
  '/app/notes',
  '/app/bookmarks',
  '/app/snippet-manager',
  '/app/password-manager',
  '/app/environment-manager',
  '/app/email-validator',
  '/app/jwt-decoder',
  '/app/encryption-playground',
  '/app/certificate-pem-decoder',
  '/app/json-formatter',
  '/app/json-schema-generator',
  '/app/sql-formatter',
  '/app/yaml-formatter',
  '/app/graphql-formatter',
  '/app/diff-checker',
  '/app/regex-tester',
  '/app/timestamp-converter',
  '/app/cron-builder',
  '/app/number-base-converter',
  '/app/csv-excel-json',
  '/app/api-client',
  '/app/http-status-codes',
  '/app/database-explorer',
  '/app/url-encode',
  '/app/svg-optimizer',
  '/app/uuid-generator',
  '/app/secret-api-key-generator',
  '/app/qr-code-generator',
  '/app/ip-subnet-calculator',
  '/app/hash-generator',
  '/app/hmac-generator',
  '/app/totp-generator',
  '/app/lorem-ipsum',
  '/app/color-picker',
  '/app/contrast-checker',
  '/app/markdown-preview-html',
  '/app/mock-data-generator',
  '/app/docker-compose-generator',
  '/app/url-shortener',
];

interface ToolVisibilityStore {
  /** Per-workspace enabled-tools map. Workspace `null` key holds the legacy/global
   * default applied to any workspace the user hasn't customized yet. */
  enabledToolsByWorkspace: Record<string, string[]>;
  /** Legacy global list — kept so existing sync/onboarding code keeps working,
   * and so a new workspace inherits this list as its starting point. */
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
  setEnabledToolsForWorkspace: (workspaceId: string, tools: string[]) => void;
  toggleTool: (toolUrl: string) => void;
  toggleToolForWorkspace: (workspaceId: string, toolUrl: string) => void;
  resetTools: () => void;
  getEnabledFor: (workspaceId: string | null | undefined) => string[];
}

export const useToolVisibilityStore = create<ToolVisibilityStore>()(
  persist(
    (set, get) => ({
      enabledTools: DEFAULT_ENABLED_TOOLS,
      enabledToolsByWorkspace: {},

      setEnabledTools: (tools) => set({ enabledTools: tools }),

      setEnabledToolsForWorkspace: (workspaceId, tools) =>
        set((state) => ({
          enabledToolsByWorkspace: { ...state.enabledToolsByWorkspace, [workspaceId]: tools },
        })),

      toggleTool: (toolUrl) =>
        set((state) => {
          const has = state.enabledTools.includes(toolUrl);
          return {
            enabledTools: has
              ? state.enabledTools.filter((u) => u !== toolUrl)
              : [...state.enabledTools, toolUrl],
          };
        }),

      toggleToolForWorkspace: (workspaceId, toolUrl) =>
        set((state) => {
          const current = state.enabledToolsByWorkspace[workspaceId] ?? state.enabledTools;
          const has = current.includes(toolUrl);
          const next = has ? current.filter((u) => u !== toolUrl) : [...current, toolUrl];
          return {
            enabledToolsByWorkspace: { ...state.enabledToolsByWorkspace, [workspaceId]: next },
          };
        }),

      resetTools: () => set({ enabledTools: DEFAULT_ENABLED_TOOLS, enabledToolsByWorkspace: {} }),

      getEnabledFor: (workspaceId) => {
        if (!workspaceId) return get().enabledTools;
        return get().enabledToolsByWorkspace[workspaceId] ?? get().enabledTools;
      },
    }),
    {
      name: 'tool-visibility-storage',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as ToolVisibilityStore | null;
        if (state && Array.isArray(state.enabledTools)) {
          if (version === 0 || version === 1) {
            // Backfill any new defaults missing from the old persisted list.
            const newTools = [...state.enabledTools];
            DEFAULT_ENABLED_TOOLS.forEach((tool) => {
              if (!newTools.includes(tool)) newTools.push(tool);
            });
            state.enabledTools = newTools;
          }
          // v2 → v3: per-workspace map didn't exist; start empty so each workspace
          // inherits the global list on first read.
          if (!state.enabledToolsByWorkspace) state.enabledToolsByWorkspace = {};
        }
        return persistedState as ToolVisibilityStore;
      },
    }
  )
);
