import { reduceDownloadEvent, pctOf } from "@/lib/desktop/updater";

describe("reduceDownloadEvent", () => {
  it("Started captures total and resets downloaded", () => {
    const s = reduceDownloadEvent(
      { downloaded: 999, total: null },
      { event: "Started", data: { contentLength: 500 } } as any
    );
    expect(s).toEqual({ phase: "downloading", downloaded: 0, total: 500 });
  });

  it("Started with no contentLength → total null (indeterminate)", () => {
    const s = reduceDownloadEvent(
      { downloaded: 0, total: null },
      { event: "Started", data: {} } as any
    );
    expect(s.total).toBeNull();
    expect(s.phase).toBe("downloading");
  });

  it("Progress accumulates chunk lengths, keeps total", () => {
    const s = reduceDownloadEvent(
      { downloaded: 100, total: 500 },
      { event: "Progress", data: { chunkLength: 50 } } as any
    );
    expect(s).toEqual({ phase: "downloading", downloaded: 150, total: 500 });
  });

  it("Finished switches phase to installing", () => {
    const s = reduceDownloadEvent(
      { downloaded: 500, total: 500 },
      { event: "Finished", data: {} } as any
    );
    expect(s.phase).toBe("installing");
  });
});

describe("pctOf", () => {
  it("null total → null (indeterminate, no fake number)", () => {
    expect(pctOf({ downloaded: 10, total: null })).toBeNull();
  });
  it("rounds and clamps at 100", () => {
    expect(pctOf({ downloaded: 250, total: 500 })).toBe(50);
    expect(pctOf({ downloaded: 600, total: 500 })).toBe(100);
  });
});
