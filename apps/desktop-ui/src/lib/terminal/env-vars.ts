/** Same rule as Rust `extra_env_ok`: names that would change how the shell starts or runs are refused. */
const DENY = new Set(["PATH", "HOME", "SHELL", "USER", "LOGNAME", "TERM", "ZDOTDIR", "ENV", "BASH_ENV", "PROMPT_COMMAND", "IFS"])

export function envVarOk(name: string, value: string): boolean {
  return (
    /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name) &&
    !DENY.has(name) &&
    !/^(LD_|DYLD_|MDT_|BASH_FUNC_)/.test(name) &&
    new TextEncoder().encode(value).length <= 64 * 1024 &&
    !value.includes("\0")
  )
}

/** Variables → pane env; refused or blank names come back in `skipped` (later duplicates win). */
export function toPaneEnv(vars: { key: string; value: string }[]): { env: Record<string, string>; skipped: string[] } {
  const env: Record<string, string> = {}
  const skipped: string[] = []
  for (const { key, value } of vars) {
    const k = key.trim()
    if (!k) continue
    if (envVarOk(k, value)) env[k] = value
    else skipped.push(k)
  }
  return { env, skipped }
}
