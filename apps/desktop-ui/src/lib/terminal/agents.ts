/** Display names for agent manifest ids (Rust `terminal/agents/*.toml`). Product names, not translated. */
const NAMES: Record<string, string> = {
  agy: "Antigravity", amp: "Amp", claude: "Claude", cline: "Cline", codex: "Codex", copilot: "Copilot",
  cursor: "Cursor", devin: "Devin", droid: "Droid", gemini: "Gemini", grok: "Grok", hermes: "Hermes",
  kilo: "Kilo", kimi: "Kimi", kiro: "Kiro", letta: "Letta", maki: "Maki", muse: "Muse",
  opencode: "opencode", pi: "Pi", qodercli: "Qoder", qwen: "Qwen",
}

export const agentName = (id: string) => NAMES[id] ?? id
