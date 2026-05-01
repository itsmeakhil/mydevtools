export interface Note {
    id: string;
    title: string;
    content: unknown; // JSON content from rich editor
    parentId: string | null;
    icon?: string;
    pinned?: boolean;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    userId: string;
}
