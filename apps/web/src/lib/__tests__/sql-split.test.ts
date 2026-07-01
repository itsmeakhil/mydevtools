import { splitSqlStatements } from "@/lib/sql-split";

describe("splitSqlStatements", () => {
  it("splits simple statements", () => {
    expect(splitSqlStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("ignores semicolons inside single-quoted strings", () => {
    expect(splitSqlStatements("SELECT 'a;b'; SELECT 2")).toEqual(["SELECT 'a;b'", "SELECT 2"]);
  });

  it("handles escaped single quotes ('')", () => {
    expect(splitSqlStatements("SELECT 'it''s;fine'; SELECT 2")).toEqual([
      "SELECT 'it''s;fine'",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons in line comments", () => {
    expect(splitSqlStatements("SELECT 1 -- a;b\n; SELECT 2")).toEqual([
      "SELECT 1 -- a;b",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons in block comments", () => {
    expect(splitSqlStatements("SELECT 1 /* a;b */; SELECT 2")).toEqual([
      "SELECT 1 /* a;b */",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons inside dollar-quoted bodies", () => {
    const sql = "CREATE FUNCTION f() RETURNS void AS $$ BEGIN; END; $$ LANGUAGE plpgsql; SELECT 1";
    expect(splitSqlStatements(sql)).toEqual([
      "CREATE FUNCTION f() RETURNS void AS $$ BEGIN; END; $$ LANGUAGE plpgsql",
      "SELECT 1",
    ]);
  });

  it("ignores semicolons in tagged dollar quotes", () => {
    expect(splitSqlStatements("SELECT $tag$a;b$tag$; SELECT 2")).toEqual([
      "SELECT $tag$a;b$tag$",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons inside backtick identifiers (mysql)", () => {
    expect(splitSqlStatements("SELECT `a;b`; SELECT 2")).toEqual(["SELECT `a;b`", "SELECT 2"]);
  });

  it("drops trailing empty statement and whitespace-only chunks", () => {
    expect(splitSqlStatements("SELECT 1; ; ")).toEqual(["SELECT 1"]);
  });

  it("returns empty array for blank input", () => {
    expect(splitSqlStatements("   ")).toEqual([]);
  });
});
