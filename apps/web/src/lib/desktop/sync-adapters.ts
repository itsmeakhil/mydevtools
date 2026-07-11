/**
 * Sync adapters: map each local tool_kind to its remote REST contract.
 * All remote calls go through remoteApiAuthed with the backend's personal
 * workspace active (the engine sets the workspace cookie first).
 */

export type SyncRow = {
  id: string;
  doc: Record<string, unknown>;
  updated_at: number; // local LWW clock (epoch ms)
  deleted_at: number | null;
  dirty: boolean;
  last_synced_at: number | null;
};

export type SyncAdapter = {
  /** Local entries.tool_kind */
  kind: string;
  /** GET path returning the full remote list (bare array after unwrap). */
  listPath: string;
  /** Unwrap a list response body into an array of docs. */
  unwrapList?: (parsed: unknown) => Record<string, unknown>[];
  /** POST path for creates. */
  createPath: string;
  /** Build the create body from a local doc. */
  createBody?: (doc: Record<string, unknown>) => unknown;
  /** PATCH path for updates (null = tool has no update, e.g. history). */
  updatePath: ((id: string) => string) | null;
  updateBody?: (doc: Record<string, unknown>) => unknown;
  /** DELETE path. */
  deletePath: (id: string) => string;
  /** Server generates ids on create (re-key local row afterwards). */
  serverAssignsId: boolean;
  /** Extract a comparable epoch-ms updatedAt from a remote doc (0 = none). */
  remoteUpdatedAt: (doc: Record<string, unknown>) => number;
};

function msOrIso(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

const stdUpdatedAt = (d: Record<string, unknown>) => msOrIso(d.updatedAt);

function envelopeAdapter(kind: string, prefix: string): SyncAdapter {
  return {
    kind,
    listPath: `/api/v1/${prefix}/entries`,
    createPath: `/api/v1/${prefix}/entries`,
    createBody: (d) => ({
      encryptedData: d.encryptedData,
      iv: d.iv,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }),
    updatePath: (id) => `/api/v1/${prefix}/entries/${id}`,
    updateBody: (d) => ({ encryptedData: d.encryptedData, iv: d.iv, updatedAt: d.updatedAt }),
    deletePath: (id) => `/api/v1/${prefix}/entries/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: stdUpdatedAt,
  };
}

function connectionsAdapter(kind: string, prefix: string): SyncAdapter {
  return {
    kind,
    listPath: `/api/v1/${prefix}/connections`,
    createPath: `/api/v1/${prefix}/connections`,
    createBody: (d) => {
      const { id: _id, userId: _u, createdAt: _c, lastUsedAt: _l, updatedAt: _up, ...rest } = d;
      return rest;
    },
    updatePath: (id) => `/api/v1/${prefix}/connections/${id}`,
    updateBody: (d) => {
      const { id: _id, userId: _u, createdAt: _c, lastUsedAt: _l, updatedAt: _up, ...rest } = d;
      return rest;
    },
    deletePath: (id) => `/api/v1/${prefix}/connections/${id}`,
    serverAssignsId: true,
    // updatedAt (content-edit clock) is the reliable LWW signal; fall back to
    // lastUsedAt/createdAt for legacy docs written before it existed.
    remoteUpdatedAt: (d) => msOrIso(d.updatedAt) || msOrIso(d.lastUsedAt) || msOrIso(d.createdAt),
  };
}

export const SYNC_ADAPTERS: SyncAdapter[] = [
  envelopeAdapter("password_entries", "password-manager"),
  envelopeAdapter("api_key_entries", "api-keys"),
  envelopeAdapter("environment_entries", "environment-manager"),
  connectionsAdapter("sql_connections", "sql-client"),
  connectionsAdapter("redis_connections", "redis-commander"),
  connectionsAdapter("nosql_connections", "nosql"),
  {
    kind: "code_snippets",
    listPath: "/api/v1/code-snippets",
    createPath: "/api/v1/code-snippets",
    updatePath: (id) => `/api/v1/code-snippets/${id}`,
    updateBody: (d) => ({
      title: d.title,
      language: d.language,
      code: d.code,
      tags: d.tags,
      pinned: d.pinned,
    }),
    deletePath: (id) => `/api/v1/code-snippets/${id}`,
    serverAssignsId: false, // POST accepts a client id
    remoteUpdatedAt: stdUpdatedAt,
  },
  {
    kind: "bookmark_folders",
    listPath: "/api/v1/bookmarks/snapshot",
    unwrapList: (p) => ((p as { folders?: Record<string, unknown>[] })?.folders ?? []),
    createPath: "/api/v1/bookmark-folders",
    updatePath: (id) => `/api/v1/bookmark-folders/${id}`,
    deletePath: (id) => `/api/v1/bookmark-folders/${id}`,
    serverAssignsId: false,
    remoteUpdatedAt: (d) => msOrIso(d.createdAt),
  },
  {
    kind: "bookmarks",
    listPath: "/api/v1/bookmarks/snapshot",
    unwrapList: (p) => ((p as { bookmarks?: Record<string, unknown>[] })?.bookmarks ?? []),
    createPath: "/api/v1/bookmarks",
    updatePath: (id) => `/api/v1/bookmarks/${id}`,
    deletePath: (id) => `/api/v1/bookmarks/${id}`,
    serverAssignsId: false,
    remoteUpdatedAt: stdUpdatedAt,
  },
  {
    kind: "notes",
    listPath: "/api/v1/notes?skip=0&limit=500",
    createPath: "/api/v1/notes",
    createBody: (d) => ({
      title: d.title,
      content: d.content,
      parentId: d.parentId,
      icon: d.icon,
      tags: d.tags,
    }),
    updatePath: (id) => `/api/v1/notes/${id}`,
    updateBody: (d) => ({
      title: d.title,
      content: d.content,
      parentId: d.parentId,
      icon: d.icon,
      pinned: d.pinned,
      tags: d.tags,
    }),
    deletePath: (id) => `/api/v1/notes/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: stdUpdatedAt,
  },
  {
    kind: "projects",
    listPath: "/api/v1/projects",
    createPath: "/api/v1/projects",
    createBody: (d) => ({ name: d.name, color: d.color }),
    updatePath: (id) => `/api/v1/projects/${id}`,
    updateBody: (d) => ({ name: d.name, color: d.color }),
    deletePath: (id) => `/api/v1/projects/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: (d) => msOrIso(d.createdAt),
  },
  {
    kind: "tasks",
    listPath: "/api/v1/tasks/export?status=all&projectId=all&assignee=all&skip=0&limit=10000",
    createPath: "/api/v1/tasks",
    createBody: (d) => {
      const { id: _id, created_by: _cb, createdAt: _ca, ...rest } = d;
      return rest;
    },
    updatePath: (id) => `/api/v1/tasks/${id}`,
    updateBody: (d) => {
      const { id: _id, created_by: _cb, createdAt: _ca, ...rest } = d;
      return rest;
    },
    deletePath: (id) => `/api/v1/tasks/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: (d) => msOrIso(d.completedAt) || msOrIso(d.createdAt),
  },
  {
    kind: "api_client_environments",
    listPath: "/api/v1/api-client/environments",
    createPath: "/api/v1/api-client/environments",
    createBody: (d) => ({ name: d.name }),
    updatePath: (id) => `/api/v1/api-client/environments/${id}`,
    updateBody: (d) => ({ name: d.name, variables: d.variables }),
    deletePath: (id) => `/api/v1/api-client/environments/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: () => 0,
  },
  {
    kind: "api_client_collections",
    listPath: "/api/v1/api-client/collections",
    createPath: "/api/v1/api-client/collections",
    createBody: (d) => ({ name: d.name }),
    updatePath: (id) => `/api/v1/api-client/collections/${id}`,
    updateBody: (d) => ({ name: d.name, items: d.items, workspace: d.workspace }),
    deletePath: (id) => `/api/v1/api-client/collections/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: () => 0,
  },
  {
    kind: "api_client_history",
    listPath: "/api/v1/api-client/history?limit=100",
    createPath: "/api/v1/api-client/history",
    createBody: (d) => {
      const { id: _id, ...rest } = d;
      return rest;
    },
    updatePath: null, // history entries are immutable
    deletePath: (id) => `/api/v1/api-client/history/${id}`,
    serverAssignsId: true,
    remoteUpdatedAt: (d) => msOrIso(d.timestamp),
  },
];
