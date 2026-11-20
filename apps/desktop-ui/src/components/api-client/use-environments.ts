"use client"

import * as React from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import useAuth from "@/utils/useAuth"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"
import { apiFetch } from "@/lib/desktop/api-fetch"
import { broadcastApiClientUpdate, useApiClientSyncListener } from "@/lib/api-client-sync"

export interface EnvironmentVariable {
    id: string
    key: string
    value: string
    enabled: boolean
    /** Masked in the UI, blanked in exports and redacted from metrics/logs. */
    secret?: boolean
}

export interface Environment {
    id: string
    name: string
    variables: EnvironmentVariable[]
    userId?: string
}

const STORAGE_KEY = "api-client-environments"
const ACTIVE_ENV_KEY = "api-client-active-environment"

function sortEnvs(envs: Environment[]) {
    return [...envs].sort((a, b) => a.name.localeCompare(b.name))
}

export function useEnvironments() {
    const { user, loading } = useAuth()
    const [environments, setEnvironments] = React.useState<Environment[]>([])
    const [activeEnvId, setActiveEnvId] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const migrationRanRef = React.useRef(false)
    // Globals: one list in the local preferences doc, below collection variables.
    const [globals, setGlobals] = React.useState<EnvironmentVariable[]>([])
    const tGlobals = useTranslations("ApiClient.globals")
    const te = useTranslations("ApiClient.environmentToasts")

    React.useEffect(() => {
        if (loading || !user) return
        let cancelled = false
        getUserPreferences()
            .then((p) => { if (!cancelled) setGlobals(p.apiClientGlobals ?? []) })
            .catch((e) => console.error("Error loading globals:", e))
        return () => { cancelled = true }
    }, [user, loading])

    const globalsRef = React.useRef(globals)
    React.useEffect(() => { globalsRef.current = globals }, [globals])
    const updateGlobals = React.useCallback(async (next: EnvironmentVariable[]) => {
        const prev = globalsRef.current
        setGlobals(next)
        try {
            await patchUserPreferences({ apiClientGlobals: next })
        } catch (e) {
            // Restore so the edit isn't silently dropped; the next change retries.
            setGlobals(prev)
            console.error("Error saving globals", e)
            toast.error(tGlobals("saveFailed"))
        }
    }, [tGlobals])

    React.useEffect(() => {
        if (!user) migrationRanRef.current = false
    }, [user])

    const authedFetch = React.useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated")
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

    const reload = React.useCallback(async () => {
        if (!user) return
        try {
            const res = await authedFetch("/api/backend/api-client/environments", { method: "GET" })
            setEnvironments(sortEnvs((await res.json()) as Environment[]))
        } catch (error) {
            console.error("Error fetching environments:", error)
        }
    }, [user, authedFetch])

    // Load environments from backend
    React.useEffect(() => {
        if (loading) return
        if (!user) {
            setEnvironments([])
            setIsLoading(false)
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                setIsLoading(true)
                const res = await authedFetch("/api/backend/api-client/environments", { method: "GET" })
                const envs = sortEnvs((await res.json()) as Environment[])
                if (!cancelled) setEnvironments(envs)
            } catch (error) {
                console.error("Error fetching environments:", error)
                toast.error(te("loadFailed"))
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user, loading, authedFetch])

    useApiClientSyncListener("environments", () => { void reload() })

    // Migration: localStorage → backend once when server has no environments
    React.useEffect(() => {
        const migrateData = async () => {
            if (loading || !user || isLoading || migrationRanRef.current) return

            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return
            if (environments.length > 0) return

            migrationRanRef.current = true
            try {
                const localEnvironments: Environment[] = JSON.parse(stored)
                const migrated: Environment[] = []
                for (const env of localEnvironments) {
                    const res = await authedFetch("/api/backend/api-client/environments", {
                        method: "POST",
                        body: JSON.stringify({ name: env.name }),
                    })
                    const created = (await res.json()) as Environment
                    if (env.variables?.length) {
                        const patchRes = await authedFetch(`/api/backend/api-client/environments/${created.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ variables: env.variables }),
                        })
                        migrated.push((await patchRes.json()) as Environment)
                    } else {
                        migrated.push(created)
                    }
                }
                // Reconcile from server-confirmed migrated set BEFORE dropping the local copy,
                // so a tab close mid-migration can't leave the user with nothing.
                setEnvironments(sortEnvs(migrated))
                localStorage.removeItem(STORAGE_KEY)
                toast.success("Migrated local environments to cloud")
            } catch (e) {
                migrationRanRef.current = false
                console.error("Migration failed", e)
            }
        }

        void migrateData()
    }, [user, loading, isLoading, environments.length, authedFetch])

    // Load active env from local storage
    React.useEffect(() => {
        const storedActive = localStorage.getItem(ACTIVE_ENV_KEY)
        if (storedActive) {
            setActiveEnvId(storedActive)
        }
    }, [])

    // Clear activeEnvId if the env no longer exists (deleted on another device)
    React.useEffect(() => {
        if (isLoading || !activeEnvId) return
        const exists = environments.some(e => e.id === activeEnvId)
        if (!exists) setActiveEnvId(null)
    }, [environments, isLoading, activeEnvId])

    // Persist active env to local storage
    React.useEffect(() => {
        try {
            if (activeEnvId) {
                localStorage.setItem(ACTIVE_ENV_KEY, activeEnvId)
            } else {
                localStorage.removeItem(ACTIVE_ENV_KEY)
            }
        } catch (e) {
            console.warn("api-client active env: localStorage write failed", e)
        }
    }, [activeEnvId])

    const addEnvironment = async (name: string) => {
        if (!user) return ""

        try {
            const res = await authedFetch("/api/backend/api-client/environments", {
                method: "POST",
                body: JSON.stringify({ name }),
            })
            const created = (await res.json()) as Environment
            setEnvironments((prev) => sortEnvs([...prev, created]))
            broadcastApiClientUpdate("environments")
            toast.success(te("created"))
            return created.id
        } catch (e) {
            console.error("Error creating environment", e)
            toast.error(te("createFailed"))
            return ""
        }
    }

    const updateEnvironment = async (id: string, updates: Partial<Environment>) => {
        if (!user) return

        try {
            const res = await authedFetch(`/api/backend/api-client/environments/${id}`, {
                method: "PATCH",
                body: JSON.stringify(updates),
            })
            const updated = (await res.json()) as Environment
            setEnvironments((prev) => sortEnvs(prev.map((e) => (e.id === updated.id ? updated : e))))
            broadcastApiClientUpdate("environments")
        } catch (e) {
            console.error("Error updating environment", e)
            toast.error(te("updateFailed"))
        }
    }

    const deleteEnvironment = async (id: string) => {
        if (!user) return

        try {
            await authedFetch(`/api/backend/api-client/environments/${id}`, { method: "DELETE" })
            setEnvironments((prev) => prev.filter((e) => e.id !== id))
            if (activeEnvId === id) {
                setActiveEnvId(null)
            }
            broadcastApiClientUpdate("environments")
            toast.success(te("deleted"))
        } catch (e) {
            console.error("Error deleting environment", e)
            toast.error(te("deleteFailed"))
        }
    }

    return {
        environments,
        activeEnvId,
        setActiveEnvId,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        globals,
        updateGlobals,
        isLoading
    }
}
