"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconX, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { SearchMode } from "./types";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  detectedMode: SearchMode;
  matchCount: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  regexError?: string | null;
}

const modeIcons: Record<SearchMode, { icon: string; label: string }> = {
  glob: { icon: "⚡", label: "Glob: *=any, ?=one" },
  fuzzy: { icon: "🔍", label: "Fuzzy: all chars in order" },
  regex: { icon: ".*", label: "Regex: full pattern" },
};

export function SearchBar({
  value,
  onChange,
  onClear,
  detectedMode,
  matchCount,
  showAdvanced,
  onToggleAdvanced,
  regexError,
}: SearchBarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClear();
      }
    },
    [onClear]
  );

  const modeInfo = modeIcons[detectedMode];

  return (
    <div className="space-y-2">
      {/* Error message */}
      {regexError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {regexError}
        </div>
      )}

      {/* Search input bar */}
      <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-1.5 focus-within:ring-1 focus-within:ring-ring">
        {/* Mode indicator */}
        <div
          className="flex h-5 min-w-6 items-center justify-center rounded-sm bg-muted font-mono text-xs font-medium text-muted-foreground"
          title={modeInfo.label}
        >
          {modeInfo.icon}
        </div>

        {/* Input field */}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search keys… (glob, regex, or fuzzy)"
          className="h-auto flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
        />

        {/* Match count badge */}
        {value && (
          <div className="flex h-5 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {matchCount}
          </div>
        )}

        {/* Clear button */}
        {value && (
          <Button
            size="icon"
            variant="ghost"
            className="size-5 shrink-0"
            onClick={onClear}
            title="Clear search (Esc)"
          >
            <IconX className="size-3.5" />
          </Button>
        )}

        {/* Toggle advanced panel */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "size-6 shrink-0 transition-transform",
            showAdvanced && "rotate-180"
          )}
          onClick={onToggleAdvanced}
          title={showAdvanced ? "Hide advanced options" : "Show advanced options"}
        >
          {showAdvanced ? (
            <IconChevronUp className="size-3.5" />
          ) : (
            <IconChevronDown className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
