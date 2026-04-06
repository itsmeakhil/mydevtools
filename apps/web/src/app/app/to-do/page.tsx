'use client';
import useAuth from "@/utils/useAuth";
import { TaskProvider } from "@/app/app/to-do/context/TaskContext";
import { TaskContainer } from "@/app/app/to-do/TaskContainer";
import { ProjectProvider } from "@/app/app/to-do/context/ProjectContext";
import { useTranslations } from "next-intl";

export default function ToDoPage() {
  const { user, loading } = useAuth(true); // Enforce authentication
  const t = useTranslations("Tasks.page");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
  }

  if (!user) {
    return null; // Redirect handled by useAuth
  }

  return (
    <ProjectProvider>
      <TaskProvider>
        <TaskContainer />
      </TaskProvider>
    </ProjectProvider>
  );
}