"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IconBrandRedux, IconPlug, IconTrash, IconEdit, IconCheck, IconX } from "@tabler/icons-react";
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

export function ConnectionForm({
    encryptionKey,
    connections,
    onConnect,
    onConnectionsChange,
    onClose,
}: ConnectionFormProps) {
    const [redisUrl, setRedisUrl] = useState("redis://localhost:6379");
    const [name, setName] = useState("");
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    async function handleTestAndConnect() {
        if (!redisUrl.trim()) {
            toast.error("Redis URL is required");
            return;
        }

        setTesting(true);
        try {
            const res = await fetch("/api/redis-commander/connect", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl }),
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
            const config: RedisConnectionConfig = { redisUrl };
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

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <Label>Connection Name</Label>
                    <Input
                        placeholder="My Redis"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
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
                </div>
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
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Saved Connections
                    </p>
                    <div className="space-y-1.5">
                        {connections.map((conn) => (
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
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-6"
                                            onClick={() => handleRename(conn.id)}
                                        >
                                            <IconCheck className="size-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-6"
                                            onClick={() => setEditingId(null)}
                                        >
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
            )}
        </div>
    );
}
