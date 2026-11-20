import { shellQuote } from "./util"

/** A database's own CLI for a saved connection: the command line, plus secrets passed as env (never typed). */
export interface DbCli { command: string; env: Record<string, string> }

interface SqlLike { type?: string; host?: string; port?: number; database?: string; username?: string; password?: string; ssl?: boolean; path?: string }

type Word = string | number | undefined | false
const q = (...words: (Word | Word[])[]) =>
  shellQuote(words.flat().filter((w): w is string | number => w !== undefined && w !== false && w !== "").map(String))
/** `--flag value`, or nothing at all when there's no value. */
const opt = (flag: string, v: Word): Word[] => (v === undefined || v === false || v === "" ? [] : [flag, v])
const withSecret = (name: string, value: string | undefined): Record<string, string> => (value ? { [name]: value } : {})

/** `null` for sources without a CLI mapping (or a config that can't make one). */
export function dbCli(sourceId: string, config: unknown): DbCli | null {
  const c = (config ?? {}) as SqlLike & { redisUrl?: string }
  switch (sourceId) {
    case "postgresql":
      if (!c.host) return null
      // `require` encrypts like the app does; libpq has no system CA store to verify against by default.
      return {
        command: q("psql", opt("-h", c.host), opt("-p", c.port), opt("-U", c.username), c.database),
        env: { ...withSecret("PGPASSWORD", c.password), ...(c.ssl ? { PGSSLMODE: "require" } : {}) },
      }
    case "mysql":
    case "mariadb":
      if (!c.host) return null
      return {
        command: q("mysql", opt("-h", c.host), opt("-P", c.port), opt("-u", c.username), c.ssl && (sourceId === "mysql" ? "--ssl-mode=REQUIRED" : "--ssl"), c.database),
        env: withSecret("MYSQL_PWD", c.password),
      }
    case "sqlite":
      return c.path ? { command: q("sqlite3", c.path), env: {} } : null
    case "redis": {
      let u: URL
      try {
        u = new URL(c.redisUrl ?? "")
      } catch {
        return null
      }
      if (u.protocol !== "redis:" && u.protocol !== "rediss:") return null
      const db = u.pathname.replace(/^\//, "")
      const user = decodeURIComponent(u.username)
      return {
        command: q("redis-cli", opt("-h", u.hostname), opt("-p", u.port || 6379), opt("--user", user), opt("-n", /^\d+$/.test(db) && db), u.protocol === "rediss:" && "--tls"),
        env: withSecret("REDISCLI_AUTH", decodeURIComponent(u.password)),
      }
    }
    default:
      return null
  }
}
