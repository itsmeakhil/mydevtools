"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Sparkles, Keyboard } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { ProjectManagerDialog } from "./components/ProjectManagerDialog";
import { Folder } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface TaskFormProps {
  onAddTask: (task: string, projectId?: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export default function TaskForm({ onAddTask, inputRef }: TaskFormProps) {
  const t = useTranslations("Tasks.form");
  const [newTask, setNewTask] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const internalRef = inputRef || textareaRef;
  const { projects } = useProjectContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");

  // Load last selected project from localStorage
  useEffect(() => {
    const lastProjectId = localStorage.getItem("lastSelectedProjectId");
    if (lastProjectId && projects.some(p => p.id === lastProjectId)) {
      setSelectedProjectId(lastProjectId);
    }
  }, [projects]);

  // Save selected project to localStorage
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId !== "none") {
      localStorage.setItem("lastSelectedProjectId", projectId);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (internalRef.current && 'scrollHeight' in internalRef.current) {
      const textarea = internalRef.current as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newTask, internalRef]);

  const handleAddTask = () => {
    if (newTask.trim() === "") return;

    if (selectedProjectId === "none") {
      toast.error(t("errorSelectProject"));
      return;
    }

    onAddTask(newTask.trim(), selectedProjectId);
    setNewTask("");
    setIsMultiline(false);
    // Reset textarea height
    if (internalRef.current && 'style' in internalRef.current) {
      (internalRef.current as HTMLTextAreaElement).style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit (unless Shift is held)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
    // Shift+Enter for new line
    else if (e.key === "Enter" && e.shiftKey) {
      setIsMultiline(true);
      // Allow default behavior (new line)
    }
    // Escape to clear
    else if (e.key === "Escape") {
      setNewTask("");
      setIsMultiline(false);
      internalRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewTask(e.target.value);
    if (e.target.value.includes('\n')) {
      setIsMultiline(true);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isFocused
          ? "border-primary shadow-lg ring-2 ring-primary/20 bg-card"
          : "border shadow-sm hover:shadow-md bg-card"
      )}
    >
      <div className="p-4">
        <div className="flex gap-3 items-start">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center p-2 rounded-lg min-w-[40px] h-[40px] transition-all",
            isFocused ? "bg-primary/20 scale-110" : "bg-primary/10"
          )}>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          {/* Input Field */}
          <div className="flex-1 space-y-2">
            <div className="relative">
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
                placeholder={isMultiline ? t("multilinePlaceholder") : t("singlelinePlaceholder")}
                className={cn(
                  "min-h-[40px] max-h-[120px] resize-none text-sm transition-all pr-[150px]",
                  isFocused
                    ? "border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
                rows={1}
                aria-label={t("taskInputAria")}
                aria-describedby="task-hint"
              />

              {/* Project Selection */}
              <div className="absolute right-1 top-1 z-10">
                <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-[140px] h-[32px] border-dashed text-xs bg-background/50 hover:bg-background shadow-none">
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder={t("projectPlaceholder")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="none" className="text-xs text-muted-foreground">{t("selectProject")}</SelectItem>
                    {projects.length > 0 && <SelectSeparator />}
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", project.color)} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <div className="p-1">
                      <ProjectManagerDialog />
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Helper text */}
            <div className="flex items-center justify-between">
              <p
                id="task-hint"
                className="text-xs text-muted-foreground flex items-center gap-2"
              >
                <span className="hidden sm:inline">
                  {isMultiline ? t("hintMultiline") : t("hintSingleline")}
                </span>
                <span className="sm:hidden">{t("hintSingleline")}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t("shortcutsAria")}
                      >
                        <Keyboard className="h-3 w-3" />
                        <span className="hidden md:inline">{t("shortcutsLabel")}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      <div className="space-y-1">
                        <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> {t("shortcutAddTask")}</div>
                        <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> {t("shortcutNewLine")}</div>
                        <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> {t("shortcutClear")}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
            </div>
          </div>

          {/* Add Task Button */}
          <Button
            onClick={handleAddTask}
            size="default"
            className="gap-2 h-[40px] px-4 shadow-sm hover:shadow-md transition-all"
            disabled={newTask.trim() === ""}
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("addButton")}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
