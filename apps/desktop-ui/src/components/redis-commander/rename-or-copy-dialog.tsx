"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface RenameOrCopyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    actionLabel: string;
    sourceKey: string;
    targetKey: string;
    onTargetKeyChange: (v: string) => void;
    overwrite: boolean;
    onOverwriteChange: (v: boolean) => void;
    busy: boolean;
    onConfirm: () => void;
}

export function RenameOrCopyDialog({
    open,
    onOpenChange,
    title,
    actionLabel,
    sourceKey,
    targetKey,
    onTargetKeyChange,
    overwrite,
    onOverwriteChange,
    busy,
    onConfirm,
}: RenameOrCopyDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Source</Label>
                        <Input value={sourceKey} disabled className="font-mono text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Destination</Label>
                        <Input
                            value={targetKey}
                            onChange={(e) => onTargetKeyChange(e.target.value)}
                            autoFocus
                            className="font-mono text-xs h-8"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !busy && targetKey.trim()) onConfirm();
                            }}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                            checked={overwrite}
                            onCheckedChange={(c) => onOverwriteChange(c === true)}
                        />
                        Overwrite if destination exists
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={busy || !targetKey.trim() || targetKey === sourceKey}>
                        {busy ? "…" : actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
