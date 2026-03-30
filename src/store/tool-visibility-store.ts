import { create } from 'zustand';

export const DEFAULT_ENABLED_TOOLS = ['/app/to-do', '/app/notes', '/app/password-manager'];

interface ToolVisibilityStore {
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
  toggleTool: (toolUrl: string) => void;
}

export const useToolVisibilityStore = create<ToolVisibilityStore>((set) => ({
  enabledTools: DEFAULT_ENABLED_TOOLS,
  setEnabledTools: (tools) => set({ enabledTools: tools }),
  toggleTool: (toolUrl) => set((state) => {
    if (state.enabledTools.includes(toolUrl)) {
      return { enabledTools: state.enabledTools.filter(url => url !== toolUrl) };
    }
    return { enabledTools: [...state.enabledTools, toolUrl] };
  })
}));
