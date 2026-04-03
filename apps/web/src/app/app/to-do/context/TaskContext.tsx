"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Task, NewTask } from "@/app/app/to-do/types/Task";
import { format } from "date-fns";
import useAuth, { AuthState } from "@/utils/useAuth";
import { backendFetch } from "@/lib/backend-auth";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  allTaskStats: {
    total: number;
    completed: number;
    ongoing: number;
    notStarted: number;
  };
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  handlePageChange: (page: number) => void;
  addTask: (text: string, projectId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: "not-started" | "ongoing" | "completed") => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  importTasks: (tasks: Task[]) => Promise<void>;
  getFilteredTasksForExport: () => Promise<Task[]>;
}

interface StatusOrderMap {
  ongoing: number;
  "not-started": number;
  completed: number;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user }: AuthState = useAuth(); // Single declaration of user
  const tAck = useTranslations("Tasks.ack");
  const tStatus = useTranslations("Tasks.status");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTaskCount, setTotalTaskCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "not-started" | "ongoing" | "completed">("all");
  const [filterProject, setFilterProject] = useState<string | "all">("all");
  const [allTaskStats, setAllTaskStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    notStarted: 0,
  });
  const tasksPerPage = 10;
  const didInitialLoad = useRef(false);

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

  const fetchStats = useCallback(async () => {
    try {
      if (!user) return;
      const res = await authedFetch("/api/backend/tasks/stats", { method: "GET" });
      const stats = await res.json();
      setAllTaskStats(stats);
      const calculatedPages = Math.max(1, Math.ceil((stats.total ?? 0) / tasksPerPage));
      setTotalPages(calculatedPages);
      setTotalTaskCount(stats.total ?? 0);
    } catch (error) {
      console.error("Error fetching task stats:", error);
    }
  }, [user, authedFetch, tasksPerPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refreshCurrentPage = useCallback(async () => {
    try {
      if (!user) return;
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("status", filterStatus);
      params.set("projectId", filterProject);
      params.set("page", String(currentPage));
      params.set("pageSize", String(tasksPerPage));

      const res = await authedFetch(`/api/backend/tasks?${params.toString()}`, { method: "GET" });
      const data = await res.json();
      setTasks(data.items ?? []);
      setTotalPages(data.total_pages ?? 1);
      setTotalTaskCount(data.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, [user, authedFetch, currentPage, tasksPerPage, filterStatus, filterProject]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterProject]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    // Avoid double-load on mount when stats effect also runs
    if (!didInitialLoad.current) didInitialLoad.current = true;
    refreshCurrentPage();
  }, [user, refreshCurrentPage]);

  const fetchNextPage = useCallback(() => {
    if (currentPage >= totalPages) return;
    setCurrentPage((p) => p + 1);
  }, [currentPage, totalPages]);

  const fetchPreviousPage = useCallback(() => {
    if (currentPage <= 1) return;
    setCurrentPage((p) => Math.max(1, p - 1));
  }, [currentPage]);

  const handlePageChange = async (page: number) => {
    if (page === currentPage || page > totalPages || page < 1) return;
    setCurrentPage(page);
  };

  const addTask = async (newTaskText: string, projectId?: string): Promise<void> => {
    if (!user) return;
    const newTask: NewTask = {
      text: newTaskText,
      status: "not-started",
      statusOrder: 2,
      createdAt: new Date().toISOString(),
      created_by: user.uid,
      projectId: projectId,
    };
    try {
      await authedFetch("/api/backend/tasks", {
        method: "POST",
        body: JSON.stringify({ text: newTask.text, projectId: newTask.projectId }),
      });
      await refreshCurrentPage();
      await fetchStats();

      // Optimistically update stats
      setAllTaskStats(prev => ({
        ...prev,
        total: prev.total + 1,
        notStarted: prev.notStarted + 1
      }));
      setTotalTaskCount(prev => prev + 1);

      toast.success(tAck("taskAddedTitle"), {
        description: newTaskText.length > 50 ? `${newTaskText.substring(0, 50)}...` : newTaskText,
      });
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error(tAck("taskAddedFailedTitle"), {
        description: tAck("tryAgain"),
      });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
    if (!user) return;

    // Optimistically update local state
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );

    try {
      const updateData: any = { ...updates };

      // If status is being updated and completedAt is not explicitly set
      if (updates.status === "completed" && !updates.completedAt) {
        // Backend sets completedAt when status becomes completed
      }

      // Remove fields that shouldn't be updated directly in Firestore
      delete updateData.id;
      delete updateData.created_by;
      delete updateData.createdAt; // Don't allow updating creation timestamp

      // Filter out undefined values - Firestore doesn't accept undefined
      // Instead, we need to use deleteField() or just omit them
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Only update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        return;
      }

      await authedFetch(`/api/backend/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });
      toast.success(tAck("taskUpdatedTitle"));
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error(tAck("taskUpdatedFailedTitle"), {
        description: tAck("tryAgain"),
      });
      await refreshCurrentPage();
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: "not-started" | "ongoing" | "completed"
  ): Promise<void> => {
    const statusOrder: StatusOrderMap = {
      ongoing: 1,
      "not-started": 2,
      completed: 3,
    };

    if (newStatus in statusOrder) {
      const task = tasks.find(t => t.id === taskId);
      const updates: Partial<Task> = {
        status: newStatus,
        statusOrder: statusOrder[newStatus],
      };

      // Add completedAt timestamp when marking as completed
      if (newStatus === "completed") {
        updates.completedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
      }

      try {
        await updateTask(taskId, updates);

        // Optimistically update stats if status changed
        if (task && task.status !== newStatus) {
          setAllTaskStats(prev => {
            const newStats = { ...prev };

            // Decrement old status count
            if (task.status === "completed") newStats.completed--;
            else if (task.status === "ongoing") newStats.ongoing--;
            else if (task.status === "not-started") newStats.notStarted--;

            // Increment new status count
            if (newStatus === "completed") newStats.completed++;
            else if (newStatus === "ongoing") newStats.ongoing++;
            else if (newStatus === "not-started") newStats.notStarted++;

            return newStats;
          });
        }

        if (task) {
          toast.success(tAck("taskMovedTitle", { status: tStatus(`${newStatus}.label` as any) }), {
            description: task.text.length > 50 ? `${task.text.substring(0, 50)}...` : task.text,
          });
        }
      } catch (error) {
        toast.error(tAck("taskStatusUpdateFailedTitle"), {
          description: tAck("tryAgain"),
        });
      }
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!user) return;

    // Get the task before deleting it (for undo functionality)
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // Optimistically remove from UI
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    let deleteExecuted = false;
    let deleteTimeout: NodeJS.Timeout;

    // Show toast with undo option
    toast(tAck("taskDeletedTitle", { text: taskToDelete.text }), {
      action: {
        label: tAck("undo"),
        onClick: async () => {
          // Cancel the deletion
          clearTimeout(deleteTimeout);

          // Restore the task in UI
          setTasks((currentTasks) => {
            // Find the correct position to insert the task back
            const newTasks = [...currentTasks];
            newTasks.push(taskToDelete);
            return newTasks.sort((a, b) => a.statusOrder - b.statusOrder);
          });

          // If deletion was already executed, re-add to Firestore
          if (deleteExecuted) {
            try {
              await authedFetch("/api/backend/tasks", {
                method: "POST",
                body: JSON.stringify({ text: taskToDelete.text, projectId: taskToDelete.projectId }),
              });
              await refreshCurrentPage();
              await fetchStats();
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

    // Execute deletion after delay (allows time for undo)
    deleteTimeout = setTimeout(async () => {
      try {
        await authedFetch(`/api/backend/tasks/${taskId}`, { method: "DELETE" });
        deleteExecuted = true;

        // Update stats after successful deletion
        setAllTaskStats(prev => {
          const newStats = { ...prev };
          newStats.total = Math.max(0, newStats.total - 1);

          if (taskToDelete.status === "completed") newStats.completed = Math.max(0, newStats.completed - 1);
          else if (taskToDelete.status === "ongoing") newStats.ongoing = Math.max(0, newStats.ongoing - 1);
          else if (taskToDelete.status === "not-started") newStats.notStarted = Math.max(0, newStats.notStarted - 1);

          return newStats;
        });
        setTotalTaskCount(prev => Math.max(0, prev - 1));

        if (tasks.length === 1 && currentPage > 1) {
          await refreshCurrentPage();
        }
      } catch (error) {
        console.error("Failed to delete task:", error);
        await refreshCurrentPage();
        toast.error(tAck("taskDeleteFailedTitle"));
      }
    }, 3000); // 3 second delay before permanent deletion
  };

  const importTasks = async (importedTasks: Task[]): Promise<void> => {
    if (!user) return;

    try {
      await authedFetch("/api/backend/tasks/import", {
        method: "POST",
        body: JSON.stringify({ tasks: importedTasks }),
      });
      await refreshCurrentPage();
      await fetchStats();
      toast.success(tAck("tasksImportedTitle", { count: importedTasks.length }));
    } catch (error) {
      console.error("Failed to import tasks:", error);
      toast.error(tAck("tasksImportFailedTitle"));
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshCurrentPage();
  }, [user, currentPage, filterStatus, filterProject, refreshCurrentPage]);

  const getFilteredTasksForExport = async (): Promise<Task[]> => {
    if (!user) return [];
    const params = new URLSearchParams();
    params.set("status", filterStatus);
    params.set("projectId", filterProject);
    const res = await authedFetch(`/api/backend/tasks/export?${params.toString()}`, { method: "GET" });
    return (await res.json()) as Task[];
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        currentPage,
        totalPages,
        totalTaskCount,
        filterStatus,
        setFilterStatus,
        filterProject,
        setFilterProject,
        allTaskStats,
        fetchNextPage,
        fetchPreviousPage,
        handlePageChange,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        importTasks,
        getFilteredTasksForExport,
      }}
    >
      {children}
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