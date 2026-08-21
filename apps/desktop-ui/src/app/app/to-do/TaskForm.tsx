"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, CircleDashed } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TaskFormProps {
  // The project comes from the central sidebar selection, not the form.
  onAddTask: (task: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

/** Compact inline key hint — a subtle kbd pill used in the composer footer. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border/70 bg-muted px-1 font-sans text-[10px] font-medium leading-none text-muted-foreground">
      {children}
    </kbd>
  );
}

export default function TaskForm({ onAddTask, inputRef }: TaskFormProps) {
  const t = useTranslations("Tasks.form");
  const [newTask, setNewTask] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const internalRef = inputRef || textareaRef;

  // Auto-resize textarea
  useEffect(() => {
    if (internalRef.current && "scrollHeight" in internalRef.current) {
      const textarea = internalRef.current as HTMLTextAreaElement;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newTask, internalRef]);

  const handleAddTask = () => {
    if (newTask.trim() === "") return;

    onAddTask(newTask.trim());
    setNewTask("");
    setIsMultiline(false);
    if (internalRef.current && "style" in internalRef.current) {
      (internalRef.current as HTMLTextAreaElement).style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    } else if (e.key === "Enter" && e.shiftKey) {
      setIsMultiline(true);
    } else if (e.key === "Escape") {
      setNewTask("");
      setIsMultiline(false);
      internalRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewTask(e.target.value);
    if (e.target.value.includes("\n")) setIsMultiline(true);
  };

  const hintsOpen = isFocused || newTask.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors duration-200",
        isFocused
          ? "border-primary/60 ring-1 ring-primary/25"
          : "border-border/70 hover:border-border",
      )}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        {/* Leading affordance — an empty task circle: signals "a task to create". */}
        <div
          className={cn(
            "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground/70",
          )}
          aria-hidden
        >
          <CircleDashed className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <Label htmlFor="task-input" className="sr-only">
            {t("addNewTaskLabel")}
          </Label>
          <Textarea
            id="task-input"
            ref={internalRef as React.RefObject<HTMLTextAreaElement>}
            value={newTask}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isMultiline ? t("multilinePlaceholder") : t("singlelinePlaceholder")
            }
            className="min-h-[32px] max-h-[120px] resize-none border-0 bg-transparent px-0 py-1.5 text-sm shadow-none focus-visible:ring-0"
            rows={1}
            aria-label={t("taskInputAria")}
            aria-describedby="task-hint"
          />

          {/* Shortcut hints — revealed only while composing, so they read as
              guidance in the moment rather than a mysterious always-on badge. */}
          <div
            id="task-hint"
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden text-[11px] text-muted-foreground transition-all duration-200",
              hintsOpen ? "mt-1 max-h-8 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd> {t("shortcutAddTask")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>⇧</Kbd>
              <Kbd>↵</Kbd> {t("shortcutNewLine")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd> {t("shortcutClear")}
            </span>
          </div>
        </div>

        <Button
          onClick={handleAddTask}
          size="sm"
          className="mt-0.5 h-8 shrink-0 gap-1.5 px-3"
          disabled={newTask.trim() === ""}
          aria-label={t("addButton")}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("addButton")}</span>
        </Button>
      </div>
    </div>
  );
}
