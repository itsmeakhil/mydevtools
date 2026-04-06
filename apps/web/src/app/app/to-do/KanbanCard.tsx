"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Calendar, Tag, CheckCircle2, MoreHorizontal, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/app/app/to-do/types/Task";
import TaskEditDialog from "./TaskEditDialog";
import { differenceInDays, isPast, parseISO, format, isValid, parse } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./config/constants";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";

// Helper to safely parse and format dates
const safeFormatDate = (dateString: string | undefined, formatStr: string): string => {
  if (!dateString || dateString === "Unknown") return dateString || "Unknown";

  // Try parsing as ISO first (for new data)
  try {
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) {
      return format(isoDate, formatStr);
    }
  } catch {
    // Not an ISO string, continue
  }

  // Try parsing the formatted date string from TaskContext: "dd MMM yyyy, hh:mm a"
  try {
    const parsedDate = parse(dateString, "dd MMM yyyy, hh:mm a", new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, formatStr);
    }
  } catch {
    // Not in that format, continue
  }

  // Try parsing just the date part "dd MMM yyyy"
  try {
    const parts = dateString.split(',');
    if (parts.length > 0) {
      const datePart = parts[0].trim(); // "dd MMM yyyy"
      const parsedDate = parse(datePart, "dd MMM yyyy", new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, formatStr);
      }
    }
  } catch {
    // Fall through
  }

  // Try parsing as Date object (fallback)
  try {
    const date = new Date(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
  } catch {
    // Not a valid date string
  }

  // If all parsing fails, return a shortened version of the string
  return dateString.length > 15 ? dateString.substring(0, 15) + "..." : dateString;
};

// Helper to safely parse date for calculations
const safeParseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;

  // Try parsing as ISO first
  try {
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) {
      return isoDate;
    }
  } catch {
    // Not an ISO string
  }

  // Try parsing the formatted date string from TaskContext: "dd MMM yyyy, hh:mm a"
  try {
    const parsedDate = parse(dateString, "dd MMM yyyy, hh:mm a", new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  } catch {
    // Not in that format
  }

  // Try parsing just the date part "dd MMM yyyy"
  try {
    const parts = dateString.split(',');
    if (parts.length > 0) {
      const datePart = parts[0].trim();
      const parsedDate = parse(datePart, "dd MMM yyyy", new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
  } catch {
    // Fall through
  }

  // Try parsing as Date object (fallback)
  try {
    const date = new Date(dateString);
    if (isValid(date)) {
      return date;
    }
  } catch {
    // Not a valid date
  }

  return null;
};

interface KanbanCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

export default function KanbanCard({ task, onUpdateTask, onDeleteTask }: KanbanCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const { projects } = useProjectContext();
  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;

  // Check if task is overdue
  const dueDateObj = task.dueDate ? safeParseDate(task.dueDate) : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && task.status !== "completed";
  const dueInDays = dueDateObj ? differenceInDays(dueDateObj, new Date()) : null;

  const handleSaveEdit = async (updates: Partial<Task>) => {
    await onUpdateTask(task.id, updates);
  };

  const handleCopy = async () => {
    const taskText = `${task.text}${task.description ? `\n${task.description}` : ''}`;
    await navigator.clipboard.writeText(taskText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "group relative p-3 md:p-4 rounded-xl border transition-all duration-300",
          "hover:shadow-md hover:scale-[1.02] bg-card",
          "cursor-grab active:cursor-grabbing border-border",
          "hover:border-primary/30",
          isDragging && "shadow-2xl scale-110 z-50 rotate-2 opacity-90",
          task.status === "completed" && "opacity-75 bg-muted/30"
        )}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${task.text}`}
      >
        {/* Drag Handle - Enhanced */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted/80 pointer-events-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Status Icon and Task Text - Enhanced */}
        <div className="flex items-start gap-2.5 mb-3 pr-6">
          <div
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-all flex-shrink-0",
              statusConfig.bgColor,
              "group-hover:scale-110"
            )}
          >
            <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <h3
                className={cn(
                  "text-sm font-semibold flex-1 leading-snug",
                  task.status === "completed"
                    ? "text-muted-foreground line-through decoration-muted-foreground/50"
                    : "text-foreground"
                )}
                title={task.text}
              >
                {task.text}
              </h3>
              {task.priority && task.priority !== "medium" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(PRIORITY_CONFIG[task.priority].color, "flex-shrink-0")}>
                        {React.createElement(PRIORITY_CONFIG[task.priority].icon, { className: "h-3.5 w-3.5" })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{PRIORITY_CONFIG[task.priority].label} Priority</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Project Badge */}
            {project && (
              <div className="mb-1.5">
                <Badge
                  variant="outline"
                  className="gap-1.5 px-2 py-0.5 border text-[10px] font-normal inline-flex"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", project.color)} />
                  {project.name}
                </Badge>
              </div>
            )}

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Tags - Enhanced */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="text-[10px] px-1.5 py-0.5 h-5 gap-1 hover:bg-muted/50 transition-colors"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag.name}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                          +{task.tags.length - 2}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex flex-wrap gap-1">
                          {task.tags.slice(2).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              style={{ borderColor: tag.color, color: tag.color }}
                              className="text-xs"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Subtasks Progress - Enhanced */}
            {task.subTasks && task.subTasks.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">
                  {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Date and Actions - Enhanced */}
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 pt-2 border-t border-border/50">
          <div className="flex flex-col gap-1 truncate min-w-0 flex-1">
            {task.dueDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px]",
                      isOverdue && "text-red-500 font-semibold"
                    )}>
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {isOverdue
                          ? "Overdue"
                          : dueInDays === 0
                            ? "Today"
                            : dueInDays === 1
                              ? "Tomorrow"
                              : dueInDays !== null && dueInDays > 0
                                ? `${dueInDays}d`
                                : `${Math.abs(dueInDays!)}d ago`
                        }
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Due: {task.dueDate}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Mobile-friendly Actions */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 flex-shrink-0"
          >
            {/* Desktop: Hover Actions */}
            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditDialogOpen(true);
                }}
                aria-label="Edit task"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mobile: Menu Button */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label="Task options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Task
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteTask(task.id)}
                    className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <TaskEditDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </>
  );
}
