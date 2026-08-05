"use client";

import { useMemo, useState, useEffect } from "react";
import { IconChevronRight, IconFolder, IconFolderOpen } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RedisKeyInfo, RedisValueType } from "./types";
import { buildTree, ancestorPaths, type TreeNode } from "./tree-utils";

const TYPE_COLORS: Record<RedisValueType | string, string> = {
    string: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    list: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    set: "bg-green-500/10 text-green-600 dark:text-green-400",
    zset: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    hash: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    none: "bg-muted text-muted-foreground",
};

interface KeyTreeViewProps {
    keys: RedisKeyInfo[];
    separator: string;
    selectedKey: string | null;
    onSelectKey: (key: string) => void;
    /** Keys matching the active search — used to auto-expand ancestors. Pass null/[] when no search. */
    matchedKeys: string[] | null;
}

export function KeyTreeView({
    keys,
    separator,
    selectedKey,
    onSelectKey,
    matchedKeys,
}: KeyTreeViewProps) {
    const tree = useMemo(() => buildTree(keys, separator), [keys, separator]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Auto-expand ancestors of search matches
    useEffect(() => {
        if (!matchedKeys || matchedKeys.length === 0) return;
        const toOpen = ancestorPaths(matchedKeys, separator);
        if (toOpen.size === 0) return;
        setExpanded((prev) => {
            const next = new Set(prev);
            for (const p of toOpen) next.add(p);
            return next;
        });
    }, [matchedKeys, separator]);

    function toggle(path: string) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }

    return (
        <div className="p-1">
            {tree.children.map((child) => (
                <TreeRow
                    key={`${child.fullKey ?? "F"}::${child.name}`}
                    node={child}
                    path={child.name}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggle}
                    selectedKey={selectedKey}
                    onSelectKey={onSelectKey}
                    separator={separator}
                />
            ))}
        </div>
    );
}

interface TreeRowProps {
    node: TreeNode;
    path: string;
    depth: number;
    expanded: Set<string>;
    onToggle: (path: string) => void;
    selectedKey: string | null;
    onSelectKey: (key: string) => void;
    separator: string;
}

function TreeRow({
    node,
    path,
    depth,
    expanded,
    onToggle,
    selectedKey,
    onSelectKey,
    separator,
}: TreeRowProps) {
    const isFolder = node.fullKey === null;
    const isOpen = isFolder && expanded.has(path);
    const indent = { paddingLeft: `${4 + depth * 12}px` };

    if (isFolder) {
        return (
            <>
                <button
                    onClick={() => onToggle(path)}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors hover:bg-accent"
                    style={indent}
                >
                    <IconChevronRight
                        className={cn(
                            "size-3 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                        )}
                    />
                    {isOpen ? (
                        <IconFolderOpen className="size-3.5 shrink-0 text-amber-500" />
                    ) : (
                        <IconFolder className="size-3.5 shrink-0 text-amber-500" />
                    )}
                    <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                        {node.leafCount}
                    </span>
                </button>
                {isOpen &&
                    node.children.map((child) => {
                        const childPath = child.fullKey ?? `${path}${separator}${child.name}`;
                        return (
                            <TreeRow
                                key={`${child.fullKey ?? "F"}::${child.name}`}
                                node={child}
                                path={childPath}
                                depth={depth + 1}
                                expanded={expanded}
                                onToggle={onToggle}
                                selectedKey={selectedKey}
                                onSelectKey={onSelectKey}
                                separator={separator}
                            />
                        );
                    })}
            </>
        );
    }

    // Leaf
    const info = node.info!;
    const fullKey = node.fullKey!;
    return (
        <button
            onClick={() => onSelectKey(fullKey)}
            className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-accent",
                selectedKey === fullKey && "bg-accent",
            )}
            style={indent}
        >
            <span className="size-3 shrink-0" />
            <span
                className={cn(
                    "shrink-0 rounded px-1 py-0.5 text-[10px] font-mono font-semibold uppercase",
                    TYPE_COLORS[info.type] ?? TYPE_COLORS.none,
                )}
            >
                {info.type}
            </span>
            <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
            {info.ttl > 0 && (
                <Badge variant="outline" className="shrink-0 text-[10px] h-4 px-1">
                    {info.ttl}s
                </Badge>
            )}
        </button>
    );
}
