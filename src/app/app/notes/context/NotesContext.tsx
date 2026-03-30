"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    where
} from "firebase/firestore";
import { db } from "@/database/firebase";
import { Note } from "../types/Note";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/database/firebase";
import { useTranslations } from "next-intl";

interface NotesContextType {
    notes: Note[];
    isLoading: boolean;
    activeNoteId: string | null;
    setActiveNoteId: (id: string | null) => void;
    createNote: (parentId?: string | null) => Promise<string>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Notes.context");
    const [user] = useAuthState(auth);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setNotes([]);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, "notes"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                // Convert timestamps to ISO strings if needed, or keep as is if they are stored as strings
                // Assuming they are stored as serverTimestamp() which returns a Timestamp object
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Note[];

            setNotes(notesData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const createNote = useCallback(async (parentId: string | null = null) => {
        if (!user) throw new Error(t("authRequiredError"));

        const newNote = {
            title: t("defaultTitle"),
            content: {},
            parentId,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            icon: "📄",
        };

        const docRef = await addDoc(collection(db, "notes"), newNote);
        setActiveNoteId(docRef.id);
        return docRef.id;
    }, [user]);

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
        if (!user) return;

        const noteRef = doc(db, "notes", id);
        await updateDoc(noteRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    }, [user]);

    const deleteNote = useCallback(async (id: string) => {
        if (!user) return;

        // Recursively delete children (optional, but good practice)
        // For now, we'll just delete the note itself. 
        // In a production app, you'd want a cloud function or batch write to delete children.

        await deleteDoc(doc(db, "notes", id));
        if (activeNoteId === id) {
            setActiveNoteId(null);
        }
    }, [user, activeNoteId]);

    return (
        <NotesContext.Provider
            value={{
                notes,
                isLoading,
                activeNoteId,
                setActiveNoteId,
                createNote,
                updateNote,
                deleteNote,
            }}
        >
            {children}
        </NotesContext.Provider>
    );
}

export function useNotes() {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error("useNotes must be used within a NotesProvider");
    }
    return context;
}
