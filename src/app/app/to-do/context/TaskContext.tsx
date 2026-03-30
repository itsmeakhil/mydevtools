"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  orderBy,
  getDocs,
  limitToLast,
  endBefore,
  serverTimestamp,
  QuerySnapshot,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../../../database/firebase";
import { Task, NewTask } from "@/app/app/to-do/types/Task";
import { format } from "date-fns";
import useAuth, { AuthState } from "@/utils/useAuth";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// Helper function to safely convert Firestore timestamps to formatted strings
const formatFirestoreDate = (dateValue: any): string | undefined => {
  if (!dateValue) return undefined;

  // If it's already a string, return it
  if (typeof dateValue === 'string') {
    return dateValue;
  }

  // If it's a Firestore Timestamp, convert it
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return format(dateValue.toDate(), "dd MMM yyyy, hh:mm a");
    } catch (error) {
      console.error("Error formatting Firestore date:", error);
      return undefined;
    }
  }

  // If it's a Date object, format it
  if (dateValue instanceof Date) {
    try {
      return format(dateValue, "dd MMM yyyy, hh:mm a");
    } catch (error) {
      console.error("Error formatting Date:", error);
      return undefined;
    }
  }

  return undefined;
};

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
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
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
  const [pageCache, setPageCache] = useState<Map<number, QueryDocumentSnapshot<DocumentData>>>(new Map());
  const tasksPerPage = 10;
  const unsubscribers = useRef<(() => void)[]>([]);

  // Modify the cleanup function to be less aggressive
  const cleanupListeners = useCallback(() => {
    if (unsubscribers.current.length > 0) {
      unsubscribers.current.forEach(unsubscribe => unsubscribe());
      unsubscribers.current = [];
    }
  }, []);

  // Modified error handler
  const handleFirestoreError = useCallback((error: { code: string }) => {
    if (error.code === "permission-denied") {
      console.warn("Permission denied, cleaning up listeners");
      cleanupListeners();
    } else {
      console.error("Firestore error:", error);
    }
  }, [cleanupListeners]);

  // Helper function to update tasks from snapshot
  const updateTasksFromSnapshot = useCallback((querySnapshot: QuerySnapshot<DocumentData>) => {
    const tasksArray: Task[] = [];
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      tasksArray.push({
        id: doc.id,
        text: data.text,
        description: data.description,
        status: data.status,
        statusOrder: data.statusOrder,
        priority: data.priority,
        dueDate: data.dueDate,
        tags: data.tags,
        subTasks: data.subTasks,
        createdAt: formatFirestoreDate(data.createdAt) || "Unknown",
        completedAt: formatFirestoreDate(data.completedAt),
        created_by: data.created_by,
        archived: data.archived,
        timeEstimate: data.timeEstimate,
        timeLogged: data.timeLogged,
        isTimerRunning: data.isTimerRunning,
        timerStartedAt: data.timerStartedAt,
        projectId: data.projectId,
      });
    });
    setTasks(tasksArray);
    if (querySnapshot.docs.length > 0) {
      setFirstDoc(querySnapshot.docs[0]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
    }
  }, []);

  // Fetch stats efficiently using count()
  const fetchStats = useCallback(async () => {
    if (!user || !user.uid) return;

    try {
      const baseQuery = query(collection(db, "tasks"), where("created_by", "==", user.uid));

      const [totalSnap, completedSnap, ongoingSnap, notStartedSnap] = await Promise.all([
        getCountFromServer(baseQuery),
        getCountFromServer(query(baseQuery, where("status", "==", "completed"))),
        getCountFromServer(query(baseQuery, where("status", "==", "ongoing"))),
        getCountFromServer(query(baseQuery, where("status", "==", "not-started")))
      ]);

      setAllTaskStats({
        total: totalSnap.data().count,
        completed: completedSnap.data().count,
        ongoing: ongoingSnap.data().count,
        notStarted: notStartedSnap.data().count,
      });

      // Update total pages based on total count
      const calculatedPages = Math.max(1, Math.ceil(totalSnap.data().count / tasksPerPage));
      setTotalPages(calculatedPages);
      setTotalTaskCount(totalSnap.data().count);

    } catch (error) {
      console.error("Error fetching task stats:", error);
    }
  }, [user]);

  // Initial stats load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for page changes to update list
  useEffect(() => {
    if (!user || !user.uid) {
      cleanupListeners();
      return;
    }

    // We still need to fetch the current page of tasks
    // This logic was partly in the previous useEffect, now we ensure it runs when page/filter changes
    // The actual task fetching is handled by the other useEffect (lines 361+ in original file)
    // but we need to make sure totalPages is correct.
    // fetchStats handles totalPages now.

  }, [user, cleanupListeners]);

  // Modified query creation helper function with proper typing
  const createTaskQuery = useCallback(
    (baseQuery: boolean) => {
      if (!user?.uid) return null;

      const constraints = [
        where("created_by", "==", user.uid),
      ];

      // Add filter if not "all"
      if (filterStatus !== "all") {
        constraints.push(where("status", "==", filterStatus));
      }

      if (filterProject !== "all") {
        constraints.push(where("projectId", "==", filterProject));
      }

      if (baseQuery) {
        return query(
          collection(db, "tasks"),
          ...constraints,
          orderBy("statusOrder"),
          orderBy("createdAt", "desc"),
          limit(tasksPerPage)
        );
      }
      return query(
        collection(db, "tasks"),
        ...constraints,
        orderBy("statusOrder"),
        orderBy("createdAt", "desc")
      );
    },
    [user?.uid, tasksPerPage, filterStatus, filterProject]
  );

  // Add this new function to refresh current page
  const refreshCurrentPage = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);

    try {
      const constraints = [
        where("created_by", "==", user.uid),
      ];

      if (filterStatus !== "all") {
        constraints.push(where("status", "==", filterStatus));
      }

      if (filterProject !== "all") {
        constraints.push(where("projectId", "==", filterProject));
      }

      const q = query(
        collection(db, "tasks"),
        ...constraints,
        orderBy("statusOrder"),
        orderBy("createdAt", "desc"),
        limit(currentPage * tasksPerPage)
      );

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;

      if (docs.length === 0 && currentPage > 1) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
        return await refreshCurrentPage();
      }

      const startIndex = (currentPage - 1) * tasksPerPage;
      const pageDocs = docs.slice(startIndex, Math.min(startIndex + tasksPerPage, docs.length));

      const tasksArray = pageDocs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          description: data.description,
          status: data.status,
          statusOrder: data.statusOrder,
          priority: data.priority,
          dueDate: data.dueDate,
          tags: data.tags,
          subTasks: data.subTasks,
          createdAt: formatFirestoreDate(data.createdAt) || "Unknown",
          completedAt: formatFirestoreDate(data.completedAt),
          created_by: data.created_by,
          archived: data.archived,
          timeEstimate: data.timeEstimate,
          timeLogged: data.timeLogged,
          isTimerRunning: data.isTimerRunning,
          timerStartedAt: data.timerStartedAt,
          projectId: data.projectId,
        };
      });

      setTasks(tasksArray);

      if (pageDocs.length > 0) {
        setFirstDoc(pageDocs[0]);
        setLastDoc(pageDocs[pageDocs.length - 1]);
      }

      const totalDocsQuery = query(
        collection(db, "tasks"),
        ...constraints
      );
      const totalDocs = await getDocs(totalDocsQuery);
      setTotalPages(Math.max(1, Math.ceil(totalDocs.size / tasksPerPage)));

      const newCache = new Map<number, QueryDocumentSnapshot<DocumentData>>();
      docs.forEach((doc, index) => {
        const pageNumber = Math.floor(index / tasksPerPage) + 1;
        if (!newCache.has(pageNumber)) {
          newCache.set(pageNumber, doc);
        }
      });
      setPageCache(newCache);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, currentPage, tasksPerPage, filterStatus, filterProject]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setPageCache(new Map());
  }, [filterStatus, filterProject]);

  // Initial page load
  useEffect(() => {
    if (!user || !user.uid) {
      cleanupListeners();
      return;
    }

    setIsLoading(true);
    const q = createTaskQuery(true);
    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        updateTasksFromSnapshot(querySnapshot);
        await refreshCurrentPage();
        setIsLoading(false);
      },
      handleFirestoreError
    );

    unsubscribers.current.push(unsubscribe);
    return () => {
      cleanupListeners();
    };
  }, [user, createTaskQuery, refreshCurrentPage, cleanupListeners, handleFirestoreError, updateTasksFromSnapshot, filterStatus, filterProject]);

  const fetchNextPage = useCallback(() => {
    if (currentPage >= totalPages || !lastDoc || !user || !user.uid) return;

    const constraints = [
      where("created_by", "==", user.uid),
    ];

    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }

    if (filterProject !== "all") {
      constraints.push(where("projectId", "==", filterProject));
    }

    const q = query(
      collection(db, "tasks"),
      ...constraints,
      orderBy("statusOrder"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(tasksPerPage)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          return;
        }
        updateTasksFromSnapshot(querySnapshot);
        setPageCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(currentPage + 1, querySnapshot.docs[0]);
          return newCache;
        });
        setCurrentPage(currentPage + 1);
      },
      handleFirestoreError
    );

    unsubscribers.current.push(unsubscribe);
  }, [currentPage, totalPages, lastDoc, user, handleFirestoreError, filterStatus, filterProject, updateTasksFromSnapshot]);

  const fetchPreviousPage = useCallback(() => {
    if (currentPage <= 1 || !firstDoc || !user || !user.uid) return;

    const constraints = [
      where("created_by", "==", user.uid),
    ];

    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }

    if (filterProject !== "all") {
      constraints.push(where("projectId", "==", filterProject));
    }

    const q = query(
      collection(db, "tasks"),
      ...constraints,
      orderBy("statusOrder"),
      orderBy("createdAt", "desc"),
      endBefore(firstDoc),
      limitToLast(tasksPerPage)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          return;
        }
        updateTasksFromSnapshot(querySnapshot);
        setPageCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(currentPage - 1, querySnapshot.docs[0]);
          return newCache;
        });
        setCurrentPage(currentPage - 1);
      },
      handleFirestoreError
    );

    unsubscribers.current.push(unsubscribe);
  }, [currentPage, firstDoc, user, handleFirestoreError, filterStatus, filterProject, updateTasksFromSnapshot]);

  const handlePageChange = async (page: number) => {
    if (page === currentPage || page > totalPages || page < 1 || !user || !user.uid) return;

    if (page === currentPage + 1) {
      fetchNextPage();
      return;
    }
    if (page === currentPage - 1) {
      fetchPreviousPage();
      return;
    }

    const constraints = [
      where("created_by", "==", user.uid),
    ];

    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }

    if (filterProject !== "all") {
      constraints.push(where("projectId", "==", filterProject));
    }

    const cachedDoc = pageCache.get(page);
    if (cachedDoc) {
      const q = query(
        collection(db, "tasks"),
        ...constraints,
        orderBy("statusOrder"),
        orderBy("createdAt", "desc"),
        startAfter(cachedDoc),
        limit(tasksPerPage)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        updateTasksFromSnapshot(querySnapshot);
        setCurrentPage(page);
      }
      return;
    }

    const q = query(
      collection(db, "tasks"),
      ...constraints,
      orderBy("statusOrder"),
      orderBy("createdAt", "desc"),
      limit(page * tasksPerPage)
    );
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    if (docs.length === 0) return;

    const startIndex = (page - 1) * tasksPerPage;
    const pageDocs = docs.slice(startIndex, Math.min(startIndex + tasksPerPage, docs.length));

    const tasksArray: Task[] = [];
    pageDocs.forEach((doc) => {
      const data = doc.data();
      tasksArray.push({
        id: doc.id,
        text: data.text,
        description: data.description,
        status: data.status,
        statusOrder: data.statusOrder,
        priority: data.priority,
        dueDate: data.dueDate,
        tags: data.tags,
        subTasks: data.subTasks,
        createdAt: formatFirestoreDate(data.createdAt) || "Unknown",
        completedAt: formatFirestoreDate(data.completedAt),
        created_by: data.created_by,
        archived: data.archived,
        timeLogged: data.timeLogged,
        isTimerRunning: data.isTimerRunning,
        timerStartedAt: data.timerStartedAt,
        projectId: data.projectId,
      });
    });

    setTasks(tasksArray);
    setFirstDoc(pageDocs[0]);
    setLastDoc(pageDocs[pageDocs.length - 1]);

    setPageCache((prev) => {
      const newCache = new Map(prev);
      newCache.set(page, pageDocs[0]);
      return newCache;
    });

    setCurrentPage(page);
  };

  const addTask = async (newTaskText: string, projectId?: string): Promise<void> => {
    if (!user || !user.uid) return;
    const newTask: NewTask = {
      text: newTaskText,
      status: "not-started",
      statusOrder: 2,
      createdAt: serverTimestamp(),
      created_by: user.uid,
      projectId: projectId,
    };
    try {
      await addDoc(collection(db, "tasks"), newTask);

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
    if (!user?.uid) return;

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
        updateData.completedAt = serverTimestamp();
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

      await updateDoc(doc(db, "tasks", taskId), updateData);
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
    if (!user?.uid) return;

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
              const { id, ...taskData } = taskToDelete;
              await addDoc(collection(db, "tasks"), {
                ...taskData,
                createdAt: serverTimestamp(),
              });
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
        await deleteDoc(doc(db, "tasks", taskId));
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
    if (!user?.uid) return;

    try {
      const batch = [];
      for (const task of importedTasks) {
        // Remove the id field and add to Firestore
        const { id, createdAt, completedAt, ...taskData } = task;
        const newTask: NewTask = {
          ...taskData,
          created_by: user.uid,
          createdAt: serverTimestamp(),
          completedAt: completedAt ? serverTimestamp() : undefined,
        };
        batch.push(addDoc(collection(db, "tasks"), newTask));
      }

      await Promise.all(batch);
      await refreshCurrentPage();
      toast.success(tAck("tasksImportedTitle", { count: importedTasks.length }));
    } catch (error) {
      console.error("Failed to import tasks:", error);
      toast.error(tAck("tasksImportFailedTitle"));
      throw error;
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const constraints = [
      where("created_by", "==", user.uid),
    ];

    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }

    if (filterProject !== "all") {
      constraints.push(where("projectId", "==", filterProject));
    }

    const q = query(
      collection(db, "tasks"),
      ...constraints,
      orderBy("statusOrder"),
      orderBy("createdAt", "desc"),
      limit(tasksPerPage)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites) {
          updateTasksFromSnapshot(snapshot);
        }
      },
      handleFirestoreError
    );

    return () => unsubscribe();
  }, [user?.uid, currentPage, handleFirestoreError, updateTasksFromSnapshot, filterStatus, filterProject]);

  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const getFilteredTasksForExport = async (): Promise<Task[]> => {
    if (!user?.uid) return [];

    const constraints = [
      where("created_by", "==", user.uid),
    ];

    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }

    if (filterProject !== "all") {
      constraints.push(where("projectId", "==", filterProject));
    }

    const q = query(
      collection(db, "tasks"),
      ...constraints,
      orderBy("statusOrder"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        description: data.description,
        status: data.status,
        statusOrder: data.statusOrder,
        priority: data.priority,
        dueDate: data.dueDate,
        tags: data.tags,
        subTasks: data.subTasks,
        createdAt: formatFirestoreDate(data.createdAt) || "Unknown",
        completedAt: formatFirestoreDate(data.completedAt),
        created_by: data.created_by,
        archived: data.archived,
        timeEstimate: data.timeEstimate,
        timeLogged: data.timeLogged,
        isTimerRunning: data.isTimerRunning,
        timerStartedAt: data.timerStartedAt,
        projectId: data.projectId,
      };
    });
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