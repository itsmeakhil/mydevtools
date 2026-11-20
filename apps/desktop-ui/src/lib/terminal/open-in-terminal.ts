import { useTabStore } from "@/store/tab-store"
import { useTerminalStore } from "@/store/terminal-store"

const TERMINAL_PATH = "/app/terminal"

/**
 * Run `run` in a new tab of the active terminal project (the home folder becomes a project
 * when there is none) and switch to the Terminal. `env` goes to that pane's process only.
 */
export async function openInTerminal(o: { name: string; run: string; env?: Record<string, string> }, navigate: (path: string) => void) {
  await useTerminalStore.getState().load()
  let st = useTerminalStore.getState()
  let p = st.projects.find((x) => x.id === st.activeProjectId) ?? st.projects[0]
  if (!p) {
    const { homeDir } = await import("@tauri-apps/api/path")
    st.addProject(await homeDir())
    st = useTerminalStore.getState()
    p = st.projects[st.projects.length - 1]
  }
  st.newTab(p.id, o.name, { run: o.run, env: o.env })
  useTabStore.getState().openTab(TERMINAL_PATH)
  navigate(TERMINAL_PATH)
}
