import {
    getCachedPlainText,
    setCachedPlainText,
    deleteCachedPlainText,
    clearPlainTextCache,
    buildChildrenMap,
    mergePendingUpdate,
    requeuePendingUpdates,
    type PendingUpdates,
} from "../notes-helpers";
import type { Note } from "@/app/app/notes/types/Note";

const note = (over: Partial<Note> & { id: string }): Note => ({
    title: "",
    content: null,
    parentId: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    userId: "desktop-local",
    ...over,
});

beforeEach(() => clearPlainTextCache());

describe("getCachedPlainText", () => {
    it("returns empty string for a metadata-only note before the index warms", () => {
        expect(getCachedPlainText(note({ id: "a" }))).toBe("");
    });

    it("computes and caches from an in-hand body", () => {
        const n = note({ id: "b", content: "# Title\n\nhello body" });
        expect(getCachedPlainText(n)).toContain("hello body");
        // Cached by id: a later metadata-only copy of the same note still resolves.
        expect(getCachedPlainText(note({ id: "b" }))).toContain("hello body");
    });

    it("serves warmed text for a note whose body was never in state", () => {
        setCachedPlainText("c", "warmed content");
        expect(getCachedPlainText(note({ id: "c" }))).toBe("warmed content");
    });

    it("reflects an edit written after the warm", () => {
        setCachedPlainText("d", "old text");
        setCachedPlainText("d", "new text");
        expect(getCachedPlainText(note({ id: "d" }))).toBe("new text");
    });

    it("forgets a deleted note", () => {
        setCachedPlainText("e", "secret");
        deleteCachedPlainText("e");
        expect(getCachedPlainText(note({ id: "e" }))).toBe("");
    });

    it("drops everything on clear (vault lock)", () => {
        setCachedPlainText("f", "secret");
        clearPlainTextCache();
        expect(getCachedPlainText(note({ id: "f" }))).toBe("");
    });
});

describe("buildChildrenMap", () => {
    it("groups notes by parentId with roots under null", () => {
        const map = buildChildrenMap([
            note({ id: "root" }),
            note({ id: "kid", parentId: "root" }),
        ]);
        expect(map.get(null)?.map((n) => n.id)).toEqual(["root"]);
        expect(map.get("root")?.map((n) => n.id)).toEqual(["kid"]);
    });
});

describe("pending update queue", () => {
    it("merges fields instead of replacing (body edit survives a title keystroke)", () => {
        const queue: PendingUpdates = new Map();
        mergePendingUpdate(queue, "a", { content: "body text" });
        mergePendingUpdate(queue, "a", { title: "Renamed" });
        expect(queue.get("a")).toEqual({ content: "body text", title: "Renamed" });
    });

    it("keeps notes separate", () => {
        const queue: PendingUpdates = new Map();
        mergePendingUpdate(queue, "a", { content: "a body" });
        mergePendingUpdate(queue, "b", { content: "b body" });
        expect(queue.get("a")).toEqual({ content: "a body" });
        expect(queue.get("b")).toEqual({ content: "b body" });
    });

    it("requeues a failed batch without clobbering newer edits", () => {
        const queue: PendingUpdates = new Map();
        mergePendingUpdate(queue, "a", { content: "newer", tags: ["t"] });
        requeuePendingUpdates(queue, [["a", { content: "failed", title: "T" }]]);
        expect(queue.get("a")).toEqual({ content: "newer", tags: ["t"], title: "T" });
    });
});
