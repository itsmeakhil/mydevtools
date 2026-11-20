import { envVarOk, toPaneEnv } from "@/lib/terminal/env-vars"

describe("terminal env vars", () => {
  it("matches the Rust allow rule", () => {
    expect(envVarOk("API_TOKEN", "x")).toBe(true)
    for (const bad of ["PATH", "HOME", "ZDOTDIR", "LD_PRELOAD", "DYLD_X", "MDT_ID", "2FA", "A-B", "BASH_FUNC_f%%"]) expect(envVarOk(bad, "x")).toBe(false)
    expect(envVarOk("T", "a\0b")).toBe(false)
    expect(envVarOk("T", "é".repeat(4097))).toBe(false) // bytes, not chars
  })
  it("toPaneEnv keeps allowed, reports skipped, ignores blank keys", () => {
    expect(toPaneEnv([{ key: " DB_URL ", value: "pg://" }, { key: "PATH", value: "/x" }, { key: "", value: "v" }, { key: "DB_URL", value: "pg://2" }]))
      .toEqual({ env: { DB_URL: "pg://2" }, skipped: ["PATH"] })
  })
})
