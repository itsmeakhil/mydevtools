export type RedisValueType = "string" | "list" | "set" | "zset" | "hash" | "stream" | "ReJSON-RL" | "none";

/**
 * Search mode type for Redis key searching
 * - 'glob': Pattern matching with * (any chars) and ? (single char) wildcards
 * - 'regex': Regular expression pattern matching
 * - 'fuzzy': Fuzzy matching where all characters appear in order (case-insensitive)
 */
export type SearchMode = 'glob' | 'regex' | 'fuzzy';

/**
 * Search state for managing key search in KeyBrowser
 * Tracks search input, detected mode, user overrides, errors, and UI state
 */
export interface SearchState {
  /** Current search input string */
  input: string;

  /** Auto-detected search mode based on pattern analysis */
  detectedMode: SearchMode;

  /** User-selected search mode override (null if using auto-detect) */
  userModeOverride: SearchMode | null;

  /** Error message if regex compilation fails, null if valid */
  regexError: string | null;

  /** Count of keys matching the current search pattern */
  matchCount: number;

  /** Whether the advanced search panel is open */
  showAdvanced: boolean;
}

export interface RedisConnectionConfig {
    redisUrl: string;
    /** Optional folder for sidebar grouping; lives in encrypted blob so it round-trips with the config. */
    folder?: string;
}

export interface SavedRedisConnection {
    id: string;
    userId: string;
    /** AES-GCM ciphertext of the JSON-serialised RedisConnectionConfig. */
    encryptedData: string;
    iv: string;
    name: string;
    /** Optional folder for grouping in sidebar; empty = ungrouped. */
    folder?: string;
    createdAt: number;
    lastUsedAt: number;
    /** Content-edit clock (sync LWW); server-managed. */
    updatedAt?: number;
    /** Populated client-side after decryption — never sent to the server. */
    config?: RedisConnectionConfig;
}

export interface RedisKeyInfo {
    key: string;
    type: RedisValueType;
    ttl: number;
}

export interface ZSetMember {
    member: string;
    score: number;
}

export interface RedisKeyDetail extends RedisKeyInfo {
    value: string | string[] | ZSetMember[] | Record<string, string> | null;
}

export interface CommandResult {
    result: unknown;
    executionTime: number;
    error?: string;
}

export interface RedisTab {
    id: string;
    connectionId: string;
    connectionName: string;
    redisUrl: string;
}
