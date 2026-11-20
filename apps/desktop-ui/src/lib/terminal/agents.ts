/** Display names for agent manifest ids (Rust `terminal/agents/*.toml`). Product names, not translated. */
const NAMES: Record<string, string> = {
  agy: "Antigravity", amp: "Amp", claude: "Claude", cline: "Cline", codex: "Codex", copilot: "Copilot",
  cursor: "Cursor", devin: "Devin", droid: "Droid", gemini: "Gemini", grok: "Grok", hermes: "Hermes",
  kilo: "Kilo", kimi: "Kimi", kiro: "Kiro", letta: "Letta", maki: "Maki", muse: "Muse",
  opencode: "opencode", pi: "Pi", qodercli: "Qoder", qwen: "Qwen",
}

export const agentName = (id: string) => NAMES[id] ?? id

/** Shell command that picks up an agent's last conversation in this folder; null when it can't. */
export function resumeCommand(r: { agent: string; session?: string }): string | null {
  if (r.agent === "claude") return r.session && /^[\w-]+$/.test(r.session) ? `claude --resume ${r.session}` : "claude --continue"
  if (r.agent === "codex") return "codex resume --last"
  return null
}

/** Agents offered in the new-tab menu; each starts with the command of the same name. */
export const LAUNCH_AGENTS = ["claude", "codex", "gemini", "opencode"] as const
