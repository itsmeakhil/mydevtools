"use client";

import { useState, useEffect } from "react";
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
import { Calendar as CalendarIcon, Plus, X, Tag, CheckCircle2, Circle, Clock, TrendingUp, Flame, AlertCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { Folder } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const tStatus = useTranslations("Tasks.status");
  const tPriorities = useTranslations("Tasks.priorities");
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [newSubTask, setNewSubTask] = useState("");
  const [customTagName, setCustomTagName] = useState("");
  const [customTagColor, setCustomTagColor] = useState("#3b82f6");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const isMobile = useIsMobile();
  const { projects } = useProjectContext();

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
      });
      if (task.dueDate) {
        setSelectedDate(new Date(task.dueDate));
      }
    }
  }, [open, task]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedTask);
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
        <Label htmlFor="task-title">{t("taskTitleLabel")}</Label>
        <Input
          id="task-title"
          value={editedTask.text || ""}
          onChange={(e) => setEditedTask({ ...editedTask, text: e.target.value })}
          placeholder={t("taskTitlePlaceholder")}
          className="text-base"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="task-description">{t("descriptionLabel")}</Label>
        <Textarea
          id="task-description"
          value={editedTask.description || ""}
          onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
          className="min-h-[100px]"
        />
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
              <SelectItem value="not-started">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {tStatus("not-started.label")}
                </div>
              </SelectItem>
              <SelectItem value="ongoing">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {tStatus("ongoing.label")}
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {tStatus("completed.label")}
                </div>
              </SelectItem>
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

      {/* Time Estimate */}
      <div className="space-y-2">
        <Label htmlFor="time-estimate">{t("timeEstimateLabel")}</Label>
        <Input
          id="time-estimate"
          type="number"
          min="0"
          value={editedTask.timeEstimate || ""}
          onChange={(e) => setEditedTask({ ...editedTask, timeEstimate: parseInt(e.target.value) || undefined })}
          placeholder={t("timeEstimatePlaceholder")}
        />
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
          <div className="flex gap-2">
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
            />
            <Button onClick={addCustomTag} disabled={!customTagName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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
            <Button onClick={handleSave} disabled={!editedTask.text?.trim() || isSaving}>
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
            <Button onClick={handleSave} disabled={!editedTask.text?.trim() || isSaving}>
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
