import { dbCli } from "@/lib/terminal/db-cli"

describe("dbCli", () => {
  it("postgres: args quoted, password and TLS via env", () => {
    expect(dbCli("postgresql", { host: "db.local", port: 5432, username: "app", database: "my db", password: "p'w", ssl: true })).toEqual({
      command: "psql -h db.local -p 5432 -U app 'my db'",
      env: { PGPASSWORD: "p'w", PGSSLMODE: "require" }, mask: {},
    })
    expect(dbCli("postgresql", { host: "h", port: 1, username: "", database: "", password: "", ssl: false })).toEqual({
      command: "psql -h h -p 1", env: {}, mask: {},
    })
  })
  it("mysql/mariadb use MYSQL_PWD and their own TLS flag", () => {
    expect(dbCli("mysql", { host: "h", port: 3306, username: "u", database: "d", password: "x", ssl: true })?.command)
      .toBe("mysql -h h -P 3306 -u u --ssl-mode=REQUIRED d")
    expect(dbCli("mariadb", { host: "h", port: 3306, username: "u", database: "", password: "x", ssl: true })).toEqual({
      command: "mysql -h h -P 3306 -u u --ssl", env: { MYSQL_PWD: "x" }, mask: {},
    })
  })
  it("sqlite path and redis URL", () => {
    expect(dbCli("sqlite", { type: "sqlite", path: "/a b/app.db" })?.command).toBe("sqlite3 '/a b/app.db'")
    expect(dbCli("redis", { redisUrl: "rediss://default:s%40cret@cache.io:6380/2" })).toEqual({
      command: "redis-cli -h cache.io -p 6380 --user default -n 2 --tls",
      env: { REDISCLI_AUTH: "s@cret" }, mask: {},
    })
    expect(dbCli("redis", { redisUrl: "redis://localhost" })).toEqual({ command: "redis-cli -h localhost -p 6379", env: {}, mask: {} })
  })
  it("password env vars are masked (when long enough to mask); other env is not", () => {
    expect(dbCli("postgresql", { host: "h", password: "longpassword", ssl: true })?.mask).toEqual({ PGPASSWORD: "longpassword" })
    expect(dbCli("mysql", { host: "h", password: "longpassword" })?.mask).toEqual({ MYSQL_PWD: "longpassword" })
    expect(dbCli("redis", { redisUrl: "redis://:longpassword@h" })?.mask).toEqual({ REDISCLI_AUTH: "longpassword" })
    expect(dbCli("postgresql", { host: "h", password: "short", ssl: true })?.mask).toEqual({})
    expect(dbCli("sqlite", { path: "/a.db" })?.mask).toEqual({})
  })
  it("nothing for unmapped sources or unusable configs", () => {
    expect(dbCli("mongodb", { uri: "mongodb://x" })).toBeNull()
    expect(dbCli("redis", { redisUrl: "http://x" })).toBeNull()
    expect(dbCli("redis", { redisUrl: "not a url" })).toBeNull()
    expect(dbCli("postgresql", {})).toBeNull()
    expect(dbCli("sqlite", { path: "" })).toBeNull()
  })
})
