"use client";

import { Textarea } from "@/components/ui/textarea";
import { decode, type DecoderKind } from "./value-decoders";

export function DecodedView({ raw, kind }: { raw: string; kind: DecoderKind }) {
    const result = decode(raw, kind);
    return (
        <div className="space-y-1">
            {result.error && (
                <div className="text-[11px] text-destructive">{result.error}</div>
            )}
            <Textarea
                value={result.text}
                readOnly
                className="min-h-[200px] resize-y bg-muted/40 font-mono text-xs"
            />
            <div className="text-[11px] text-muted-foreground">
                Read-only preview — switch to Plain to edit
            </div>
        </div>
    );
}
