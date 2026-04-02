export interface Note {
    id: string;
    title: string;
    content: unknown; // JSON content from Tiptap
    parentId: string | null;
    icon?: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
}
