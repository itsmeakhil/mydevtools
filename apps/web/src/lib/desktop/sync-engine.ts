/**
 * Personal-workspace sync engine (desktop only).
 *
 * Reconciles the local SQLCipher store ("local-personal" workspace) with the
 * user's REMOTE personal workspace when the per-workspace sync toggle is on.
 * Envelope tools ship opaque ciphertext both ways — the same account's master
 * key decrypts both sides, so sync never touches crypto.
 *
 * Push (dirty rows first): tombstoned → DELETE (404 ok); never-synced → POST
 * create then re-key the local row to the server id; else PATCH. Pull: full
 * list per tool; remote newer (LWW on updatedAt) → overwrite local; local
 * clean+synced+absent-remote → delete local; local dirty rows are never
 * overwritten by pull (they win until pushed).
 *
 * ponytail: rounds only run while the LOCAL personal workspace is active —
 * pushing requires the backend active_workspace cookie pointed at the remote
 * personal workspace, and flipping it mid-use of a shared workspace would
 * misroute the user's own requests. Revisit with per-request workspace
 * scoping if backend support lands.
 */
import { localApi } from "./bridge";
import { hasRemoteSession, remoteApiAuthed } from "./remote";
import { activeWorkspaceId, LOCAL_WORKSPACE_ID } from "./router";
import { SYNC_ADAPTERS, type SyncAdapter, type SyncRow } from "./sync-adapters";

const LOCAL_WS = LOCAL_WORKSPACE_ID;

let running = false;
let timer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function localJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await localApi(method, path, body !== undefined ? JSON.stringify(body) : undefined);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`local sync call failed: ${method} ${path} → ${res.status}`);
  }
  return JSON.parse(res.body || "null") as T;
}

export async function isSyncEnabled(): Promise<boolean> {
  const r = await localJson<{ enabled: boolean }>(
    "GET",
    `/desktop/sync/settings?workspace_id=${LOCAL_WS}`
  );
  return r.enabled;
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await localJson("POST", "/desktop/sync/settings", { workspace_id: LOCAL_WS, enabled });
  if (enabled) void syncNow();
}

/** A discarded version preserved when two devices edited the same row. */
export type SyncConflict = {
  id: string;
  tool_kind: string;
  entry_id: string;
  loser_side: "local" | "remote";
  loser_doc: Record<string, unknown>;
  loser_updated_at: number;
  winner_updated_at: number;
  created_at: number;
};

/** Open (unreviewed) sync conflicts, newest first. */
export async function listConflicts(): Promise<SyncConflict[]> {
  return localJson<SyncConflict[]>(
    "GET",
    `/desktop/sync/conflicts?workspace_id=${LOCAL_WS}`
  );
}

/** Mark a conflict reviewed so it drops off the open list (kept for audit). */
export async function dismissConflict(id: string): Promise<void> {
  await localJson("POST", "/desktop/sync/conflicts/dismiss", { id });
}

/**
 * Restore the discarded version: re-applies it locally as a fresh edit (so it
 * wins the next round), resolves the conflict, and kicks a sync + refresh.
 */
export async function restoreConflict(id: string): Promise<void> {
  await localJson("POST", "/desktop/sync/conflicts/restore", { id });
  window.dispatchEvent(new CustomEvent("mydevtools:desktop-data-mutated"));
  void syncNow();
}

/** Find the user's remote personal workspace id (requires cloud session). */
async function remotePersonalWorkspaceId(): Promise<string | null> {
  const res = await remoteApiAuthed("GET", "/api/v1/workspaces-api/workspaces");
  if (res.status < 200 || res.status >= 300) return null;
  try {
    const list = JSON.parse(res.body) as { id: string; is_personal: boolean }[];
    return list.find((w) => w.is_personal)?.id ?? null;
  } catch {
    return null;
  }
}

async function setRemoteActiveWorkspace(id: string): Promise<boolean> {
  const res = await remoteApiAuthed(
    "POST",
    "/api/v1/workspaces-api/workspaces/active",
    JSON.stringify({ workspace_id: id })
  );
  return res.status >= 200 && res.status < 300;
}

async function fetchRemoteList(adapter: SyncAdapter): Promise<Record<string, unknown>[]> {
  const res = await remoteApiAuthed("GET", adapter.listPath);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`remote list failed: ${adapter.listPath} → ${res.status}`);
  }
  const parsed = JSON.parse(res.body || "[]");
  const list = adapter.unwrapList ? adapter.unwrapList(parsed) : parsed;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

async function resolve(
  kind: string,
  id: string,
  action: "mark-synced" | "apply-remote" | "remove-local",
  extra?: Record<string, unknown>
): Promise<void> {
  await localJson("POST", "/desktop/sync/resolve", {
    workspace_id: LOCAL_WS,
    tool_kind: kind,
    id,
    action,
    ...extra,
  });
}

/**
 * Persist the losing side of a concurrent edit so LWW never destroys data.
 * Fire-and-forget: a failure to archive must not abort the sync round (the
 * winning value still syncs), but we surface it so it's not silent.
 */
async function archiveConflict(
  kind: string,
  entryId: string,
  loserDoc: Record<string, unknown>,
  loserSide: "local" | "remote",
  loserUpdatedAt: number,
  winnerUpdatedAt: number
): Promise<void> {
  try {
    await localJson("POST", "/desktop/sync/conflict", {
      workspace_id: LOCAL_WS,
      tool_kind: kind,
      entry_id: entryId,
      loser_side: loserSide,
      loser_doc: loserDoc,
      loser_updated_at: loserUpdatedAt,
      winner_updated_at: winnerUpdatedAt,
    });
    window.dispatchEvent(new CustomEvent("mydevtools:desktop-conflict"));
  } catch (e) {
    console.warn(`[sync] failed to archive ${kind} conflict for ${entryId}:`, e);
  }
}

async function pushRow(
  adapter: SyncAdapter,
  row: SyncRow,
  remoteBefore: Map<string, Record<string, unknown>> | null
): Promise<void> {
  const id = row.id;
  const syncedAt = row.last_synced_at ?? 0;
  // A remote copy whose updatedAt advanced past our last sync means another
  // device edited this row while we were away — a true concurrent conflict.
  const remoteDoc = remoteBefore?.get(id);
  const remoteTs = remoteDoc ? adapter.remoteUpdatedAt(remoteDoc) : 0;
  const remoteChangedSinceSync = remoteTs > 0 && remoteTs > syncedAt;

  if (row.deleted_at !== null) {
    if (row.last_synced_at !== null) {
      // Local delete would wipe a remote edit we never saw — archive it first.
      if (remoteChangedSinceSync && remoteDoc) {
        await archiveConflict(adapter.kind, id, remoteDoc, "remote", remoteTs, row.updated_at);
      }
      const res = await remoteApiAuthed("DELETE", adapter.deletePath(id));
      if (res.status >= 500) throw new Error(`remote delete failed (${res.status})`);
      // 2xx or 404 both mean the entry is gone remotely.
    }
    await resolve(adapter.kind, id, "mark-synced");
    return;
  }
  if (row.last_synced_at === null) {
    const body = adapter.createBody ? adapter.createBody(row.doc) : row.doc;
    const res = await remoteApiAuthed("POST", adapter.createPath, JSON.stringify(body));
    if (res.status < 200 || res.status >= 300) {
      // 409 (e.g. snippet id already exists remotely) → fall through to update.
      if (res.status === 409 && adapter.updatePath) {
        const upd = adapter.updateBody ? adapter.updateBody(row.doc) : row.doc;
        const r2 = await remoteApiAuthed("PATCH", adapter.updatePath(id), JSON.stringify(upd));
        if (r2.status < 200 || r2.status >= 300) throw new Error(`push update failed (${r2.status})`);
        await resolve(adapter.kind, id, "mark-synced");
        return;
      }
      throw new Error(`push create failed: ${adapter.createPath} → ${res.status}`);
    }
    const created = JSON.parse(res.body || "{}") as Record<string, unknown>;
    if (adapter.serverAssignsId && typeof created.id === "string" && created.id !== id) {
      await resolve(adapter.kind, id, "mark-synced", { new_id: created.id, new_doc: { ...row.doc, ...created } });
    } else {
      await resolve(adapter.kind, id, "mark-synced");
    }
    return;
  }
  if (!adapter.updatePath) {
    await resolve(adapter.kind, id, "mark-synced"); // immutable kind (history)
    return;
  }
  // Edit-vs-edit: both sides changed this row since our last sync. Keep
  // last-writer-wins on updatedAt, but never destroy the loser — archive it.
  if (remoteChangedSinceSync && remoteDoc) {
    if (row.updated_at >= remoteTs) {
      // Local is newer → local wins; the remote version is the loser.
      await archiveConflict(adapter.kind, id, remoteDoc, "remote", remoteTs, row.updated_at);
      // fall through and PATCH the local version over remote
    } else {
      // Remote is newer → remote wins; keep our local edit as the loser and
      // adopt the remote version locally instead of pushing.
      await archiveConflict(adapter.kind, id, row.doc, "local", row.updated_at, remoteTs);
      await resolve(adapter.kind, id, "apply-remote", {
        doc: remoteDoc,
        updated_at: remoteTs || undefined,
      });
      return;
    }
  }
  const body = adapter.updateBody ? adapter.updateBody(row.doc) : row.doc;
  const res = await remoteApiAuthed("PATCH", adapter.updatePath(id), JSON.stringify(body));
  if (res.status === 404) {
    // Deleted remotely but edited locally — local edit wins: recreate.
    await resolve(adapter.kind, id, "mark-synced");
    const createBody = adapter.createBody ? adapter.createBody(row.doc) : row.doc;
    const r2 = await remoteApiAuthed("POST", adapter.createPath, JSON.stringify(createBody));
    if (r2.status >= 200 && r2.status < 300) {
      const created = JSON.parse(r2.body || "{}") as Record<string, unknown>;
      if (adapter.serverAssignsId && typeof created.id === "string" && created.id !== id) {
        await resolve(adapter.kind, id, "mark-synced", { new_id: created.id });
      }
    }
    return;
  }
  if (res.status < 200 || res.status >= 300) throw new Error(`push update failed (${res.status})`);
  await resolve(adapter.kind, id, "mark-synced");
}

async function syncTool(adapter: SyncAdapter): Promise<void> {
  const rows = await localJson<SyncRow[]>(
    "GET",
    `/desktop/sync/rows?workspace_id=${LOCAL_WS}&tool_kind=${adapter.kind}`
  );

  // Snapshot remote BEFORE pushing so we can detect rows another device changed
  // since our last sync. Best-effort: if it fails we push without conflict
  // detection (pull below still fetches the live list).
  let remoteBefore: Map<string, Record<string, unknown>> | null = null;
  try {
    const list = await fetchRemoteList(adapter);
    remoteBefore = new Map(
      list.filter((d) => typeof d.id === "string").map((d) => [d.id as string, d])
    );
  } catch {
    remoteBefore = null;
  }

  // 1. Push all dirty rows (conflict-aware).
  for (const row of rows.filter((r) => r.dirty)) {
    await pushRow(adapter, row, remoteBefore);
  }

  // 2. Pull: reconcile against the full remote list.
  const fresh = await localJson<SyncRow[]>(
    "GET",
    `/desktop/sync/rows?workspace_id=${LOCAL_WS}&tool_kind=${adapter.kind}`
  );
  const local = new Map(fresh.map((r) => [r.id, r]));
  const remote = await fetchRemoteList(adapter);
  const remoteIds = new Set<string>();

  for (const doc of remote) {
    const id = typeof doc.id === "string" ? doc.id : null;
    if (!id) continue;
    remoteIds.add(id);
    const l = local.get(id);
    if (!l) {
      await resolve(adapter.kind, id, "apply-remote", {
        doc,
        updated_at: adapter.remoteUpdatedAt(doc) || undefined,
      });
      continue;
    }
    if (l.dirty || l.deleted_at !== null) continue; // local changes win until pushed
    const remoteTs = adapter.remoteUpdatedAt(doc);
    if (remoteTs === 0 || remoteTs > l.updated_at) {
      await resolve(adapter.kind, id, "apply-remote", { doc, updated_at: remoteTs || undefined });
    }
  }

  // 3. Remote deletions: local clean + previously synced + absent remotely.
  for (const r of fresh) {
    if (!r.dirty && r.deleted_at === null && r.last_synced_at !== null && !remoteIds.has(r.id)) {
      await resolve(adapter.kind, r.id, "remove-local");
    }
  }
}

/**
 * Sync the user-preferences singleton (kv-backed, not in the entries table).
 * Container-level last-writer-wins on `updatedAt`: whichever side is newer
 * PATCHes the whole editable preferences object onto the other. A fresh local
 * baseline has updatedAt=0 so the cloud copy wins until the user changes a pref.
 */
const PREF_FIELDS = [
  "theme",
  "accentColor",
  "locale",
  "enabledTools",
  "toolFavorites",
  "pinnedToolsByWorkspace",
  "toolStats",
] as const;

async function syncPreferences(): Promise<void> {
  const PATH = "/api/v1/user-preferences";
  const local = await localJson<Record<string, unknown>>("GET", PATH);
  const remoteRes = await remoteApiAuthed("GET", PATH);
  if (remoteRes.status < 200 || remoteRes.status >= 300) return;
  const remote = JSON.parse(remoteRes.body || "{}") as Record<string, unknown>;

  const localTs = Number(local?.updatedAt ?? 0);
  const remoteTs = Number(remote?.updatedAt ?? 0);
  if (localTs === remoteTs) return;

  const pick = (o: Record<string, unknown>) =>
    Object.fromEntries(PREF_FIELDS.filter((k) => k in o).map((k) => [k, o[k]]));

  if (localTs > remoteTs) {
    await remoteApiAuthed("PATCH", PATH, JSON.stringify(pick(local)));
  } else {
    await localJson("PATCH", PATH, pick(remote));
  }
}

/** Run one full sync round. Safe to call repeatedly; rounds never overlap. */
export async function syncNow(): Promise<void> {
  if (running) return;
  if (!hasRemoteSession()) return;
  if (activeWorkspaceId() !== LOCAL_WS) return; // see ponytail note above
  if (!(await isSyncEnabled())) return;

  running = true;
  try {
    const personalId = await remotePersonalWorkspaceId();
    if (!personalId) return;
    if (!(await setRemoteActiveWorkspace(personalId))) return;

    for (const adapter of SYNC_ADAPTERS) {
      try {
        await syncTool(adapter);
      } catch (e) {
        console.warn(`[sync] ${adapter.kind} round failed:`, e);
      }
    }
    try {
      await syncPreferences();
    } catch (e) {
      console.warn("[sync] preferences round failed:", e);
    }
    window.dispatchEvent(new CustomEvent("mydevtools:desktop-synced"));
  } finally {
    running = false;
  }
}

/** Debounced trigger — call after local mutations. */
export function scheduleSyncSoon(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void syncNow(), 5_000);
}

/** Start periodic + event-driven syncing (idempotent). */
export function startSyncEngine(): void {
  if (timer) return;
  timer = setInterval(() => void syncNow(), 5 * 60_000);
  window.addEventListener("online", () => void syncNow());
  window.addEventListener("mydevtools:desktop-session", () => void syncNow());
  window.addEventListener("mydevtools:desktop-data-mutated", scheduleSyncSoon);
  void syncNow();
}
