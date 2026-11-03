"use client";

import TaskItem from "./TaskItem";
import { FadeIn } from "@/components/ui/fade-in";
import { Inbox, Plus } from "lucide-react";
import { Task } from "@/app/app/to-do/types/Task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { TaskSkeletonList } from "./components/TaskSkeleton";
import { useStatuses } from "./hooks/useStatuses";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => void;
  /** Opens the add-task dialog preset to the given status (group "+" button). */
  onAddInStatus?: (statusId: string) => void;
}

export default function TaskList({ tasks, isLoading, onUpdateStatus, onUpdateTask, onDeleteTask, onAddInStatus }: TaskListProps) {
  const t = useTranslations("Tasks.list");
  const tDrawer = useTranslations("Tasks.mobileDrawer");
  const { statuses } = useStatuses();

  // Group by status; tasks with an unknown status (e.g. deleted custom) join the first group.
  const groups = statuses.map((status) => ({
    status,
    items: tasks.filter(
      (task) =>
        task.status === status.id ||
        (status.id === statuses[0].id && !statuses.some((s) => s.id === task.status))
    ),
  }));

  return (
    <div role="list" aria-label={t("ariaLabel")}>
      <FadeIn show={isLoading}>
        {isLoading && <TaskSkeletonList count={5} />}
      </FadeIn>

      <FadeIn show={!isLoading}>
        {!isLoading && tasks.length === 0 && (
          <div className="flex items-center justify-center py-16 animate-in fade-in">
            <div className="text-center space-y-4 max-w-md px-4">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{t("emptyTitle")}</h3>
                <p className="text-[13px] text-muted-foreground">
                  {t("emptyPrimary")}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <div className="space-y-4">
            {groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.status.id} aria-label={group.status.label}>
                  {/* Group header — sticky; the status colour lives in the icon */}
                  <div className="sticky top-0 z-10 h-9 flex items-center justify-between px-3 rounded-lg bg-card/95">
                    <div className="flex items-center gap-2">
                      <group.status.icon className={cn("h-4 w-4", group.status.color)} />
                      <span className="text-[13px] font-semibold">{group.status.label}</span>
                      <span className="text-[13px] text-muted-foreground tabular-nums">{group.items.length}</span>
                    </div>
                    {onAddInStatus && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => onAddInStatus(group.status.id)}
                        aria-label={tDrawer("addTaskSrOnly")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <ul className="mt-1 animate-in fade-in">
                    {group.items.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onUpdateStatus={onUpdateStatus}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                      />
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}
