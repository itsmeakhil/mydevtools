"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { NOTE_TEMPLATES, type NoteTemplate } from "@/app/app/notes/utils/noteTemplates";

export function TemplatePickerDialog({
    open,
    onOpenChange,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelect: (tpl: NoteTemplate) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Choose a template</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-2">
                    {NOTE_TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => { onSelect(tpl); onOpenChange(false); }}
                            className={cn(
                                "flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left",
                                "hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                            )}
                        >
                            <span className="text-2xl">{tpl.icon}</span>
                            <span className="text-sm font-semibold">{tpl.label}</span>
                            <span className="text-[11px] text-muted-foreground">{tpl.description}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
