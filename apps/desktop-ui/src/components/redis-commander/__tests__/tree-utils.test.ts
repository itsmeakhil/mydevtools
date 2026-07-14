import { buildTree, ancestorPaths } from "../tree-utils";
import type { RedisKeyInfo } from "../types";

const k = (key: string): RedisKeyInfo => ({ key, type: "string", ttl: -1 });

describe("buildTree", () => {
    it("groups keys by separator into folders + leaves", () => {
        const root = buildTree([k("user:1"), k("user:2"), k("session:a")], ":");
        expect(root.leafCount).toBe(3);
        const userFolder = root.children.find((c) => c.name === "user")!;
        expect(userFolder.fullKey).toBeNull();
        expect(userFolder.leafCount).toBe(2);
        expect(userFolder.children.map((c) => c.name)).toEqual(["1", "2"]);
        const sessionFolder = root.children.find((c) => c.name === "session")!;
        expect(sessionFolder.leafCount).toBe(1);
    });

    it("sorts folders before leaves at each level", () => {
        const root = buildTree([k("aaa"), k("z:nested")], ":");
        expect(root.children.map((c) => c.name)).toEqual(["z", "aaa"]);
    });

    it("treats key with no separator as top-level leaf", () => {
        const root = buildTree([k("standalone")], ":");
        expect(root.children).toHaveLength(1);
        expect(root.children[0]!.fullKey).toBe("standalone");
    });

    it("falls back to flat list when separator is empty", () => {
        const root = buildTree([k("a:b"), k("c:d")], "");
        expect(root.children.map((c) => c.fullKey)).toEqual(["a:b", "c:d"]);
    });

    it("handles key that shares a name with a folder", () => {
        // 'user' is both a leaf and a folder prefix — should produce 2 sibling nodes
        const root = buildTree([k("user"), k("user:1")], ":");
        const user = root.children.find((c) => c.name === "user" && c.fullKey === "user");
        const userFolder = root.children.find((c) => c.name === "user" && c.fullKey === null);
        expect(user).toBeDefined();
        expect(userFolder).toBeDefined();
        expect(userFolder!.leafCount).toBe(1);
    });
});

describe("ancestorPaths", () => {
    it("returns every prefix path for matched keys", () => {
        const paths = ancestorPaths(["a:b:c", "a:d"], ":");
        expect(paths).toEqual(new Set(["a", "a:b"]));
    });

    it("empty separator → no paths", () => {
        expect(ancestorPaths(["a:b"], "")).toEqual(new Set());
    });
});
