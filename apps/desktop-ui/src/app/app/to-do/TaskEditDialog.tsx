"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Task, TaskPriority, TaskStatus, SubTask, TaskTag } from "@/app/app/to-do/types/Task";
import { Calendar as CalendarIcon, Plus, X, Tag, CheckCircle2, Circle, Flame, AlertCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { Folder, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspaceMembers, memberLabel } from "@/app/app/to-do/hooks/useWorkspaceMembers";
import { useStatuses } from "./hooks/useStatuses";

interface TaskEditDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: Partial<Task>) => Promise<void>;
}

const priorityConfig = {
  high: { label: "High", icon: Flame, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-950", borderColor: "border-red-500" },
  medium: { label: "Medium", icon: AlertCircle, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950", borderColor: "border-orange-500" },
  low: { label: "Low", icon: Zap, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950", borderColor: "border-blue-500" },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([\da-f]{6}|[\da-f]{3})$/i);
  if (!m) return null;
  const h = m[1].length === 3
    ? m[1].split("").map((c) => c + c).join("")
    : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastVsWhite(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const l = relLuminance(rgb);
  return (1.0 + 0.05) / (l + 0.05);
}

const taskEditSchema = z.object({
  text: z.string().trim().min(1, "Title is required").max(200, "Max 200 characters"),
  description: z.string().max(2000, "Max 2000 characters").optional(),
  timeEstimate: z
    .number()
    .int("Must be a whole number")
    .positive("Must be positive")
    .optional(),
});

type TaskEditErrors = Partial<Record<"text" | "description" | "timeEstimate", string>>;

const predefinedTags = [
  { name: "Work", color: "#3b82f6" },
  { name: "Personal", color: "#10b981" },
  { name: "Urgent", color: "#ef4444" },
  { name: "Important", color: "#f59e0b" },
  { name: "Bug", color: "#dc2626" },
  { name: "Feature", color: "#8b5cf6" },
  { name: "Review", color: "#ec4899" },
  { name: "Meeting", color: "#06b6d4" },
];

export default function TaskEditDialog({ task, open, onOpenChange, onSave }: TaskEditDialogProps) {
  const t = useTranslations("Tasks.editDialog");
  const { statuses } = useStatuses();
  const tPriorities = useTranslations("Tasks.priorities");
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [newSubTask, setNewSubTask] = useState("");
  const [customTagName, setCustomTagName] = useState("");
  const [customTagColor, setCustomTagColor] = useState("#3b82f6");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [errors, setErrors] = useState<TaskEditErrors>({});
  const isMobile = useIsMobile();
  const { projects } = useProjectContext();
  const { members, isShared } = useWorkspaceMembers();

  useEffect(() => {
    if (open && task) {
      setEditedTask({
        text: task.text,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "medium",
        dueDate: task.dueDate,
        tags: task.tags || [],
        subTasks: task.subTasks || [],
        timeEstimate: task.timeEstimate,
        projectId: task.projectId,
        assigneeUid: task.assigneeUid ?? null,
      });
      setErrors({});
      if (task.dueDate) {
        setSelectedDate(new Date(task.dueDate));
      }
    }
  }, [open, task]);

  const clearError = useCallback((field: keyof TaskEditErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSave = async () => {
    const result = taskEditSchema.safeParse({
      text: editedTask.text ?? "",
      description: editedTask.description,
      timeEstimate: editedTask.timeEstimate,
    });

    if (!result.success) {
      const fieldErrors: TaskEditErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof TaskEditErrors | undefined;
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ ...editedTask, text: result.data.text });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSubTask = () => {
    if (!newSubTask.trim()) return;
    const subTasks = [...(editedTask.subTasks || [])];
    subTasks.push({
      id: Date.now().toString(),
      text: newSubTask,
      completed: false,
    });
    setEditedTask({ ...editedTask, subTasks });
    setNewSubTask("");
  };

  const toggleSubTask = (subTaskId: string) => {
    const subTasks = (editedTask.subTasks || []).map(st =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    setEditedTask({ ...editedTask, subTasks });
  };

  const removeSubTask = (subTaskId: string) => {
    const subTasks = (editedTask.subTasks || []).filter(st => st.id !== subTaskId);
    setEditedTask({ ...editedTask, subTasks });
  };

  const addTag = (tagName: string, color: string) => {
    const tags = editedTask.tags || [];
    if (tags.some(t => t.name === tagName)) return;
    tags.push({
      id: Date.now().toString(),
      name: tagName,
      color,
    });
    setEditedTask({ ...editedTask, tags });
  };

  const addCustomTag = () => {
    if (!customTagName.trim()) return;
    addTag(customTagName, customTagColor);
    setCustomTagName("");
    setCustomTagColor("#3b82f6");
  };

  const removeTag = (tagId: string) => {
    const tags = (editedTask.tags || []).filter(t => t.id !== tagId);
    setEditedTask({ ...editedTask, tags });
  };

  const FormContent = (
    <div className="space-y-6 py-4">
      {/* Task Title */}
      <div className="space-y-2">
        <Label htmlFor="task-title">
          {t("taskTitleLabel")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          autoFocus
          value={editedTask.text || ""}
          onChange={(e) => {
            setEditedTask({ ...editedTask, text: e.target.value });
            clearError("text");
          }}
          placeholder={t("taskTitlePlaceholder")}
          className={cn("text-base", errors.text && "border-destructive focus-visible:ring-destructive/30")}
          aria-invalid={!!errors.text}
          aria-describedby={errors.text ? "task-title-error" : undefined}
        />
        {errors.text && (
          <p id="task-title-error" className="text-xs text-destructive">{errors.text}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="task-description">{t("descriptionLabel")}</Label>
        <Textarea
          id="task-description"
          value={editedTask.description || ""}
          onChange={(e) => {
            setEditedTask({ ...editedTask, description: e.target.value });
            clearError("description");
          }}
          placeholder={t("descriptionPlaceholder")}
          className={cn("min-h-[100px]", errors.description && "border-destructive focus-visible:ring-destructive/30")}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "task-description-error" : undefined}
        />
        {errors.description && (
          <p id="task-description-error" className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      {/* Status, Priority, Due Date Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label>{t("statusLabel")}</Label>
          <Select
            value={editedTask.status}
            onValueChange={(value: TaskStatus) => setEditedTask({ ...editedTask, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <status.icon className={cn("h-4 w-4", status.color)} />
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>{t("priorityLabel")}</Label>
          <Select
            value={editedTask.priority || "medium"}
            onValueChange={(value: TaskPriority) => setEditedTask({ ...editedTask, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      {tPriorities(key as any)}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>{t("dueDateLabel")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : t("pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setEditedTask({ ...editedTask, dueDate: date ? date.toISOString() : undefined });
                }}
                initialFocus
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setEditedTask({ ...editedTask, dueDate: undefined });
                    }}
                  >
                    {t("clearDate")}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <Label>{t("projectLabel")}</Label>
        <Select
          value={editedTask.projectId || "none"}
          onValueChange={(value) => setEditedTask({ ...editedTask, projectId: value === "none" ? undefined : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("selectProjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                {t("noProject")}
              </div>
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", project.color)} />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee — shared workspaces only */}
      {isShared && (
        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select
            value={editedTask.assigneeUid || "unassigned"}
            onValueChange={(value) =>
              setEditedTask({ ...editedTask, assigneeUid: value === "unassigned" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Unassigned
                </div>
              </SelectItem>
              {members.map((m) => (
                <SelectItem key={m.uid} value={m.uid}>
                  {memberLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Time Estimate */}
      <div className="space-y-2">
        <Label htmlFor="time-estimate">{t("timeEstimateLabel")}</Label>
        <Input
          id="time-estimate"
          type="number"
          min="0"
          value={editedTask.timeEstimate || ""}
          onChange={(e) => {
            setEditedTask({ ...editedTask, timeEstimate: parseInt(e.target.value) || undefined });
            clearError("timeEstimate");
          }}
          placeholder={t("timeEstimatePlaceholder")}
          className={cn(errors.timeEstimate && "border-destructive focus-visible:ring-destructive/30")}
          aria-invalid={!!errors.timeEstimate}
          aria-describedby={errors.timeEstimate ? "time-estimate-error" : undefined}
        />
        {errors.timeEstimate && (
          <p id="time-estimate-error" className="text-xs text-destructive">{errors.timeEstimate}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>{t("tagsLabel")}</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(editedTask.tags || []).map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color }}
              className="gap-1 text-white"
            >
              {tag.name}
              <X
                className="h-3 w-3 cursor-pointer hover:opacity-70"
                onClick={() => removeTag(tag.id)}
              />
            </Badge>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {predefinedTags.map((tag) => (
              <Button
                key={tag.name}
                variant="outline"
                size="sm"
                onClick={() => addTag(tag.name, tag.color)}
                className="gap-1"
                disabled={(editedTask.tags || []).some(t => t.name === tag.name)}
              >
                <Tag className="h-3 w-3" style={{ color: tag.color }} />
                {tag.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={t("customTagNamePlaceholder")}
              value={customTagName}
              onChange={(e) => setCustomTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
            />
            <Input
              type="color"
              value={customTagColor}
              onChange={(e) => setCustomTagColor(e.target.value)}
              className="w-20"
              aria-label="Tag color"
            />
            <Button onClick={addCustomTag} disabled={!customTagName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {(() => {
            const ratio = contrastVsWhite(customTagColor);
            if (ratio !== null && ratio < 4.5) {
              return (
                <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
                  Low contrast ({ratio.toFixed(2)}:1) — white tag label may be hard to read. WCAG AA needs ≥ 4.5:1.
                </p>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Subtasks */}
      <div className="space-y-2">
        <Label>{t("subtasksLabel")}</Label>
        <div className="space-y-2">
          {(editedTask.subTasks || []).map((subTask) => (
            <div key={subTask.id} className="flex items-center gap-2 p-2 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleSubTask(subTask.id)}
              >
                {subTask.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </Button>
              <span className={cn("flex-1", subTask.completed && "line-through text-muted-foreground")}>
                {subTask.text}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeSubTask(subTask.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder={t("addSubtaskPlaceholder")}
              value={newSubTask}
              onChange={(e) => setNewSubTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubTask()}
            />
            <Button onClick={addSubTask} disabled={!newSubTask.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description")}
            </DialogDescription>
          </DialogHeader>
          {FormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("saving") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>
              {t("description")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            {FormContent}
          </div>
          <DrawerFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("saving") : t("saveChanges")}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
