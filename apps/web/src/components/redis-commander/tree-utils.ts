import type { RedisKeyInfo } from "./types";

export interface TreeNode {
    /** Full path segment label (e.g. "user", "123"). Root has "". */
    name: string;
    /** Full key string if this node is a leaf (full Redis key). null for folders. */
    fullKey: string | null;
    /** Leaf-only: type + ttl. */
    info: RedisKeyInfo | null;
    /** Sorted child nodes (folders first, then leaves). */
    children: TreeNode[];
    /** Total leaf count under this node (folders display this). */
    leafCount: number;
}

/**
 * Build a nested tree from a flat list of Redis keys using the given separator.
 * Folder nodes are created for shared prefixes; leaf nodes carry the type/ttl info.
 * Empty separator → flat tree of leaves (degenerate).
 */
export function buildTree(keys: RedisKeyInfo[], separator: string): TreeNode {
    const root: TreeNode = { name: "", fullKey: null, info: null, children: [], leafCount: 0 };
    if (!separator) {
        for (const k of keys) {
            root.children.push({ name: k.key, fullKey: k.key, info: k, children: [], leafCount: 1 });
        }
        root.leafCount = keys.length;
        sortChildren(root);
        return root;
    }
    for (const k of keys) {
        insertKey(root, k, separator);
    }
    sortChildren(root);
    return root;
}

function insertKey(root: TreeNode, key: RedisKeyInfo, separator: string): void {
    const parts = key.key.split(separator);
    let node = root;
    root.leafCount += 1;
    for (let i = 0; i < parts.length; i++) {
        const segment = parts[i]!;
        const isLeaf = i === parts.length - 1;
        let child = node.children.find((c) => c.name === segment && (isLeaf ? c.fullKey !== null : c.fullKey === null));
        if (!child) {
            child = {
                name: segment,
                fullKey: isLeaf ? key.key : null,
                info: isLeaf ? key : null,
                children: [],
                leafCount: 0,
            };
            node.children.push(child);
        }
        if (!isLeaf) child.leafCount += 1;
        else child.leafCount = 1;
        node = child;
    }
}

function sortChildren(node: TreeNode): void {
    node.children.sort((a, b) => {
        const aFolder = a.fullKey === null;
        const bFolder = b.fullKey === null;
        if (aFolder !== bFolder) return aFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sortChildren(c);
}

/**
 * Collect every folder path (joined by separator) under which `matchedKeys` live —
 * used to auto-expand ancestors of search matches.
 */
export function ancestorPaths(matchedKeys: string[], separator: string): Set<string> {
    const paths = new Set<string>();
    if (!separator) return paths;
    for (const k of matchedKeys) {
        const parts = k.split(separator);
        for (let i = 1; i < parts.length; i++) {
            paths.add(parts.slice(0, i).join(separator));
        }
    }
    return paths;
}
