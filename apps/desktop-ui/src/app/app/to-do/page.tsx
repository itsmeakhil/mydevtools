'use client';
import useAuth from "@/utils/useAuth";
import { TaskProvider } from "@/app/app/to-do/context/TaskContext";
import { TaskContainer } from "@/app/app/to-do/TaskContainer";
import { ProjectProvider } from "@/app/app/to-do/context/ProjectContext";
import { ToDoQueryProvider } from "@/app/app/to-do/providers";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function ToDoPage() {
  const { user, loading } = useAuth(true); // Enforce authentication
  const t = useTranslations("Tasks.page");

  if (loading) {
    return (
      <div className="h-full min-h-0 w-full flex flex-1 flex-col container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6 shrink-0">
          <Skeleton className="h-9 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useAuth
  }

  return (
    <ToDoQueryProvider>
      <ProjectProvider>
        <TaskProvider>
          <TaskContainer />
        </TaskProvider>
      </ProjectProvider>
    </ToDoQueryProvider>
  );
}