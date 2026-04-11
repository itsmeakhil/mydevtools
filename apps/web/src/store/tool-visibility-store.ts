import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_ENABLED_TOOLS = [
  '/app/to-do',
  '/app/notes',
  '/app/bookmarks',
  '/app/password-manager',
  '/app/environment-manager',
  '/app/email-validator',
  '/app/jwt-decoder',
  '/app/json-formatter',
  '/app/json-schema-generator',
  '/app/sql-formatter',
  '/app/diff-checker',
  '/app/regex-tester',
  '/app/timestamp-converter',
  '/app/cron-builder',
  '/app/api-client',
  '/app/nosql-explorer',
  '/app/url-encode',
  '/app/uuid-generator',
  '/app/lorem-ipsum',
  '/app/color-picker',
];

interface ToolVisibilityStore {
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
  toggleTool: (toolUrl: string) => void;
  resetTools: () => void;
}

export const useToolVisibilityStore = create<ToolVisibilityStore>()(
  persist(
    (set) => ({
      enabledTools: DEFAULT_ENABLED_TOOLS,
      setEnabledTools: (tools) => set({ enabledTools: tools }),
      toggleTool: (toolUrl) => set((state) => {
        if (state.enabledTools.includes(toolUrl)) {
          return { enabledTools: state.enabledTools.filter(url => url !== toolUrl) };
        }
        return { enabledTools: [...state.enabledTools, toolUrl] };
      }),
      resetTools: () => set({ enabledTools: DEFAULT_ENABLED_TOOLS }),
    }),
    {
      name: 'tool-visibility-storage',
    }
  )
);
