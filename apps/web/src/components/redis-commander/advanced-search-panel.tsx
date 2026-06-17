"use client";

import { Button } from "@/components/ui/button";
import type { SearchMode } from "./types";

interface AdvancedPanelProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  onResetToAuto: () => void;
}

const modeExplanations: Record<SearchMode, string> = {
  glob: "Glob: Use * (any chars) and ? (single char). E.g. user:*",
  fuzzy: "Fuzzy: All chars in pattern must appear in order. E.g. userprofile",
  regex: "Regex: Full regex support. E.g. ^session:[0-9]+$",
};

export function AdvancedSearchPanel({
  currentMode,
  onModeChange,
  onResetToAuto,
}: AdvancedPanelProps) {
  return (
    <div className="space-y-3 border-b bg-muted/30 p-2">
      {/* Current mode explanation */}
      <div className="text-xs text-muted-foreground leading-relaxed">
        {modeExplanations[currentMode]}
      </div>

      {/* Mode toggle buttons */}
      <div className="flex gap-2">
        <Button
          variant={currentMode === "glob" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("glob")}
          className="flex-1"
        >
          Glob
        </Button>
        <Button
          variant={currentMode === "fuzzy" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("fuzzy")}
          className="flex-1"
        >
          Fuzzy
        </Button>
        <Button
          variant={currentMode === "regex" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("regex")}
          className="flex-1"
        >
          Regex
        </Button>
      </div>

      {/* Reset to Auto-Detect button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetToAuto}
        className="w-full text-xs"
      >
        Reset to Auto-Detect
      </Button>
    </div>
  );
}
