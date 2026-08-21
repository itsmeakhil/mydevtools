"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Calendar, CheckCircle2, MoreHorizontal, Trash2, Copy, Check, Play, Pause, Timer, Archive, ArchiveRestore } from "lucide-react";
import { formatElapsed, getElapsedMinutes } from "@/app/app/to-do/utils/taskTimeUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/app/app/to-do/types/Task";

const TaskEditDialog = lazy(() => import("./TaskEditDialog"));
import { LazyBoundary } from "./components/LazyBoundary";
import { differenceInDays, isPast } from "date-fns";
import { safeParseDate } from "@/app/app/to-do/utils/taskDate";
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
import { PRIORITY_CONFIG } from "./config/constants";
import { useStatuses } from "./hooks/useStatuses";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { AssigneePicker } from "./components/AssigneePicker";

interface KanbanCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

export default function KanbanCard({ task, onUpdateTask, onDeleteTask }: KanbanCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const [elapsed, setElapsed] = useState(() => getElapsedMinutes(task));

  useEffect(() => {
    setElapsed(getElapsedMinutes(task));
    if (!task.isTimerRunning) return;
    const interval = setInterval(() => setElapsed(getElapsedMinutes(task)), 1000);
    return () => clearInterval(interval);
  }, [task.isTimerRunning, task.timeLogged, task.timerStartedAt]);

  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(task.id, { isTimerRunning: true, timerStartedAt: new Date().toISOString() });
  };

  const handleStopTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(task.id, { isTimerRunning: false, timeLogged: Math.round(getElapsedMinutes(task)) });
  };
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

  const { getStatus } = useStatuses();
  const statusConfig = getStatus(task.status);
  const StatusIcon = statusConfig.icon;

  // Check if task is overdue
  const dueDateObj = task.dueDate ? safeParseDate(task.dueDate) : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && task.status !== "completed";
  const dueInDays = dueDateObj ? differenceInDays(dueDateObj, new Date()) : null;

  const handleSaveEdit = async (updates: Partial<Task>) => {
    await onUpdateTask(task.id, updates);
  };

  const handleCopy = () => {
    const taskText = `${task.text}${task.description ? `\n${task.description}` : ''}`;
    void copyToClipboard(taskText, { silent: true });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "group relative p-3 rounded-md border border-border/50 bg-card shadow-xs transition-all duration-200",
          "hover:shadow-sm hover:border-border",
          "cursor-grab active:cursor-grabbing",
          isDragging && "shadow-2xl scale-105 z-50 rotate-1 opacity-90",
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

        {/* Header (priority left, status right) + content */}
        <div className="mb-2">
          <div className="flex items-center justify-between gap-1.5 mb-1.5 pr-6">
            {task.priority && task.priority !== "medium" ? (
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
            ) : (
              <span />
            )}
            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", statusConfig.color)} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h3
              className={cn(
                "text-sm font-semibold leading-snug line-clamp-2",
                task.status === "completed"
                  ? "text-muted-foreground line-through decoration-muted-foreground/50"
                  : "text-foreground"
              )}
              title={task.text}
            >
              {task.text}
            </h3>

            {/* Project Badge */}
            {project && (
              <div>
                <Badge
                  variant="outline"
                  className="gap-1.5 px-2 py-0 h-5 rounded-full border text-[10px] font-normal text-muted-foreground bg-background inline-flex"
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
                    className="text-[10px] px-2 py-0 h-5 gap-1.5 rounded-full text-muted-foreground bg-background hover:bg-muted/50 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />
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
            {/* Timer chip */}
            {(elapsed > 0 || task.isTimerRunning || task.timeEstimate) && (
              <div
                className={cn(
                  "flex items-center gap-1 w-fit rounded-md px-1.5 py-0.5 text-[10px] select-none",
                  task.isTimerRunning
                    ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    : "bg-muted/50 text-muted-foreground"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={task.isTimerRunning ? handleStopTimer : handleStartTimer}
                  className="hover:opacity-70 transition-opacity cursor-pointer"
                  aria-label={task.isTimerRunning ? "Stop timer" : "Start timer"}
                >
                  {task.isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
                <Timer className="h-3 w-3" />
                <span>
                  {elapsed > 0 ? formatElapsed(elapsed) : "0m"}
                  {task.timeEstimate ? ` / ${formatElapsed(task.timeEstimate)}` : ""}
                </span>
              </div>
            )}
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
            {/* Assignee */}
            <AssigneePicker
              assigneeUid={task.assigneeUid}
              onChange={(uid) => onUpdateTask(task.id, { assigneeUid: uid })}
            />

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
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTask(task.id, { archived: !task.archived });
                }}
                aria-label={task.archived ? "Restore task" : "Archive task"}
              >
                {task.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
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
                  <DropdownMenuItem onClick={() => onUpdateTask(task.id, { archived: !task.archived })}>
                    {task.archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
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

      {isEditDialogOpen && (
        <LazyBoundary fallback={null}>
          <Suspense fallback={null}>
            <TaskEditDialog
              task={task}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSave={handleSaveEdit}
            />
          </Suspense>
        </LazyBoundary>
      )}
    </>
  );
}
