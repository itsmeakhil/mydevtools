import { db } from "@/database/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, serverTimestamp, updateDoc } from "firebase/firestore";
import { SavedConnection } from "./types";

const COLLECTION_NAME = "mongodb_connections";

export const saveConnection = async (userId: string, connectionString: string, name?: string) => {
    try {
        // Check if connection already exists for this user
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("connectionString", "==", connectionString)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Update existing connection's lastUsedAt
            const docId = querySnapshot.docs[0].id;
            await updateDoc(doc(db, COLLECTION_NAME, docId), {
                lastUsedAt: serverTimestamp(),
                name: name || querySnapshot.docs[0].data().name // Keep existing name if not provided
            });
            return docId;
        } else {
            // Create new connection
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                userId,
                connectionString,
                name: name || "My Connection",
                createdAt: serverTimestamp(),
                lastUsedAt: serverTimestamp(),
            });
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving connection:", error);
        throw error;
    }
};

export const getConnections = async (userId: string): Promise<SavedConnection[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            orderBy("lastUsedAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as SavedConnection[];
    } catch (error) {
        console.error("Error getting connections:", error);
        throw error;
    }
};

export const deleteConnection = async (userId: string, connectionId: string) => {
    try {
        // Verify ownership before deleting (optional but good practice, though rules should handle it)
        await deleteDoc(doc(db, COLLECTION_NAME, connectionId));
    } catch (error) {
        console.error("Error deleting connection:", error);
        throw error;
    }
};

export const updateConnectionName = async (userId: string, connectionId: string, newName: string) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, connectionId), {
            name: newName
        });
    } catch (error) {
        console.error("Error updating connection name:", error);
        throw error;
    }
};
export const updateConnectionDetails = async (userId: string, connectionId: string, updates: { name?: string, connectionString?: string }) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, connectionId), {
            ...updates,
            lastUsedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error updating connection details:", error);
        throw error;
    }
};
