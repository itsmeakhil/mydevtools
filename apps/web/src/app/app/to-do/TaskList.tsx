// components/TaskList.js
"use client";

import TaskItem from "./TaskItem";
import { FadeIn } from "@/components/ui/fade-in";
import { Inbox } from "lucide-react";
import { Task } from "@/app/app/to-do/types/Task";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { TaskSkeletonList } from "./components/TaskSkeleton";

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

  return (
    <ul className="space-y-3" role="list" aria-label={t("ariaLabel")}>
      <FadeIn show={isLoading}>
        {isLoading && <TaskSkeletonList count={5} />}
      </FadeIn>

      <FadeIn show={!isLoading}>
        {!isLoading && tasks.length === 0 && (
          <div className="flex items-center justify-center py-16 animate-in fade-in">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="mx-auto p-6 bg-gradient-to-br from-muted/50 to-muted rounded-2xl w-fit shadow-sm">
                <Inbox className="h-16 w-16 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-semibold text-foreground">{t("emptyTitle")}</h3>
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
                  onUpdateStatus={onUpdateStatus}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                />
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </ul>
  );
}