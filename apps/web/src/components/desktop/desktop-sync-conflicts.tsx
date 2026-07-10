"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isDesktop } from "@/lib/desktop/is-desktop";
import type { SyncConflict } from "@/lib/desktop/sync-engine";

/** Human labels for the tool_kinds that can conflict during sync. */
const KIND_LABELS: Record<string, string> = {
  password_entries: "Password",
  api_key_entries: "API key",
  environment_entries: "Environment variable",
  sql_connections: "SQL connection",
  redis_connections: "Redis connection",
  nosql_connections: "NoSQL connection",
  code_snippets: "Code snippet",
  bookmarks: "Bookmark",
  bookmark_folders: "Bookmark folder",
  notes: "Note",
  projects: "Project",
  tasks: "Task",
  api_client_environments: "API client environment",
  api_client_collections: "API client collection",
  api_client_history: "API client history",
};

/** Best-effort human label for a discarded doc — plaintext only, never secrets. */
function docLabel(doc: Record<string, unknown>): string | null {
  for (const key of ["name", "title", "text"] as const) {
    const v = doc[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function when(ms: number): string {
  if (!ms) return "unknown time";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "unknown time";
  }
}

/**
 * Desktop-only panel listing sync conflicts — the versions that last-writer-wins
 * discarded when two devices edited the same row. Nothing is lost: each loser is
 * kept and can be restored. Renders nothing on web or when there are none.
 */
export function DesktopSyncConflicts() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    // Promise-chain (not await) so the load stays off the effect's sync path.
    const load = () =>
      void import("@/lib/desktop/sync-engine")
        .then((m) => m.listConflicts())
        .then(setConflicts)
        .catch(() => {});
    load();
    window.addEventListener("mydevtools:desktop-conflict", load);
    window.addEventListener("mydevtools:desktop-synced", load);
    return () => {
      window.removeEventListener("mydevtools:desktop-conflict", load);
      window.removeEventListener("mydevtools:desktop-synced", load);
    };
  }, []);

  if (!isDesktop() || conflicts.length === 0) return null;

  const restore = async (c: SyncConflict) => {
    setBusyId(c.id);
    try {
      const { restoreConflict } = await import("@/lib/desktop/sync-engine");
      await restoreConflict(c.id);
      setConflicts((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Restored the other version — syncing it now.");
    } catch {
      toast.error("Couldn't restore that version.");
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (c: SyncConflict) => {
    setBusyId(c.id);
    try {
      const { dismissConflict } = await import("@/lib/desktop/sync-engine");
      await dismissConflict(c.id);
      setConflicts((prev) => prev.filter((x) => x.id !== c.id));
    } catch {
      toast.error("Couldn't dismiss that conflict.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.04] shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Sync conflicts
          <Badge variant="secondary" className="ml-1">
            {conflicts.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Another device edited the same item while you were offline. The most
          recent edit is what you see now — the older version was kept here so
          nothing is lost. Restore it to make it current, or dismiss once
          reviewed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {conflicts.map((c) => {
          const label = docLabel(c.loser_doc);
          const kept = c.loser_side === "local" ? "this Mac's" : "the cloud";
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {KIND_LABELS[c.tool_kind] ?? c.tool_kind}
                  {label ? <span className="text-muted-foreground"> · {label}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Discarded {kept} version · edited {when(c.loser_updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => void restore(c)}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => void dismiss(c)}
                  aria-label="Dismiss conflict"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
