"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTrash, IconDownload, IconUpload } from "@tabler/icons-react";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import { BulkExportDialog } from "./bulk-export-dialog";
import { BulkImportDialog } from "./bulk-import-dialog";

interface BulkActionsProps {
    redisUrl: string;
    db: number;
    onChanged: () => void;
}

export function BulkActions({ redisUrl, db, onChanged }: BulkActionsProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
            >
                <IconTrash className="size-3.5" /> Bulk Delete
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setExportOpen(true)}
            >
                <IconDownload className="size-3.5" /> Export
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setImportOpen(true)}
            >
                <IconUpload className="size-3.5" /> Import
            </Button>

            <BulkDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                redisUrl={redisUrl}
                db={db}
                onChanged={onChanged}
            />
            <BulkExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                redisUrl={redisUrl}
                db={db}
            />
            <BulkImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                redisUrl={redisUrl}
                db={db}
                onChanged={onChanged}
            />
        </>
    );
}
