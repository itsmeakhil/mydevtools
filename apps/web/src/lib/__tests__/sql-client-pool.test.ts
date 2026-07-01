import { poolKey, SqlConnParams } from "@/lib/sql-client-pool";

const base: SqlConnParams = {
  type: "postgresql",
  host: "localhost",
  port: 5432,
  database: "app",
  username: "u",
  password: "p",
  ssl: false,
};

describe("poolKey", () => {
  it("is stable for identical params", () => {
    expect(poolKey(base)).toBe(poolKey({ ...base }));
  });

  it("differs when any connection field differs", () => {
    expect(poolKey(base)).not.toBe(poolKey({ ...base, database: "other" }));
    expect(poolKey(base)).not.toBe(poolKey({ ...base, port: 5433 }));
    expect(poolKey(base)).not.toBe(poolKey({ ...base, password: "p2" }));
    expect(poolKey(base)).not.toBe(poolKey({ ...base, ssl: true }));
  });
});
