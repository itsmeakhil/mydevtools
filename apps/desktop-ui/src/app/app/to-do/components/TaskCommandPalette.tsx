"use client";

import { useEffect } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTaskContext } from "@/app/app/to-do/context/TaskContext";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { useStatuses } from "@/app/app/to-do/hooks/useStatuses";
import { Archive, ArchiveRestore, LayoutGrid, List, Plus, X, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TaskCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
  onNewTask: () => void;
}

export function TaskCommandPalette({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  onNewTask,
}: TaskCommandPaletteProps) {
  const tFilters = useTranslations("Tasks.filters");
  const { statuses } = useStatuses();
  const {
    filterStatus,
    setFilterStatus,
    filterProject,
    setFilterProject,
    showArchived,
    setShowArchived,
  } = useTaskContext();
  const { projects } = useProjectContext();

  // Close on Escape happens automatically via Dialog.
  // Cmd+K toggle is handled by parent — we only render.
  const close = () => onOpenChange(false);

  const clearAll = () => {
    setFilterStatus("all");
    setFilterProject("all");
    close();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or filter — try status, project, view…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { onNewTask(); close(); }}>
            <Plus className="mr-2 h-4 w-4" />
            New task
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={clearAll}>
            <X className="mr-2 h-4 w-4" />
            Clear all filters
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Filter by status">
          <CommandItem
            onSelect={() => { setFilterStatus("all"); close(); }}
            data-active={filterStatus === "all"}
          >
            <span className="mr-2 h-2 w-2 rounded-full bg-muted-foreground/60" />
            {tFilters("all")}
            {filterStatus === "all" && <CommandShortcut>active</CommandShortcut>}
          </CommandItem>
          {statuses.map((cfg) => (
            <CommandItem
              key={cfg.id}
              onSelect={() => { setFilterStatus(cfg.id); close(); }}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", cfg.dot)} />
              {cfg.label}
              {filterStatus === cfg.id && <CommandShortcut>active</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Filter by project">
          <CommandItem onSelect={() => { setFilterProject("all"); close(); }}>
            <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
            {tFilters("allProjects")}
            {filterProject === "all" && <CommandShortcut>active</CommandShortcut>}
          </CommandItem>
          {projects.map((p) => (
            <CommandItem
              key={p.id}
              onSelect={() => { setFilterProject(p.id); close(); }}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", p.color)} />
              {p.name}
              {filterProject === p.id && <CommandShortcut>active</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="View">
          <CommandItem onSelect={() => { onViewModeChange("kanban"); close(); }}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
            {viewMode === "kanban" && <CommandShortcut>active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => { onViewModeChange("list"); close(); }}>
            <List className="mr-2 h-4 w-4" />
            List
            {viewMode === "list" && <CommandShortcut>active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => { setShowArchived(!showArchived); close(); }}>
            {showArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
            {showArchived ? "Hide archived" : "Show archived"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}
