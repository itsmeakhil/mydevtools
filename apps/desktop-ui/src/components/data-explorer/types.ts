import type React from "react";

/**
 * Opaque identifier for a data source type, persisted on every connection.
 * Never renamed once shipped — stored connections carry it.
 */
export type SourceId = string;

export interface UnifiedConnection {
    id: string;
    userId: string;
    sourceId: SourceId;
    name: string;
    /** Optional sidebar grouping; empty means ungrouped. */
    folder?: string;
    /** Environment accent colour (hex). Not sensitive. */
    color?: string | null;
    /** Blocks write operations in the UI when true. */
    readOnly?: boolean;
    /** AES-GCM ciphertext of the JSON-serialised adapter config. */
    encryptedData: string;
    iv: string;
    /** Decrypted client-side after fetch. Never sent to the store. */
    config?: unknown;
    createdAt: number;
    lastUsedAt: number;
    /** Content-edit clock (sync LWW); store-managed. */
    updatedAt?: number;
}

export interface UnifiedTab {
    id: string;
    connectionId: string;
    sourceId: SourceId;
    /** Tab strip label — e.g. a collection name or "db 0". */
    title: string;
    /** Tooltip second line — e.g. "prod-atlas › orders". */
    subtitle?: string;
    connectionColor?: string | null;
    readOnly?: boolean;
    /** Adapter-owned. The shell stores and passes it through, never inspects it. */
    state: unknown;
}

export interface OpenTabRequest<TabState = unknown> {
    /**
     * Stable per (connection, leaf). The shell builds the tab id as
     * `${connection.id}:${key}`, so reopening the same leaf focuses the
     * existing tab instead of duplicating it.
     */
    key: string;
    title: string;
    subtitle?: string;
    state: TabState;
}

export interface ConnectionFormValues<Config> {
    name: string;
    folder?: string;
    color?: string | null;
    readOnly?: boolean;
    config: Config;
}

export interface ConnectionFormProps<Config> {
    /** Existing values when editing; adapter defaults when creating. */
    initial: ConnectionFormValues<Config>;
    /** True while the shell is persisting. Disable the submit button. */
    saving: boolean;
    /** Persist or test-connection failure, already sanitised. Render inline. */
    error: string | null;
    onSubmit: (values: ConnectionFormValues<Config>) => void;
    onCancel: () => void;
}

export interface SidebarTreeProps<Config, TabState = unknown> {
    connection: UnifiedConnection;
    config: Config;
    openTab: (req: OpenTabRequest<TabState>) => void;
    /** Call after a destructive tree action so the shell refetches connections. */
    onConnectionsChanged: () => void;
    /**
     * Raw text from the shell's single search box, trimmed of nothing. The tree
     * filters its own levels (databases, collections, keyspaces…) with it —
     * the shell only filters connection *names*, so without this a search can
     * never reach inside a tree. Never render a second search input.
     */
    searchQuery: string;
    /**
     * Every saved connection sharing this connection's `sourceId`, including
     * this one, with `config` already decrypted. For cross-connection actions
     * such as "sync this collection into another server". The shell selects
     * them by `sourceId` equality and never inspects the configs.
     */
    siblings: UnifiedConnection[];
}

export interface PaneProps<Config, TabState> {
    connection: UnifiedConnection;
    config: Config;
    tab: UnifiedTab;
    state: TabState;
    setState: (updater: (prev: TabState) => TabState) => void;
}

export interface SourceAdapter<Config = unknown, TabState = unknown> {
    /** Must equal this adapter's key in SOURCES. */
    id: SourceId;
    /** Proper noun — never translated. */
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Tailwind text colour class for the sidebar group and tab glyph. */
    accent: string;

    blankConfig: () => Config;
    /**
     * Returns an i18n key path relative to the `DataExplorer` namespace (e.g.
     * `"validation.connectionStringRequired"`) identifying the problem, or
     * `null` when the config is valid. The dialog resolves the key via
     * `t(key)` before rendering it — never a raw message.
     */
    validate: (config: Config) => string | null;
    /**
     * Throws on failure. When there is a server-derived, already sanitised,
     * credential-free message to show, throw with that message and the
     * dialog renders it as-is. When there is nothing reportable, throw with
     * an empty message and the dialog supplies its own translated fallback
     * copy.
     */
    testConnection: (config: Config) => Promise<void>;

    ConnectionForm: React.ComponentType<ConnectionFormProps<Config>>;
    SidebarTree: React.ComponentType<SidebarTreeProps<Config, TabState>>;
    Pane: React.ComponentType<PaneProps<Config, TabState>>;
}
