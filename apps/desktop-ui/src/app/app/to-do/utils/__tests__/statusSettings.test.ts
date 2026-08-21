import {
  BUILT_IN_STATUSES,
  DEFAULT_STATUS_COLORS,
  STATUS_COLORS,
  customStatusId,
  parseStatusSettings,
  resolveStatuses,
} from "../statusSettings";

describe("parseStatusSettings", () => {
  it("returns empty settings for null or garbage input", () => {
    expect(parseStatusSettings(null)).toEqual({ colors: {}, custom: [] });
    expect(parseStatusSettings("not json{")).toEqual({ colors: {}, custom: [] });
    expect(parseStatusSettings('"a string"')).toEqual({ colors: {}, custom: [] });
  });

  it("keeps valid color overrides and drops unknown keys or colors", () => {
    const raw = JSON.stringify({
      colors: { ongoing: "purple", completed: "nope", bogus: "red" },
      custom: [],
    });
    expect(parseStatusSettings(raw).colors).toEqual({ ongoing: "purple" });
  });

  it("keeps valid custom statuses and drops malformed entries", () => {
    const raw = JSON.stringify({
      colors: {},
      custom: [
        { id: "review", label: "Review", color: "teal" },
        { id: "", label: "x", color: "teal" },
        { id: "bad-color", label: "x", color: "nope" },
        { label: "no id", color: "red" },
      ],
    });
    expect(parseStatusSettings(raw).custom).toEqual([
      { id: "review", label: "Review", color: "teal" },
    ]);
  });
});

describe("resolveStatuses", () => {
  it("returns the three built-ins with default colors when settings are empty", () => {
    const resolved = resolveStatuses({ colors: {}, custom: [] });
    expect(resolved.map((s) => s.id)).toEqual([...BUILT_IN_STATUSES]);
    expect(resolved.every((s) => s.builtIn)).toBe(true);
    expect(resolved[0].colorKey).toBe(DEFAULT_STATUS_COLORS["not-started"]);
    expect(resolved[0].classes).toBe(STATUS_COLORS[resolved[0].colorKey]);
  });

  it("applies color overrides to built-ins", () => {
    const resolved = resolveStatuses({ colors: { completed: "purple" }, custom: [] });
    const completed = resolved.find((s) => s.id === "completed")!;
    expect(completed.colorKey).toBe("purple");
    expect(completed.classes).toBe(STATUS_COLORS.purple);
  });

  it("appends custom statuses after the built-ins with their label and color", () => {
    const resolved = resolveStatuses({
      colors: {},
      custom: [{ id: "review", label: "Review", color: "teal" }],
    });
    expect(resolved[3]).toMatchObject({
      id: "review",
      builtIn: false,
      label: "Review",
      colorKey: "teal",
    });
  });
});

describe("customStatusId", () => {
  it("slugifies the label", () => {
    expect(customStatusId("In Review!", [])).toBe("in-review");
  });

  it("avoids built-in ids, the reserved 'all' filter value, and taken ids", () => {
    expect(customStatusId("Completed", [])).not.toBe("completed");
    expect(customStatusId("All", [])).not.toBe("all");
    expect(customStatusId("Review", ["review"])).not.toBe("review");
  });

  it("falls back to a non-empty id for symbol-only labels", () => {
    expect(customStatusId("!!!", []).length).toBeGreaterThan(0);
  });
});
