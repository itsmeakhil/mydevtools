"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from "@dnd-kit/core";
import { Task } from "@/app/app/to-do/types/Task";
import KanbanCard from "./KanbanCard";
import KanbanColumn from "./KanbanColumn";
import { Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "./config/constants";
import { useTranslations } from "next-intl";

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: Task["status"]) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  isLoading: boolean;
}

type Status = "not-started" | "ongoing" | "completed";

const columns: { id: Status; icon: typeof Clock }[] = [
  { id: "not-started", icon: Clock },
  { id: "ongoing", icon: TrendingUp },
  { id: "completed", icon: CheckCircle2 },
];

export default function KanbanBoard({
  tasks,
  onUpdateStatus,
  onUpdateTask,
  onDeleteTask,
  isLoading,
}: KanbanBoardProps) {
  const tKanban = useTranslations("Tasks.kanban");
  const tStatus = useTranslations("Tasks.status");
  const [activeTab, setActiveTab] = useState<Status>("not-started");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Status, Task[]> = {
      "not-started": [],
      ongoing: [],
      completed: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;

    // Find the task being dragged
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if dropped on a column (status) or on another task
    let newStatus: Status;

    // If dropped directly on a column
    if (over.id === "not-started" || over.id === "ongoing" || over.id === "completed") {
      newStatus = over.id as Status;
    } else {
      // If dropped on another task, find which column that task belongs to
      const targetTask = tasks.find((t) => t.id === over.id);
      if (!targetTask) return;
      newStatus = targetTask.status;
    }

    // Only update if status changed
    if (task.status !== newStatus) {
      onUpdateStatus(taskId, newStatus);
    }
  };

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    return tasks.find((task) => task.id === activeId) || null;
  }, [activeId, tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">{tKanban("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile View: Tabs */}
      <div className="md:hidden h-full flex flex-col">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as Status)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-12 bg-muted/50 p-1 rounded-xl">
            {columns.map((col) => {
              const config = STATUS_CONFIG[col.id];
              return (
                <TabsTrigger
                  key={col.id}
                  value={col.id}
                  className={cn(
                    "text-xs sm:text-sm font-medium rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:scale-[1.02]",
                    activeTab === col.id && config.color
                  )}
                >
                  <span className="truncate">{tStatus(`${col.id}.label` as any)}</span>
                  <span className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    activeTab === col.id ? "bg-primary/10" : "bg-muted-foreground/10"
                  )}>
                    {tasksByStatus[col.id].length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {columns.map((column) => (
            <TabsContent
              key={column.id}
              value={column.id}
              className="flex-1 mt-0 h-full overflow-hidden data-[state=inactive]:hidden"
            >
              <KanbanColumn
                id={column.id}
                title={tStatus(`${column.id}.label` as any)}
                icon={column.icon}
                tasks={tasksByStatus[column.id]}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop View: Grid */}
      <div className="hidden md:grid grid-cols-3 gap-4 lg:gap-6 h-full" role="main" aria-label={tKanban("ariaLabel")}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={tStatus(`${column.id}.label` as any)}
            icon={column.icon}
            tasks={tasksByStatus[column.id]}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-95 rotate-2 scale-105 shadow-2xl">
            <KanbanCard task={activeTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
