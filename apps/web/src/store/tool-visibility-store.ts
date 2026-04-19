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
  '/app/graphql-formatter',
  '/app/diff-checker',
  '/app/regex-tester',
  '/app/timestamp-converter',
  '/app/cron-builder',
  '/app/number-base-converter',
  '/app/csv-excel-json',
  '/app/api-client',
  '/app/http-status-codes',
  '/app/nosql-explorer',
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
  '/app/pdf-unlocker',
  '/app/pdf-locker',
  '/app/pdf-splitter',
  '/app/pdf-merge',
  '/app/pdf-compressor',
  '/app/pdf-watermark',
  '/app/jpg-to-pdf',
  '/app/excel-to-pdf',
  '/app/pdf-to-jpg',
  '/app/html-to-pdf',
  '/app/pdf-compare',
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
