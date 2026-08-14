"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Project, NewProject } from "@/app/app/to-do/types/Project";
import useAuth from "@/utils/useAuth";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ProjectContextType {
    projects: Project[];
    isLoading: boolean;
    addProject: (name: string, color: string) => Promise<void>;
    updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const tAck = useTranslations("Tasks.ack");
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const authedFetch = useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated");
            const res = await apiFetch(path, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    ...(init?.headers || {}),
                },
            })
            if (!res.ok) {
                const text = await res.text().catch(() => "")
                throw new Error(text || `Request failed (${res.status})`)
            }
            return res
        },
        [user]
    )

    useEffect(() => {
        if (!user) {
            setProjects([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false
        ;(async () => {
            try {
                setIsLoading(true)
                const res = await authedFetch("/api/backend/projects", { method: "GET" })
                const items = (await res.json()) as Project[]
                if (!cancelled) setProjects(items)
            } catch (error) {
                console.error("Error fetching projects:", error)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user, authedFetch]);

    const addProject = async (name: string, color: string) => {
        if (!user) return;

        const newProject: NewProject = {
            name,
            color,
            created_by: user.uid,
            createdAt: new Date().toISOString(),
        };

        try {
            const res = await authedFetch("/api/backend/projects", {
                method: "POST",
                body: JSON.stringify({ name: newProject.name, color: newProject.color }),
            })
            const created = (await res.json()) as Project
            setProjects((prev) => [...prev, created])
            toast.success(tAck("projectCreatedTitle"));
        } catch (error) {
            console.error("Failed to add project:", error);
            toast.error(tAck("projectCreateFailedTitle"));
        }
    };

    const updateProject = async (projectId: string, updates: Partial<Project>) => {
        if (!user) return;

        try {
            const { id, created_by, createdAt, ...updateData } = updates as any;
            const res = await authedFetch(`/api/backend/projects/${projectId}`, {
                method: "PATCH",
                body: JSON.stringify(updateData),
            })
            const updated = (await res.json()) as Project
            setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
            toast.success(tAck("projectUpdatedTitle"));
        } catch (error) {
            console.error("Failed to update project:", error);
            toast.error(tAck("projectUpdateFailedTitle"));
        }
    };

    const deleteProject = async (projectId: string) => {
        if (!user) return;

        try {
            await authedFetch(`/api/backend/projects/${projectId}`, { method: "DELETE" })
            setProjects((prev) => prev.filter((p) => p.id !== projectId))
            toast.success(tAck("projectDeletedTitle"));
        } catch (error) {
            console.error("Failed to delete project:", error);
            toast.error(tAck("projectDeleteFailedTitle"));
        }
    };

    return (
        <ProjectContext.Provider
            value={{
                projects,
                isLoading,
                addProject,
                updateProject,
                deleteProject,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjectContext() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error("useProjectContext must be used within a ProjectProvider");
    }
    return context;
}
