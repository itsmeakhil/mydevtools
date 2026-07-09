"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    IconBrandRedux,
    IconPlug,
    IconTrash,
    IconEdit,
    IconCheck,
    IconX,
    IconCopy,
    IconFolder,
    IconChevronRight,
} from "@tabler/icons-react";
import { SavedRedisConnection, RedisConnectionConfig } from "./types";
import { saveConnection, deleteConnection, updateConnection } from "./connection-service";
import { cn } from "@/lib/utils";

interface ConnectionFormProps {
    encryptionKey: CryptoKey;
    connections: SavedRedisConnection[];
    onConnect: (conn: SavedRedisConnection) => void;
    onConnectionsChange: (connections: SavedRedisConnection[]) => void;
    onClose: () => void;
}

function buildUrl(opts: { host: string; port: string; username: string; password: string; db: string; tls: boolean }): string {
    const proto = opts.tls ? "rediss" : "redis";
    const auth =
        opts.username || opts.password
            ? `${encodeURIComponent(opts.username)}:${encodeURIComponent(opts.password)}@`
            : "";
    const host = opts.host || "localhost";
    const port = opts.port || "6379";
    const db = opts.db ? `/${opts.db}` : "";
    return `${proto}://${auth}${host}:${port}${db}`;
}

export function ConnectionForm({
    encryptionKey,
    connections,
    onConnect,
    onConnectionsChange,
    onClose,
}: ConnectionFormProps) {
    const [mode, setMode] = useState<"url" | "builder">("url");
    const [redisUrl, setRedisUrl] = useState("redis://localhost:6379");
    const [name, setName] = useState("");
    const [folder, setFolder] = useState("");

    // Builder fields
    const [host, setHost] = useState("localhost");
    const [port, setPort] = useState("6379");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [dbIdx, setDbIdx] = useState("");
    const [useTls, setUseTls] = useState(false);

    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    // Group connections by folder
    const grouped = useMemo(() => {
        const map = new Map<string, SavedRedisConnection[]>();
        for (const c of connections) {
            const f = c.config?.folder?.trim() || "";
            const list = map.get(f) ?? [];
            list.push(c);
            map.set(f, list);
        }
        return [...map.entries()].sort(([a], [b]) => {
            if (a === "") return 1; // ungrouped last
            if (b === "") return -1;
            return a.localeCompare(b);
        });
    }, [connections]);

    const knownFolders = useMemo(
        () => Array.from(new Set(connections.map((c) => c.config?.folder).filter(Boolean) as string[])).sort(),
        [connections],
    );

    async function handleTestAndConnect() {
        const url = mode === "builder"
            ? buildUrl({ host, port, username, password, db: dbIdx, tls: useTls })
            : redisUrl.trim();
        if (!url) {
            toast.error("Redis URL is required");
            return;
        }

        setTesting(true);
        try {
            const res = await apiFetch("/api/redis-commander/connect", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl: url }),
            });
            const data = await res.json() as { success?: boolean; version?: string; error?: string };
            if (!res.ok || data.error) throw new Error(data.error || "Connection failed");
            toast.success(`Connected — Redis ${data.version}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Connection failed");
            setTesting(false);
            return;
        }
        setTesting(false);

        setSaving(true);
        try {
            const config: RedisConnectionConfig = { redisUrl: url };
            if (folder.trim()) config.folder = folder.trim();
            const conn = await saveConnection(config, name.trim() || "My Redis", encryptionKey);
            const updated = [conn, ...connections];
            onConnectionsChange(updated);
            toast.success("Connection saved");
            onConnect(conn);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteConnection(id);
            onConnectionsChange(connections.filter((c) => c.id !== id));
            toast.success("Connection deleted");
        } catch {
            toast.error("Failed to delete connection");
        }
    }

    async function handleRename(id: string) {
        if (!editName.trim()) return;
        try {
            await updateConnection(id, { name: editName.trim() }, encryptionKey);
            onConnectionsChange(
                connections.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))
            );
            setEditingId(null);
        } catch {
            toast.error("Failed to rename");
        }
    }

    async function handleClone(source: SavedRedisConnection) {
        if (!source.config) {
            toast.error("Source connection not decrypted");
            return;
        }
        try {
            const clone = await saveConnection(
                { ...source.config },
                `${source.name} (copy)`,
                encryptionKey,
            );
            onConnectionsChange([clone, ...connections]);
            toast.success("Cloned");
        } catch {
            toast.error("Clone failed");
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <Label>Connection Name</Label>
                        <Input
                            placeholder="My Redis"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Folder (optional)</Label>
                        <Input
                            list="rc-folders"
                            placeholder="Production / Dev / …"
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                        />
                        <datalist id="rc-folders">
                            {knownFolders.map((f) => <option key={f} value={f} />)}
                        </datalist>
                    </div>
                </div>

                <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "builder")}>
                    <TabsList className="h-7 w-full">
                        <TabsTrigger value="url" className="text-xs flex-1">URL</TabsTrigger>
                        <TabsTrigger value="builder" className="text-xs flex-1">Builder</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-1.5 mt-2">
                        <Label>Redis URL</Label>
                        <Input
                            placeholder="redis://localhost:6379 or rediss://user:pass@host:6380"
                            value={redisUrl}
                            onChange={(e) => setRedisUrl(e.target.value)}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports <code>redis://</code> and <code>rediss://</code> (TLS). Credentials
                            are encrypted before storage.
                        </p>
                    </TabsContent>
                    <TabsContent value="builder" className="mt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Host</Label>
                                <Input value={host} onChange={(e) => setHost(e.target.value)} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Port</Label>
                                <Input value={port} onChange={(e) => setPort(e.target.value)} className="h-8 text-xs font-mono" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Username (ACL)</Label>
                                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-8 text-xs font-mono" placeholder="default" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Password</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-8 text-xs font-mono" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">DB index</Label>
                                <Input value={dbIdx} onChange={(e) => setDbIdx(e.target.value)} className="h-8 text-xs font-mono" placeholder="0" />
                            </div>
                            <label className="flex items-end gap-2 text-xs pb-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useTls}
                                    onChange={(e) => setUseTls(e.target.checked)}
                                />
                                Use TLS (rediss://)
                            </label>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono break-all">
                            {buildUrl({ host, port, username, password: password ? "***" : "", db: dbIdx, tls: useTls })}
                        </p>
                    </TabsContent>
                </Tabs>

                <Button
                    className="w-full"
                    onClick={handleTestAndConnect}
                    disabled={testing || saving}
                >
                    <IconPlug className="mr-2 size-4" />
                    {testing ? "Testing…" : saving ? "Saving…" : "Test & Connect"}
                </Button>
            </div>

            {connections.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Saved Connections
                    </p>
                    {grouped.map(([folderName, list]) => (
                        <div key={folderName || "__ungrouped"} className="space-y-1.5">
                            {folderName && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <IconFolder className="size-3" />
                                    {folderName}
                                    <IconChevronRight className="size-3" />
                                    <span className="text-muted-foreground/60">{list.length}</span>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                {list.map((conn) => (
                                    <div
                                        key={conn.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                        )}
                                    >
                                        <IconBrandRedux className="size-4 shrink-0 text-red-500" />
                                        {editingId === conn.id ? (
                                            <>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="h-6 flex-1 text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleRename(conn.id);
                                                        if (e.key === "Escape") setEditingId(null);
                                                    }}
                                                    autoFocus
                                                />
                                                <Button size="icon" variant="ghost" className="size-6" onClick={() => handleRename(conn.id)}>
                                                    <IconCheck className="size-3" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="size-6" onClick={() => setEditingId(null)}>
                                                    <IconX className="size-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className="flex-1 cursor-pointer truncate hover:text-foreground"
                                                    onClick={() => {
                                                        onConnect(conn);
                                                        onClose();
                                                    }}
                                                >
                                                    {conn.name}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-6"
                                                    onClick={() => handleClone(conn)}
                                                    title="Clone"
                                                >
                                                    <IconCopy className="size-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-6"
                                                    onClick={() => {
                                                        setEditingId(conn.id);
                                                        setEditName(conn.name);
                                                    }}
                                                >
                                                    <IconEdit className="size-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-6 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(conn.id)}
                                                >
                                                    <IconTrash className="size-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
