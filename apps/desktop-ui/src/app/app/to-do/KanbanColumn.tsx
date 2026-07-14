"use client";

import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Task } from "@/app/app/to-do/types/Task";
import KanbanCard from "./KanbanCard";
import { LucideIcon } from "lucide-react";
import { STATUS_CONFIG } from "./config/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface KanbanColumnProps {
  id: "not-started" | "ongoing" | "completed";
  title: string;
  icon: LucideIcon;
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

const VIRTUALIZATION_THRESHOLD = 30;
const ESTIMATED_CARD_HEIGHT = 160;

export default function KanbanColumn({
  id,
  title,
  icon: Icon,
  tasks,
  onUpdateTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const tKanban = useTranslations("Tasks.kanban");
  const tStatus = useTranslations("Tasks.status");
  const { setNodeRef, isOver } = useDroppable({ id });

  const config = STATUS_CONFIG[id];
  const taskIds = tasks.map((task) => task.id);
  const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? tasks.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 6,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full rounded-xl border-2 p-4 md:p-5 transition-all duration-300",
        config.bgColor,
        config.borderColor,
        isOver
          ? "ring-1 ring-primary/60 shadow-md scale-[1.005] bg-primary/[0.02]"
          : "hover:shadow-sm"
      )}
      role="region"
      aria-label={tKanban("columnAria", { title, count: tasks.length })}
    >
      {/* Column Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <span className="status-dot" data-status={id} aria-hidden />
        <h3 className={cn("font-display text-xl font-semibold tracking-tight flex-1", config.color)}>
          {title}
        </h3>
        <span
          className={cn(
            "font-meta px-2 py-0.5 rounded-md text-[11px] tabular-nums bg-background/80 border border-border/60",
            config.color
          )}
          aria-label={tKanban("countInColumnAria", { title, count: tasks.length })}
        >
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)] scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
            !shouldVirtualize && "space-y-3"
          )}
        >
          {tasks.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center h-40 text-muted-foreground text-sm rounded-lg border-2 border-dashed transition-all duration-300",
                isOver
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-border/50 hover:border-border"
              )}
              role="status"
              aria-label={tKanban("emptyColumnAria")}
            >
              <div className={cn(
                "p-3 rounded-full mb-2 transition-colors",
                isOver ? config.iconBg : "bg-muted/50"
              )}>
                <Icon className={cn(
                  "h-6 w-6",
                  isOver ? config.color : "text-muted-foreground/50"
                )} />
              </div>
              <span className={cn(
                "font-medium transition-colors",
                isOver ? "text-primary" : "text-muted-foreground/70"
              )}>
                {isOver ? tKanban("dropHere") : tKanban("noTasksYet")}
              </span>
              {!isOver && (
                <p className="text-xs text-muted-foreground/50 mt-1">
                  {tStatus(`${id}.description` as any)}
                </p>
              )}
            </div>
          ) : shouldVirtualize ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const task = tasks[virtualRow.index];
                return (
                  <div
                    key={task.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: "12px",
                    }}
                  >
                    <KanbanCard
                      task={task}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            tasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-in fade-in slide-in-from-top-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <KanbanCard
                  task={task}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
