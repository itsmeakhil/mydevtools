"use client"

import * as React from "react"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"

export interface EnvironmentVariable {
    id: string
    key: string
    value: string
    enabled: boolean
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
    const [user, loading] = useAuthState(auth)
    const [environments, setEnvironments] = React.useState<Environment[]>([])
    const [activeEnvId, setActiveEnvId] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const migrationRanRef = React.useRef(false)

    React.useEffect(() => {
        if (!user) migrationRanRef.current = false
    }, [user])

    const authedFetch = React.useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated")
            const token = await user.getIdToken()
            const res = await fetch(path, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    ...(init?.headers || {}),
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            })
            if (!res.ok) {
                const text = await res.text().catch(() => "")
                throw new Error(text || `Request failed (${res.status})`)
            }
            return res
        },
        [user]
    )

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
                toast.error("Failed to load environments")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user, loading, authedFetch])

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
                toast.success("Migrated local environments to cloud")
                localStorage.removeItem(STORAGE_KEY)
                setEnvironments(sortEnvs(migrated))
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

    // Persist active env to local storage
    React.useEffect(() => {
        if (activeEnvId) {
            localStorage.setItem(ACTIVE_ENV_KEY, activeEnvId)
        } else {
            localStorage.removeItem(ACTIVE_ENV_KEY)
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
            toast.success("Environment created")
            return created.id
        } catch (e) {
            console.error("Error creating environment", e)
            toast.error("Failed to create environment")
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
        } catch (e) {
            console.error("Error updating environment", e)
            toast.error("Failed to update environment")
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
            toast.success("Environment deleted")
        } catch (e) {
            console.error("Error deleting environment", e)
            toast.error("Failed to delete environment")
        }
    }

    const getActiveVariables = (): Record<string, string> => {
        if (!activeEnvId) return {}
        const env = environments.find(e => e.id === activeEnvId)
        if (!env) return {}

        return env.variables.reduce((acc, v) => {
            if (v.enabled && v.key) {
                acc[v.key] = v.value
            }
            return acc
        }, {} as Record<string, string>)
    }

    const substituteVariables = (text: string): string => {
        if (!text) return text
        const variables = getActiveVariables()
        return text.replace(/\{\{(.+?)\}\}/g, (match, key) => {
            return variables[key.trim()] || match
        })
    }

    return {
        environments,
        activeEnvId,
        setActiveEnvId,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        substituteVariables,
        isLoading
    }
}
