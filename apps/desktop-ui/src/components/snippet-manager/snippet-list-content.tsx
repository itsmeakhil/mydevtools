"use client";

import { type RefObject } from "react";
import { useTranslations } from "next-intl";
import { IconCode, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { type CodeSnippet } from "@/store/snippet-manager-store";
import { SnippetListItem } from "./snippet-list-item";

export function SnippetListContent({
  scrollRef,
  className,
  pinnedVisible,
  unpinnedVisible,
  filtered,
  selectedId,
  snHasMore,
  sentinelRef,
  t,
  onPin,
  onSelect,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  className?: string;
  pinnedVisible: CodeSnippet[];
  unpinnedVisible: CodeSnippet[];
  filtered: CodeSnippet[];
  selectedId: string | null;
  snHasMore: boolean;
  snDisplayCount: number;
  sentinelRef: (el: HTMLDivElement | null) => void;
  t: ReturnType<typeof useTranslations<"SnippetManager">>;
  onPin: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div ref={scrollRef} className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
      <div className="space-y-0.5 pb-2 pr-1">
        {pinnedVisible.length > 0 && (
          <p className="px-1 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pinned
          </p>
        )}
        {pinnedVisible.map((sn) => (
          <SnippetListItem
            key={sn.id}
            sn={sn}
            selected={selectedId === sn.id}
            t={t}
            onPin={() => onPin(sn.id)}
            onClick={() => onSelect(sn.id)}
          />
        ))}
        {pinnedVisible.length > 0 && unpinnedVisible.length > 0 && (
          <p className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Snippets
          </p>
        )}
        {unpinnedVisible.map((sn) => (
          <SnippetListItem
            key={sn.id}
            sn={sn}
            selected={selectedId === sn.id}
            t={t}
            onPin={() => onPin(sn.id)}
            onClick={() => onSelect(sn.id)}
          />
        ))}
      </div>
      {snHasMore && (
        <div ref={sentinelRef} className="flex justify-center py-3">
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
        </div>
      )}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <IconCode className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">{t("emptySearch")}</p>
        </div>
      )}
    </div>
  );
}
