"use client";

import { useMemo, useState, useEffect } from "react";
import { IconChevronRight, IconFolder, IconFolderOpen } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RedisKeyInfo, RedisValueType } from "./types";
import { buildTree, ancestorPaths, type TreeNode } from "./tree-utils";

const TYPE_COLORS: Record<RedisValueType | string, string> = {
    string: "bg-blue-500/10 text-blue-500",
    list: "bg-amber-500/10 text-amber-500",
    set: "bg-green-500/10 text-green-500",
    zset: "bg-purple-500/10 text-purple-500",
    hash: "bg-rose-500/10 text-rose-500",
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
                    className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-foreground/[0.05]"
                    style={indent}
                >
                    <IconChevronRight
                        className={cn(
                            "size-3 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                        )}
                    />
                    {isOpen ? (
                        <IconFolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                        <IconFolder className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
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
                "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
                selectedKey === fullKey
                    ? "bg-primary/[0.12] text-foreground"
                    : "hover:bg-foreground/[0.05]",
            )}
            style={indent}
        >
            <span className="size-3 shrink-0" />
            <span
                className={cn(
                    "shrink-0 rounded-sm px-1.5 text-[11px] font-medium leading-4",
                    TYPE_COLORS[info.type] ?? TYPE_COLORS.none,
                )}
            >
                {info.type}
            </span>
            <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
            {info.ttl > 0 && (
                <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[11px] tabular-nums">
                    {info.ttl}s
                </Badge>
            )}
        </button>
    );
}
