"use client";

import React, { useState, useEffect } from "react";
import { formatElapsed, getElapsedMinutes } from "@/app/app/to-do/utils/taskTimeUtils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteButton from "../../../components/ui/DeleteButton";
import {
  Edit, Calendar, Tag, MoreVertical, Copy, Check, Trash2, CheckCircle2, Archive, ArchiveRestore, Play, Pause, Timer
} from "lucide-react";
import TaskEditDialog from "./TaskEditDialog";
import { differenceInDays, isPast, parseISO, format, isValid, parse } from "date-fns";
import { Task } from "@/app/app/to-do/types/Task";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./config/constants";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { useTranslations } from "next-intl";

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

interface TaskItemProps {
  task: Task;
  onUpdateStatus: (id: string, newStatus: Task["status"]) => void;
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
  const tStatus = useTranslations("Tasks.status");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG["not-started"];
  const StatusIcon = statusConfig.icon;

  // Check if task is overdue
  const dueDateObj = task.dueDate ? safeParseDate(task.dueDate) : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && task.status !== "completed";
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

  const handleCopy = async () => {
    const taskText = `${task.text}${task.description ? `\n${task.description}` : ''}`;
    await navigator.clipboard.writeText(taskText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickComplete = () => {
    if (task.status !== "completed") {
      handleStatusChange("completed");
    } else {
      handleStatusChange("not-started");
    }
  };

  return (
    <>
      <li
        className="relative mb-3 group"
        role="listitem"
        aria-label={`Task: ${task.text}`}
      >
        {/* Swipe Backgrounds */}
        <div className="absolute inset-0 rounded-xl overflow-hidden flex pointer-events-none">
          {/* Left Background (Complete) */}
          <motion.div
            style={{ opacity: opacityRight, backgroundColor: bgRight }}
            className="flex-1 flex items-center justify-start pl-6"
          >
            <motion.div style={{ scale: opacityRight }}>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </motion.div>
          </motion.div>

          {/* Right Background (Delete) */}
          <motion.div
            style={{ opacity: opacityLeft, backgroundColor: bgLeft }}
            className="flex-1 flex items-center justify-end pr-6"
          >
            <motion.div style={{ scale: opacityLeft }}>
              <Trash2 className="h-6 w-6 text-red-600" />
            </motion.div>
          </motion.div>
        </div>

        {/* Draggable Content */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={cn(
            "relative p-3 md:p-4 rounded-2xl border transition-all duration-300 bg-card",
            "active:scale-[0.98]", // Subtle touch feedback
            task.status === "completed" ? "opacity-60 bg-muted/40" : "shadow-sm border-muted-foreground/10",
            justCompleted && "animate-pulse ring-2 ring-green-500/50"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-start gap-3 md:gap-4">
            {/* Status Icon - Clickable for quick toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleQuickComplete}
                    className={cn(
                      "flex items-center justify-center p-2.5 rounded-lg transition-all duration-200",
                      "hover:scale-110 active:scale-95 cursor-pointer",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      statusConfig.bgColor,
                      statusConfig.color,
                      "min-w-[44px] h-[44px]"
                    )}
                    aria-label={`Mark as ${task.status === "completed" ? "not completed" : "completed"}`}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to toggle completion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Task Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                <h3
                  className={cn(
                    "block text-[15px] md:text-base font-semibold leading-tight transition-all flex-1 min-w-0",
                    task.status === "completed"
                      ? "text-muted-foreground line-through decoration-muted-foreground/50"
                      : "text-foreground"
                  )}
                >
                  {task.text}
                </h3>
                {task.priority && task.priority !== "medium" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      PRIORITY_CONFIG[task.priority].color,
                      PRIORITY_CONFIG[task.priority].bgColor,
                      PRIORITY_CONFIG[task.priority].borderColor,
                      "gap-1.5 px-2 py-0.5 border flex-shrink-0"
                    )}
                  >
                    {React.createElement(PRIORITY_CONFIG[task.priority].icon, { className: "h-3.5 w-3.5" })}
                    <span className="text-xs font-medium">{PRIORITY_CONFIG[task.priority].label}</span>
                  </Badge>
                )}
                {project && (
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-2 py-0.5 border text-[10px] font-normal flex-shrink-0"
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", project.color)} />
                    {project.name}
                  </Badge>
                )}
              </div>

              {task.description && (
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {task.description}
                </p>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                      className="text-[10px] md:text-xs gap-1 px-2 py-0.5 hover:bg-muted/50 transition-colors"
                    >
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Subtasks Progress */}
              {task.subTasks && task.subTasks.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {task.subTasks.filter(st => st.completed).length} / {task.subTasks.length} subtasks
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[100px]">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Tags & Metadata Row */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Priority Badge */}
                {task.priority && task.priority !== "medium" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      PRIORITY_CONFIG[task.priority].color,
                      PRIORITY_CONFIG[task.priority].bgColor,
                      PRIORITY_CONFIG[task.priority].borderColor,
                      "gap-1 px-1.5 py-0 border h-5 text-[10px] font-medium"
                    )}
                  >
                    {PRIORITY_CONFIG[task.priority].label}
                  </Badge>
                )}

                {/* Due Date */}
                {task.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1 px-1.5 py-0 h-5 rounded-md text-[10px] font-medium border",
                    isOverdue
                      ? "text-red-500 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30"
                      : "text-muted-foreground bg-muted/50 border-transparent"
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {isOverdue
                        ? "Overdue"
                        : dueInDays === 0
                          ? "Today"
                          : dueInDays === 1
                            ? "Tmrw"
                            : dueInDays !== null && dueInDays > 0
                              ? `${dueInDays}d`
                              : `${Math.abs(dueInDays!)}d ago`
                      }
                    </span>
                  </div>
                )}

                {/* Timer chip */}
                {(elapsed > 0 || task.isTimerRunning || task.timeEstimate) && (
                  <div
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0 h-5 rounded-md text-[10px] font-medium select-none",
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
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center">
              {/* Status Dropdown - Hidden on mobile to save space, accessible via menu */}
              <div className="hidden md:block">
                <Select
                  value={task.status}
                  onValueChange={(newStatus) => handleStatusChange(newStatus as Task["status"])}
                >
                  <SelectTrigger
                    className="w-[130px] h-8 text-xs focus:ring-2 focus:ring-primary"
                    aria-label={tItem("changeStatusAria")}
                  >
                    <SelectValue placeholder={tItem("statusPlaceholder")} />
                  </SelectTrigger>

                  <SelectContent>
                    {Object.values(STATUS_CONFIG).map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        <div className="flex items-center gap-2">
                          <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                          <span>{tStatus(`${config.id}.label` as any)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Context Menu - Always visible on mobile, hover on desktop */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={tItem("taskOptionsAria")}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{tItem("statusHeading")}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {Object.values(STATUS_CONFIG).map((config) => (
                          <Button
                            key={config.id}
                            variant={task.status === config.id ? "secondary" : "ghost"}
                            size="sm"
                            className="justify-start h-7 text-xs"
                            onClick={() => handleStatusChange(config.id as Task["status"])}
                          >
                            <config.icon className={cn("h-3.5 w-3.5 mr-2", config.color)} />
                            {tStatus(`${config.id}.label` as any)}
                          </Button>
                        ))}
                      </div>
                    </div>
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

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className={cn(
                    "h-8 w-8 p-0 transition-opacity",
                    isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                  )}
                  aria-label={tItem("editTaskAria")}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateTask(task.id, { archived: !task.archived })}
                  className={cn(
                    "h-8 w-8 p-0 transition-opacity",
                    isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                  )}
                  aria-label={task.archived ? "Restore task" : "Archive task"}
                >
                  {task.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>

                <div className={cn(
                  "transition-opacity flex items-center justify-center",
                  isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                )}>
                  <DeleteButton onDelete={() => onDeleteTask(task.id)} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </li >

      <TaskEditDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </>
  );
}

export default React.memo(TaskItem);
