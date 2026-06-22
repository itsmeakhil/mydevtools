"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task, NewTask } from "@/app/app/to-do/types/Task";
import { format } from "date-fns";
import useAuth, { AuthState } from "@/utils/useAuth";
import { backendFetch } from "@/lib/backend-auth";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  enqueuePendingDelete,
  removePendingDelete,
  getAllPendingDeletes,
} from "@/app/app/to-do/utils/pendingDeletes";

interface TaskStats {
  total: number;
  completed: number;
  ongoing: number;
  notStarted: number;
}

interface TasksPage {
  items: Task[];
  total_pages: number;
  total: number;
}

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalTaskCount: number;
  filterStatus: "all" | "not-started" | "ongoing" | "completed";
  setFilterStatus: (status: "all" | "not-started" | "ongoing" | "completed") => void;
  filterProject: string | "all";
  setFilterProject: (projectId: string | "all") => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  allTaskStats: TaskStats;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  handlePageChange: (page: number) => void;
  addTask: (text: string, projectId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: "not-started" | "ongoing" | "completed") => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  importTasks: (tasks: Task[]) => Promise<void>;
  getFilteredTasksForExport: () => Promise<Task[]>;
}

interface StatusOrderMap {
  ongoing: number;
  "not-started": number;
  completed: number;
}

type TaskActions = Pick<
  TaskContextType,
  | "addTask"
  | "updateTask"
  | "updateTaskStatus"
  | "deleteTask"
  | "archiveTask"
  | "restoreTask"
  | "importTasks"
  | "getFilteredTasksForExport"
  | "fetchNextPage"
  | "fetchPreviousPage"
  | "handlePageChange"
  | "setFilterStatus"
  | "setFilterProject"
  | "setShowArchived"
>;

const TaskContext = createContext<TaskContextType | undefined>(undefined);
const TaskActionsContext = createContext<TaskActions | undefined>(undefined);
const TASK_EXPORT_PAGE_SIZE = 1000;
const TASKS_PER_PAGE = 10;

const TASKS_QUERY_PREFIX = "todoTasks";
const STATS_QUERY_KEY = ["todoStats"] as const;

const DEFAULT_STATS: TaskStats = { total: 0, completed: 0, ongoing: 0, notStarted: 0 };

interface TasksQueryFilters {
  page: number;
  status: string;
  projectId: string;
  archived: boolean;
}

const tasksQueryKey = (uid: string | undefined, filters: TasksQueryFilters) =>
  [TASKS_QUERY_PREFIX, uid ?? null, filters] as const;

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user }: AuthState = useAuth();
  const tAck = useTranslations("Tasks.ack");
  const tStatus = useTranslations("Tasks.status");
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "not-started" | "ongoing" | "completed">("all");
  const [filterProject, setFilterProject] = useState<string | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  const filterStatusRef = useRef(filterStatus);
  const filterProjectRef = useRef(filterProject);
  const showArchivedRef = useRef(showArchived);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { filterStatusRef.current = filterStatus; }, [filterStatus]);
  useEffect(() => { filterProjectRef.current = filterProject; }, [filterProject]);
  useEffect(() => { showArchivedRef.current = showArchived; }, [showArchived]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!user) throw new Error("Not authenticated");
      const res = await backendFetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }
      return res;
    },
    [user]
  );

  const authedFetchRef = useRef(authedFetch);
  useEffect(() => { authedFetchRef.current = authedFetch; }, [authedFetch]);

  const currentFilters = useMemo<TasksQueryFilters>(
    () => ({
      page: currentPage,
      status: filterStatus,
      projectId: filterProject,
      archived: showArchived,
    }),
    [currentPage, filterStatus, filterProject, showArchived]
  );

  // Tasks list query (cached, dedup'd, stale-while-revalidate)
  const tasksQuery = useQuery<TasksPage>({
    queryKey: tasksQueryKey(user?.uid, currentFilters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", currentFilters.status);
      params.set("projectId", currentFilters.projectId);
      params.set("page", String(currentFilters.page));
      params.set("pageSize", String(TASKS_PER_PAGE));
      params.set("archived", String(currentFilters.archived));
      const res = await authedFetch(`/api/backend/tasks?${params.toString()}`, { method: "GET" });
      const data = await res.json();
      return {
        items: data.items ?? [],
        total_pages: data.total_pages ?? 1,
        total: data.total ?? 0,
      };
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  // Stats query
  const statsQuery = useQuery<TaskStats>({
    queryKey: STATS_QUERY_KEY,
    queryFn: async () => {
      const res = await authedFetch("/api/backend/tasks/stats", { method: "GET" });
      return (await res.json()) as TaskStats;
    },
    enabled: !!user,
  });

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data]);
  const totalPages = tasksQuery.data?.total_pages
    ? Math.max(1, tasksQuery.data.total_pages)
    : Math.max(1, Math.ceil((statsQuery.data?.total ?? 0) / TASKS_PER_PAGE));
  const totalTaskCount = tasksQuery.data?.total ?? statsQuery.data?.total ?? 0;
  const allTaskStats = statsQuery.data ?? DEFAULT_STATS;
  const isLoading = tasksQuery.isPending || (tasksQuery.isFetching && !tasksQuery.data);

  // Latest snapshot for actions
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Helper: build current tasks key for setQueryData
  const buildCurrentKey = useCallback(
    () =>
      tasksQueryKey(user?.uid, {
        page: currentPageRef.current,
        status: filterStatusRef.current,
        projectId: filterProjectRef.current,
        archived: showArchivedRef.current,
      }),
    [user?.uid]
  );

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterProject, showArchived]);

  // Pagination helpers
  const fetchNextPage = useCallback(() => {
    setCurrentPage((p) => {
      if (p >= totalPages) return p;
      return p + 1;
    });
  }, [totalPages]);

  const fetchPreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handlePageChange = useCallback(
    async (page: number) => {
      if (page === currentPageRef.current || page > totalPages || page < 1) return;
      setCurrentPage(page);
    },
    [totalPages]
  );

  // ----- Mutations -----

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_PREFIX] });
  }, [queryClient]);

  const invalidateStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
  }, [queryClient]);

  const addTask = useCallback(
    async (newTaskText: string, projectId?: string): Promise<void> => {
      if (!user) return;
      const newTask: NewTask = {
        text: newTaskText,
        status: "not-started",
        statusOrder: 2,
        createdAt: new Date().toISOString(),
        created_by: user.uid,
        projectId,
      };
      try {
        await authedFetch("/api/backend/tasks", {
          method: "POST",
          body: JSON.stringify({ text: newTask.text, projectId: newTask.projectId }),
        });

        // Optimistic stat bump (will be reconciled by stats invalidate)
        queryClient.setQueryData<TaskStats>(STATS_QUERY_KEY, (old) =>
          old ? { ...old, total: old.total + 1, notStarted: old.notStarted + 1 } : old
        );

        invalidateTasks();
        invalidateStats();

        toast.success(tAck("taskAddedTitle"), {
          description: newTaskText.length > 50 ? `${newTaskText.substring(0, 50)}...` : newTaskText,
        });
      } catch (error) {
        console.error("Failed to add task:", error);
        toast.error(tAck("taskAddedFailedTitle"), { description: tAck("tryAgain") });
      }
    },
    [user, authedFetch, queryClient, invalidateTasks, invalidateStats, tAck]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<void> => {
      if (!user) return;

      const key = buildCurrentKey();
      // Optimistic update in cache
      queryClient.setQueryData<TasksPage>(key, (old) =>
        old
          ? { ...old, items: old.items.map((t) => (t.id === taskId ? { ...t, ...updates } : t)) }
          : old
      );

      try {
        const updateData: Record<string, unknown> = { ...updates };

        delete updateData.id;
        delete updateData.created_by;
        delete updateData.createdAt;

        Object.keys(updateData).forEach((k) => {
          if (updateData[k] === undefined) delete updateData[k];
        });

        if (Object.keys(updateData).length === 0) return;

        await authedFetch(`/api/backend/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify(updateData),
        });
        toast.success(tAck("taskUpdatedTitle"));
      } catch (error) {
        console.error("Failed to update task:", error);
        toast.error(tAck("taskUpdatedFailedTitle"), { description: tAck("tryAgain") });
        invalidateTasks();
      }
    },
    [user, authedFetch, queryClient, buildCurrentKey, invalidateTasks, tAck]
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: "not-started" | "ongoing" | "completed"): Promise<void> => {
      const statusOrder: StatusOrderMap = {
        ongoing: 1,
        "not-started": 2,
        completed: 3,
      };

      if (!(newStatus in statusOrder)) return;

      const task = tasksRef.current.find((t) => t.id === taskId);
      const updates: Partial<Task> = {
        status: newStatus,
        statusOrder: statusOrder[newStatus],
      };
      if (newStatus === "completed") {
        updates.completedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
      }

      try {
        await updateTask(taskId, updates);

        if (task && task.status !== newStatus) {
          queryClient.setQueryData<TaskStats>(STATS_QUERY_KEY, (old) => {
            if (!old) return old;
            const next = { ...old };
            if (task.status === "completed") next.completed--;
            else if (task.status === "ongoing") next.ongoing--;
            else if (task.status === "not-started") next.notStarted--;
            if (newStatus === "completed") next.completed++;
            else if (newStatus === "ongoing") next.ongoing++;
            else if (newStatus === "not-started") next.notStarted++;
            return next;
          });
        }

        if (task) {
          toast.success(tAck("taskMovedTitle", { status: tStatus(`${newStatus}.label` as any) }), {
            description: task.text.length > 50 ? `${task.text.substring(0, 50)}...` : task.text,
          });
        }
      } catch {
        toast.error(tAck("taskStatusUpdateFailedTitle"), { description: tAck("tryAgain") });
      }
    },
    [updateTask, queryClient, tAck, tStatus]
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!user) return;

      const taskToDelete = tasksRef.current.find((t) => t.id === taskId);
      if (!taskToDelete) return;

      const key = buildCurrentKey();

      // Optimistic remove
      queryClient.setQueryData<TasksPage>(key, (old) =>
        old ? { ...old, items: old.items.filter((t) => t.id !== taskId) } : old
      );

      const deleteAt = Date.now() + 3000;
      enqueuePendingDelete({ taskId, task: taskToDelete, deleteAt, userId: user.uid });

      let deleteExecuted = false;
      let deleteTimeout: NodeJS.Timeout;

      toast(tAck("taskDeletedTitle", { text: taskToDelete.text }), {
        action: {
          label: tAck("undo"),
          onClick: async () => {
            clearTimeout(deleteTimeout);
            removePendingDelete(taskId);

            // Restore in cache
            queryClient.setQueryData<TasksPage>(key, (old) =>
              old
                ? {
                    ...old,
                    items: [...old.items, taskToDelete].sort(
                      (a, b) => a.statusOrder - b.statusOrder
                    ),
                  }
                : old
            );

            if (deleteExecuted) {
              try {
                await authedFetch("/api/backend/tasks", {
                  method: "POST",
                  body: JSON.stringify({
                    text: taskToDelete.text,
                    projectId: taskToDelete.projectId,
                  }),
                });
                invalidateTasks();
                invalidateStats();
                toast.success(tAck("taskRestoredSuccessTitle"));
              } catch (error) {
                console.error("Failed to restore task:", error);
                toast.error(tAck("taskRestoreFailedTitle"));
              }
            } else {
              toast.success(tAck("taskRestoredTitle"));
            }
          },
        },
        duration: 3000,
      });

      deleteTimeout = setTimeout(async () => {
        try {
          await authedFetch(`/api/backend/tasks/${taskId}`, { method: "DELETE" });
          deleteExecuted = true;
          removePendingDelete(taskId);

          queryClient.setQueryData<TaskStats>(STATS_QUERY_KEY, (old) => {
            if (!old) return old;
            const next = { ...old };
            next.total = Math.max(0, next.total - 1);
            if (taskToDelete.status === "completed")
              next.completed = Math.max(0, next.completed - 1);
            else if (taskToDelete.status === "ongoing")
              next.ongoing = Math.max(0, next.ongoing - 1);
            else if (taskToDelete.status === "not-started")
              next.notStarted = Math.max(0, next.notStarted - 1);
            return next;
          });

          if (tasksRef.current.length === 0 && currentPageRef.current > 1) {
            invalidateTasks();
          }
        } catch (error) {
          console.error("Failed to delete task:", error);
          invalidateTasks();
          toast.error(tAck("taskDeleteFailedTitle"));
        }
      }, 3000);
    },
    [user, authedFetch, queryClient, buildCurrentKey, invalidateTasks, invalidateStats, tAck]
  );

  const archiveTask = useCallback(
    async (taskId: string): Promise<void> => {
      const key = buildCurrentKey();
      queryClient.setQueryData<TasksPage>(key, (old) =>
        old ? { ...old, items: old.items.filter((t) => t.id !== taskId) } : old
      );
      await updateTask(taskId, { archived: true });
    },
    [updateTask, queryClient, buildCurrentKey]
  );

  const restoreTask = useCallback(
    async (taskId: string): Promise<void> => {
      const key = buildCurrentKey();
      queryClient.setQueryData<TasksPage>(key, (old) =>
        old ? { ...old, items: old.items.filter((t) => t.id !== taskId) } : old
      );
      await updateTask(taskId, { archived: false });
    },
    [updateTask, queryClient, buildCurrentKey]
  );

  const importTasks = useCallback(
    async (importedTasks: Task[]): Promise<void> => {
      if (!user) return;
      try {
        await authedFetch("/api/backend/tasks/import", {
          method: "POST",
          body: JSON.stringify({ tasks: importedTasks }),
        });
        invalidateTasks();
        invalidateStats();
        toast.success(tAck("tasksImportedTitle", { count: importedTasks.length }));
      } catch (error) {
        console.error("Failed to import tasks:", error);
        toast.error(tAck("tasksImportFailedTitle"));
        throw error;
      }
    },
    [user, authedFetch, invalidateTasks, invalidateStats, tAck]
  );

  const getFilteredTasksForExport = useCallback(async (): Promise<Task[]> => {
    if (!user) return [];
    return fetchAllPages<Task>({
      pageSize: TASK_EXPORT_PAGE_SIZE,
      fetchPage: async (skip, limit) => {
        const params = new URLSearchParams();
        params.set("status", filterStatusRef.current);
        params.set("projectId", filterProjectRef.current);
        params.set("skip", String(skip));
        params.set("limit", String(limit));
        const res = await authedFetchRef.current(
          `/api/backend/tasks/export?${params.toString()}`,
          { method: "GET" }
        );
        return (await res.json()) as Task[];
      },
    });
  }, [user]);

  // Flush pending deletes from prior sessions
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const pending = await getAllPendingDeletes(user.uid);
      if (cancelled || pending.length === 0) return;
      for (const entry of pending) {
        try {
          await authedFetchRef.current(`/api/backend/tasks/${entry.taskId}`, { method: "DELETE" });
        } catch {
          // Best effort
        }
        await removePendingDelete(entry.taskId);
      }
      invalidateTasks();
      invalidateStats();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, invalidateTasks, invalidateStats]);

  const actions = useMemo<TaskActions>(
    () => ({
      addTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      archiveTask,
      restoreTask,
      importTasks,
      getFilteredTasksForExport,
      fetchNextPage,
      fetchPreviousPage,
      handlePageChange,
      setFilterStatus,
      setFilterProject,
      setShowArchived,
    }),
    [
      addTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      archiveTask,
      restoreTask,
      importTasks,
      getFilteredTasksForExport,
      fetchNextPage,
      fetchPreviousPage,
      handlePageChange,
    ]
  );

  const value = useMemo<TaskContextType>(
    () => ({
      tasks,
      isLoading,
      currentPage,
      totalPages,
      totalTaskCount,
      filterStatus,
      setFilterStatus,
      filterProject,
      setFilterProject,
      showArchived,
      setShowArchived,
      allTaskStats,
      fetchNextPage,
      fetchPreviousPage,
      handlePageChange,
      addTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      archiveTask,
      restoreTask,
      importTasks,
      getFilteredTasksForExport,
    }),
    [
      tasks,
      isLoading,
      currentPage,
      totalPages,
      totalTaskCount,
      filterStatus,
      filterProject,
      showArchived,
      allTaskStats,
      fetchNextPage,
      fetchPreviousPage,
      handlePageChange,
      addTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      archiveTask,
      restoreTask,
      importTasks,
      getFilteredTasksForExport,
    ]
  );

  return (
    <TaskContext.Provider value={value}>
      <TaskActionsContext.Provider value={actions}>{children}</TaskActionsContext.Provider>
    </TaskContext.Provider>
  );
}

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};

export const useTaskActions = () => {
  const context = useContext(TaskActionsContext);
  if (!context) {
    throw new Error("useTaskActions must be used within a TaskProvider");
  }
  return context;
};
