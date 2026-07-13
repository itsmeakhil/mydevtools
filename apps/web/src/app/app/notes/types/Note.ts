export interface Note {
    id: string;
    title: string;
    // Markdown string. Legacy notes may still hold the old rich-editor tree
    // (a JSON object); those are converted to markdown on read and re-saved as
    // a string on next edit. Typed `unknown` so both shapes are handled safely.
    content: unknown;
    parentId: string | null;
    icon?: string;
    pinned?: boolean;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    userId: string;
}
