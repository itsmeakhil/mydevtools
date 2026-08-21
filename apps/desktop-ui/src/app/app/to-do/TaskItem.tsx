"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { formatElapsed, getElapsedMinutes } from "@/app/app/to-do/utils/taskTimeUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit, Calendar, MoreVertical, Copy, Check, Trash2, CheckCircle2, Archive, ArchiveRestore, Play, Pause, Timer
} from "lucide-react";

const TaskEditDialog = lazy(() => import("./TaskEditDialog"));
import { LazyBoundary } from "./components/LazyBoundary";
import { differenceInDays, isPast } from "date-fns";
import { safeParseDate } from "@/app/app/to-do/utils/taskDate";
import { Task } from "@/app/app/to-do/types/Task";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "./config/constants";
import { useStatuses } from "./hooks/useStatuses";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { useTranslations } from "next-intl";
import { AssigneePicker } from "./components/AssigneePicker";

interface TaskItemProps {
  task: Task;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

function TaskItem({
  task,
  onUpdateStatus,
  onUpdateTask,
  onDeleteTask,
}: TaskItemProps) {
  const tItem = useTranslations("Tasks.taskItem");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
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
  const { projects } = useProjectContext();
  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

  const { statuses, getStatus } = useStatuses();
  const statusConfig = getStatus(task.status);
  const StatusIcon = statusConfig.icon;
  const isCompleted = task.status === "completed";

  // Check if task is overdue
  const dueDateObj = task.dueDate ? safeParseDate(task.dueDate) : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isCompleted;
  const dueInDays = dueDateObj ? differenceInDays(dueDateObj, new Date()) : null;

  // Swipe logic
  const x = useMotionValue(0);
  const opacityRight = useTransform(x, [50, 100], [0, 1]);
  const opacityLeft = useTransform(x, [-50, -100], [0, 1]);
  const bgRight = useTransform(x, [0, 100], ["rgba(34, 197, 94, 0)", "rgba(34, 197, 94, 0.2)"]); // Green
  const bgLeft = useTransform(x, [0, -100], ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.2)"]); // Red

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 80) {
      // Swipe Right -> Complete
      handleQuickComplete();
    } else if (info.offset.x < -80) {
      // Swipe Left -> Delete
      if (window.confirm(tItem("confirmDelete"))) {
        onDeleteTask(task.id);
      }
    }
  };

  const handleSaveEdit = async (updates: Partial<Task>) => {
    await onUpdateTask(task.id, updates);
  };

  const handleStatusChange = (newStatus: Task["status"]) => {
    const wasCompleted = task.status === "completed";
    const willComplete = newStatus === "completed";

    onUpdateStatus(task.id, newStatus);

    // Show completion animation
    if (!wasCompleted && willComplete) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 2000);

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleCopy = () => {
    const taskText = `${task.text}${task.description ? `\n${task.description}` : ''}`;
    void copyToClipboard(taskText, { silent: true });
  };

  const handleQuickComplete = () => {
    if (task.status !== "completed") {
      handleStatusChange("completed");
    } else {
      handleStatusChange("not-started");
    }
  };

  const priority = task.priority && task.priority !== "medium" ? PRIORITY_CONFIG[task.priority] : null;
  const subTasksDone = task.subTasks?.filter((st) => st.completed).length ?? 0;

  return (
    <>
      <li className="relative group" role="listitem" aria-label={`Task: ${task.text}`}>
        {/* Swipe Backgrounds */}
        <div className="absolute inset-0 rounded-md overflow-hidden flex pointer-events-none">
          <motion.div
            style={{ opacity: opacityRight, backgroundColor: bgRight }}
            className="flex-1 flex items-center justify-start pl-6"
          >
            <motion.div style={{ scale: opacityRight }}>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </motion.div>
          </motion.div>
          <motion.div
            style={{ opacity: opacityLeft, backgroundColor: bgLeft }}
            className="flex-1 flex items-center justify-end pr-6"
          >
            <motion.div style={{ scale: opacityLeft }}>
              <Trash2 className="h-5 w-5 text-red-600" />
            </motion.div>
          </motion.div>
        </div>

        {/* Row */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={cn(
            "relative flex items-center gap-1.5 h-11 px-2 sm:px-3 rounded-md transition-colors",
            "hover:bg-muted/50",
            isCompleted && "opacity-60",
            justCompleted && "bg-green-500/5 ring-1 ring-green-500/30"
          )}
        >
          {/* Priority */}
          <span className="w-4 flex items-center justify-center shrink-0">
            {priority &&
              React.createElement(priority.icon, {
                className: cn("h-3.5 w-3.5", priority.color),
                "aria-label": priority.label,
              })}
          </span>

          {/* Status selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center size-7 rounded-md shrink-0 transition-colors",
                  "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
                aria-label={tItem("changeStatusAria")}
              >
                <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {statuses.map((config) => (
                <DropdownMenuItem key={config.id} onClick={() => handleStatusChange(config.id)}>
                  <config.icon className={cn("h-4 w-4 mr-2", config.color)} />
                  {config.label}
                  {task.status === config.id && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Title — opens the edit dialog */}
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            aria-label={tItem("editTaskAria")}
          >
            <span
              className={cn(
                "block text-sm font-medium truncate",
                isCompleted
                  ? "text-muted-foreground line-through decoration-muted-foreground/50"
                  : "text-foreground"
              )}
            >
              {task.text}
            </span>
          </button>

          {/* Right-side properties */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Subtasks count */}
            {task.subTasks && task.subTasks.length > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <CheckCircle2 className="h-3 w-3" />
                {subTasksDone}/{task.subTasks.length}
              </span>
            )}

            {/* Tags — dot chips, first two */}
            {task.tags && task.tags.length > 0 && (
              <span className="hidden lg:flex items-center gap-1">
                {task.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="gap-1.5 rounded-full h-5 px-2 text-[10px] font-normal text-muted-foreground bg-background"
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />
                    {tag.name}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
                )}
              </span>
            )}

            {/* Project — dot chip */}
            {project && (
              <Badge
                variant="outline"
                className="hidden md:flex gap-1.5 rounded-full h-5 px-2 text-[10px] font-normal text-muted-foreground bg-background"
              >
                <span className={cn("size-1.5 rounded-full", project.color)} aria-hidden />
                {project.name}
              </Badge>
            )}

            {/* Timer chip */}
            {(elapsed > 0 || task.isTimerRunning || task.timeEstimate) && (
              <span
                className={cn(
                  "hidden sm:flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-medium select-none",
                  task.isTimerRunning
                    ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground"
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
                {elapsed > 0 ? formatElapsed(elapsed) : "0m"}
                {task.timeEstimate ? ` / ${formatElapsed(task.timeEstimate)}` : ""}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px] shrink-0",
                  isOverdue ? "text-red-500 font-medium" : "text-orange-500/90 dark:text-orange-400"
                )}
              >
                <Calendar className="h-3 w-3" />
                {isOverdue
                  ? "Overdue"
                  : dueInDays === 0
                    ? "Today"
                    : dueInDays === 1
                      ? "Tmrw"
                      : dueInDays !== null && dueInDays > 0
                        ? `${dueInDays}d`
                        : `${Math.abs(dueInDays!)}d ago`}
              </span>
            )}

            {/* Assignee */}
            <AssigneePicker
              assigneeUid={task.assigneeUid}
              onChange={(uid) => onUpdateTask(task.id, { assigneeUid: uid })}
            />

            {/* Overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
                  aria-label={tItem("taskOptionsAria")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {tItem("editTask")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {tItem("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {tItem("copyTask")}
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
                  {tItem("deleteTask")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </li>

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

export default React.memo(TaskItem);
