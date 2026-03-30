"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    where,
    serverTimestamp,
    orderBy,
} from "firebase/firestore";
import { db } from "../../../../database/firebase";
import { Project, NewProject } from "@/app/app/to-do/types/Project";
import useAuth from "@/utils/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
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

    useEffect(() => {
        if (!user || !user.uid) {
            setProjects([]);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, "projects"),
            where("created_by", "==", user.uid),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsArray: Project[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                projectsArray.push({
                    id: doc.id,
                    name: data.name,
                    color: data.color,
                    created_by: data.created_by,
                    createdAt: data.createdAt?.toDate ? format(data.createdAt.toDate(), "dd MMM yyyy, hh:mm a") : "Unknown",
                });
            });
            setProjects(projectsArray);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const addProject = async (name: string, color: string) => {
        if (!user || !user.uid) return;

        const newProject: NewProject = {
            name,
            color,
            created_by: user.uid,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, "projects"), newProject);
            toast.success(tAck("projectCreatedTitle"));
        } catch (error) {
            console.error("Failed to add project:", error);
            toast.error(tAck("projectCreateFailedTitle"));
        }
    };

    const updateProject = async (projectId: string, updates: Partial<Project>) => {
        if (!user || !user.uid) return;

        try {
            const { id, created_by, createdAt, ...updateData } = updates as any;
            await updateDoc(doc(db, "projects", projectId), updateData);
            toast.success(tAck("projectUpdatedTitle"));
        } catch (error) {
            console.error("Failed to update project:", error);
            toast.error(tAck("projectUpdateFailedTitle"));
        }
    };

    const deleteProject = async (projectId: string) => {
        if (!user || !user.uid) return;

        try {
            await deleteDoc(doc(db, "projects", projectId));
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
