"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Note } from "@/app/app/notes/types/Note";

interface MoveDialogProps {
    note: Note;
    notes: Note[];
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onMove: (newParentId: string | null) => void;
}

export function MoveDialog({ note, notes, open, onOpenChange, onMove }: MoveDialogProps) {
    const [query, setQuery] = useState("");
    const handleOpenChange = useCallback((v: boolean) => {
        if (!v) setQuery("");
        onOpenChange(v);
    }, [onOpenChange]);
    const targets = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notes
            .filter((n) => n.id !== note.id && n.parentId !== note.id)
            .filter((n) => !q || (n.title || "").toLowerCase().includes(q));
    }, [notes, note.id, query]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Move note</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder="Search destination…"
                        className="pl-8 h-9 text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                    <button
                        className="text-left px-3 py-2 rounded hover:bg-muted text-sm cursor-pointer"
                        onClick={() => { onMove(null); handleOpenChange(false); }}
                        type="button"
                    >
                        <span className="text-muted-foreground">/</span> Root
                    </button>
                    {targets.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</div>
                    )}
                    {targets.map((n) => (
                        <button
                            key={n.id}
                            className="text-left px-3 py-2 rounded hover:bg-muted text-sm truncate flex items-center gap-2 cursor-pointer"
                            onClick={() => { onMove(n.id); handleOpenChange(false); }}
                            type="button"
                        >
                            {n.icon
                                ? <span className="flex-shrink-0">{n.icon}</span>
                                : <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                            <span className="truncate">{n.title || "Untitled"}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
