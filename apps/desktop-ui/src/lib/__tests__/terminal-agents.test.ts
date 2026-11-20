import { agentName, resumeCommand } from "@/lib/terminal/agents"

describe("terminal agents", () => {
  it("names known agents and falls back to the id", () => {
    expect(agentName("codex")).toBe("Codex")
    expect(agentName("newagent")).toBe("newagent")
  })
  it("resumeCommand: exact claude session, else continue; codex last; others none", () => {
    expect(resumeCommand({ agent: "claude", session: "0f8c2a9e-1b2c" })).toBe("claude --resume 0f8c2a9e-1b2c")
    expect(resumeCommand({ agent: "claude", session: "x; rm -rf ~" })).toBe("claude --continue")
    expect(resumeCommand({ agent: "claude" })).toBe("claude --continue")
    expect(resumeCommand({ agent: "codex" })).toBe("codex resume --last")
    expect(resumeCommand({ agent: "gemini" })).toBeNull()
  })
})
