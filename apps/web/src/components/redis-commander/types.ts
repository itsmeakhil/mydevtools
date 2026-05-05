export type RedisValueType = "string" | "list" | "set" | "zset" | "hash" | "none";

export interface RedisConnectionConfig {
    redisUrl: string;
}

export interface SavedRedisConnection {
    id: string;
    userId: string;
    /** AES-GCM ciphertext of the JSON-serialised RedisConnectionConfig. */
    encryptedData: string;
    iv: string;
    name: string;
    createdAt: number;
    lastUsedAt: number;
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
