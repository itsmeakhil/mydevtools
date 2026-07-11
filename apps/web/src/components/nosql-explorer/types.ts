export interface Database {
    name: string;
    sizeOnDisk: number;
    empty: boolean;
}

export interface Collection {
    name: string;
    type: string;
    options: unknown;
    info: {
        readOnly: boolean;
        uuid: string;
    };
    idIndex: {
        v: number;
        key: {
            _id: number;
        };
        name: string;
    };
    documentCount?: number | null;
}

export interface Document {
    _id: string;
    [key: string]: unknown;
}

export type FirestoreTimestampLike = {
    toDate: () => Date;
};

export interface SavedConnection {
    id: string;
    userId: string;
    /** AES-GCM ciphertext of the connectionString — what the backend stores and returns. */
    encryptedData: string;
    /** IV used during encryption. */
    iv: string;
    /**
     * Decrypted connectionString — populated client-side after fetching.
     * Never sent to or stored on the server.
     */
    connectionString: string;
    name: string;
    createdAt: number | FirestoreTimestampLike | null;
    lastUsedAt: number | FirestoreTimestampLike | null;
    /** Content-edit clock (sync LWW); server-managed. */
    updatedAt?: number | FirestoreTimestampLike | null;
}

export interface ConnectionState {
    isConnected: boolean;
    connectionString: string;
    databases: Database[];
    selectedDb: string | null;
    collections: Collection[];
    selectedCollection: string | null;
    documents: Document[];
    total?: number;
    loading: boolean;
    error: string | null;
}

export interface ExplorerTab {
    id: string;
    connectionId: string;
    connectionName: string;
    dbName: string;
    collectionName: string;
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    query: string;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    loading: boolean;
    error: string | null;
}
