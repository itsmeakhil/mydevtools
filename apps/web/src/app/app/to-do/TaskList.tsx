// components/TaskList.js
"use client";

import { useCallback, useEffect, useRef } from "react";
import TaskItem from "./TaskItem";
import { FadeIn } from "@/components/ui/fade-in";
import { Inbox, Loader2, CheckCircle2 } from "lucide-react";
import { Task } from "@/app/app/to-do/types/Task";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const STAGGER_LIMIT = 8;

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onUpdateStatus: (id: string, status: "not-started" | "ongoing" | "completed") => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

export default function TaskList({ tasks, isLoading, onUpdateStatus, onUpdateTask, onDeleteTask }: TaskListProps) {
  const t = useTranslations("Tasks.list");

  // Stabilize callbacks: parent (TaskContext) recreates these every render, which
  // would defeat React.memo on TaskItem. Forward latest fn via ref.
  const updateStatusRef = useRef(onUpdateStatus);
  const updateTaskRef = useRef(onUpdateTask);
  const deleteTaskRef = useRef(onDeleteTask);
  useEffect(() => { updateStatusRef.current = onUpdateStatus; }, [onUpdateStatus]);
  useEffect(() => { updateTaskRef.current = onUpdateTask; }, [onUpdateTask]);
  useEffect(() => { deleteTaskRef.current = onDeleteTask; }, [onDeleteTask]);

  const stableUpdateStatus = useCallback(
    (id: string, status: "not-started" | "ongoing" | "completed") => updateStatusRef.current(id, status),
    []
  );
  const stableUpdateTask = useCallback(
    (id: string, updates: Partial<Task>) => updateTaskRef.current(id, updates),
    []
  );
  const stableDeleteTask = useCallback(
    (id: string) => deleteTaskRef.current(id),
    []
  );

  return (
    <ul className="space-y-3" role="list" aria-label={t("ariaLabel")}>
      <FadeIn show={isLoading}>
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground font-medium">{t("loading")}</p>
            </div>
          </div>
        )}
      </FadeIn>
      
      <FadeIn show={!isLoading}>
        {!isLoading && tasks.length === 0 && (
          <div className="flex items-center justify-center py-16 animate-in fade-in">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="mx-auto p-6 bg-gradient-to-br from-muted/50 to-muted rounded-2xl w-fit shadow-sm">
                <Inbox className="h-16 w-16 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">{t("emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tasks.length === 0 
                    ? t("emptyPrimary")
                    : t("emptySecondary")
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "animate-in fade-in slide-in-from-top-2",
                  "transition-all duration-300"
                )}
                style={{
                  animationDelay: index < STAGGER_LIMIT ? `${index * 50}ms` : '0ms',
                  animationFillMode: 'both'
                }}
              >
                <TaskItem
                  task={task}
                  onUpdateStatus={stableUpdateStatus}
                  onUpdateTask={stableUpdateTask}
                  onDeleteTask={stableDeleteTask}
                />
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </ul>
  );
}