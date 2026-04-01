"use client"

import * as React from "react"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { toast } from "sonner"
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    writeBatch
} from "firebase/firestore"
import { db, auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"

const STORAGE_KEY = "api-client-collections"

export function useCollections() {
    const [user, loading] = useAuthState(auth)
    const [collections, setCollections] = React.useState<Collection[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // Load collections from Firestore
    React.useEffect(() => {
        if (loading) return
        if (!user) {
            setCollections([])
            setIsLoading(false)
            return
        }

        const q = query(
            collection(db, "api_collections"),
            where("userId", "==", user.uid)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cols = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Collection[]

            // Sort by name or createdAt if available? 
            // For now just use the order from firestore (undefined usually)
            // Let's sort locally by name for consistency
            cols.sort((a, b) => a.name.localeCompare(b.name))

            setCollections(cols)
            setIsLoading(false)
        }, (error) => {
            console.error("Error fetching collections:", error)
            toast.error("Failed to load collections")
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [user, loading])

    // Migration logic: LocalStorage -> Firestore
    React.useEffect(() => {
        const migrateData = async () => {
            if (loading || !user || !isLoading) return
            // We wait until initial firestore load is done (isLoading is false) 
            // BUT actually we need to check if firestore is empty BEFORE we set isLoading to false?
            // No, onSnapshot fires quickly with empty result if empty.

            // Let's do this: check if collections is empty AND we have local data
            // We need a separate effect or check this inside the snapshot?
            // Separate effect is safer but tricky with race conditions.

            // Better approach: 
            // 1. Check local storage
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return

            // 2. Check if we already have data in Firestore (we can trust 'collections' state after initial load)
            // But 'collections' state updates via snapshot.
            // Let's do a one-time check.

            const q = query(collection(db, "api_collections"), where("userId", "==", user.uid))
            const snapshot = await getDocs(q)

            if (snapshot.empty) {
                try {
                    const localCollections: Collection[] = JSON.parse(stored)
                    if (localCollections.length > 0) {
                        const batch = writeBatch(db)
                        localCollections.forEach(col => {
                            // Create new doc ref
                            const newDocRef = doc(collection(db, "api_collections"))
                            batch.set(newDocRef, {
                                ...col,
                                userId: user.uid,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            })
                        })
                        await batch.commit()
                        toast.success("Migrated local collections to cloud")
                        // Clear local storage after successful migration
                        localStorage.removeItem(STORAGE_KEY)
                    }
                } catch (e) {
                    console.error("Migration failed", e)
                }
            }
        }

        if (!loading && user) {
            migrateData()
        }
    }, [user, loading]) // Run once when user loads

    const addFolder = async (parentId: string, name: string) => {
        if (!user) return

        const newFolder: CollectionFolder = {
            id: crypto.randomUUID(),
            name,
            type: "folder",
            items: [],
            isOpen: true,
        }

        // Find the collection containing this parentId
        // Since we store root collections as documents, we need to find which doc to update.
        // parentId could be the collection ID itself or a folder ID inside it.

        const targetCollection = collections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        let updatedItems: (CollectionFolder | CollectionRequest)[]
        if (targetCollection.id === parentId) {
            updatedItems = [...targetCollection.items, newFolder]
        } else {
            updatedItems = addItemToParent(targetCollection.items, parentId, newFolder)
        }

        try {
            const colRef = doc(db, "api_collections", targetCollection.id)
            await updateDoc(colRef, {
                items: updatedItems,
                updatedAt: serverTimestamp()
            })
        } catch (e) {
            console.error("Error adding folder", e)
            toast.error("Failed to add folder")
        }
    }

    const deleteItem = async (itemId: string) => {
        if (!user) return

        // Find collection containing item
        const targetCollection = collections.find(c =>
            c.items.some(i => i.id === itemId) || findItemInCollection(c.items, itemId)
        )

        // If not found in items, maybe it IS the collection?
        if (!targetCollection) {
            // Check if itemId is a collection ID
            const colToDelete = collections.find(c => c.id === itemId)
            if (colToDelete) {
                try {
                    await deleteDoc(doc(db, "api_collections", itemId))
                    toast.success("Collection deleted")
                } catch (e) {
                    console.error("Error deleting collection", e)
                    toast.error("Failed to delete collection")
                }
            }
            return
        }

        const updatedItems = deleteFromItems(targetCollection.items, itemId)

        try {
            const colRef = doc(db, "api_collections", targetCollection.id)
            await updateDoc(colRef, {
                items: updatedItems,
                updatedAt: serverTimestamp()
            })
        } catch (e) {
            console.error("Error deleting item", e)
            toast.error("Failed to delete item")
        }
    }

    const saveRequest = async (parentId: string, request: CollectionRequest) => {
        if (!user) return

        const targetCollection = collections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        // Check if parentId is the collection itself
        let updatedItems: (CollectionFolder | CollectionRequest)[]
        if (targetCollection.id === parentId) {
            updatedItems = [...targetCollection.items, request]
        } else {
            updatedItems = addItemToParent(targetCollection.items, parentId, request)
        }

        try {
            const colRef = doc(db, "api_collections", targetCollection.id)
            await updateDoc(colRef, {
                items: updatedItems,
                updatedAt: serverTimestamp()
            })
            toast.success("Request saved")
        } catch (e) {
            console.error("Error saving request", e)
            toast.error("Failed to save request")
        }
    }

    const toggleFolder = async (folderId: string) => {
        if (!user) return

        const targetCollection = collections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        const updatedItems = toggleInItems(targetCollection.items, folderId)

        // Optimistic update locally? No, let's just write to DB. 
        // Firestore is fast enough, but for toggle UI it might feel laggy.
        // We can use local state for open/close if we want, but persisting it is nice.
        // Let's write to DB.

        try {
            const colRef = doc(db, "api_collections", targetCollection.id)
            await updateDoc(colRef, {
                items: updatedItems
                // Don't update updatedAt for just toggling?
            })
        } catch (e) {
            console.error("Error toggling folder", e)
        }
    }

    // Helper functions
    const findItemInCollection = (items: (CollectionFolder | CollectionRequest)[], targetId: string): boolean => {
        for (const item of items) {
            if (item.id === targetId) return true
            if ("type" in item && item.type === "folder") {
                if (findItemInCollection(item.items, targetId)) return true
            }
        }
        return false
    }

    const addItemToParent = (
        items: (CollectionFolder | CollectionRequest)[],
        parentId: string,
        newItem: CollectionFolder | CollectionRequest
    ): (CollectionFolder | CollectionRequest)[] => {
        return items.map((item) => {
            if ("type" in item && item.type === "folder") {
                if (item.id === parentId) {
                    return { ...item, items: [...item.items, newItem], isOpen: true }
                }
                return { ...item, items: addItemToParent(item.items, parentId, newItem) }
            }
            return item
        })
    }

    const deleteFromItems = (
        items: (CollectionFolder | CollectionRequest)[],
        itemId: string
    ): (CollectionFolder | CollectionRequest)[] => {
        return items
            .filter((item) => item.id !== itemId)
            .map((item) => {
                if ("type" in item && item.type === "folder") {
                    return { ...item, items: deleteFromItems(item.items, itemId) }
                }
                return item
            })
    }

    const toggleInItems = (
        items: (CollectionFolder | CollectionRequest)[],
        folderId: string
    ): (CollectionFolder | CollectionRequest)[] => {
        return items.map((item) => {
            if ("type" in item && item.type === "folder") {
                if (item.id === folderId) {
                    return { ...item, isOpen: !item.isOpen }
                }
                return { ...item, items: toggleInItems(item.items, folderId) }
            }
            return item
        })
    }

    // Add a way to create a new root collection
    const createCollection = async (name: string) => {
        if (!user) return
        try {
            await addDoc(collection(db, "api_collections"), {
                name,
                userId: user.uid,
                items: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
            toast.success("Collection created")
        } catch (e) {
            console.error("Error creating collection", e)
            toast.error("Failed to create collection")
        }
    }

    const renameCollection = async (collectionId: string, name: string) => {
        if (!user) return
        try {
            const colRef = doc(db, "api_collections", collectionId)
            await updateDoc(colRef, {
                name,
                updatedAt: serverTimestamp()
            })
            toast.success("Collection renamed")
        } catch (e) {
            console.error("Error renaming collection", e)
            toast.error("Failed to rename collection")
        }
    }

    return {
        collections,
        addFolder,
        deleteItem,
        saveRequest,
        toggleFolder,
        createCollection,
        renameCollection,
        isLoading
    }
}
