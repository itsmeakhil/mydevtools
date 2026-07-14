"use client"

import * as React from "react"
import { useEnvironments } from "../use-environments"
import type { Environment } from "../use-environments"

// ── Types ──────────────────────────────────────────────────────────────────

type EnvironmentsState = {
    environments: Environment[]
    activeEnvId: string | null
    activeEnvironmentVariables: Record<string, string>
}

type EnvironmentsActions = {
    setActiveEnvId: (id: string | null) => void
    addEnvironment: (name: string) => Promise<string>
    updateEnvironment: (id: string, updates: Partial<Environment>) => void
    deleteEnvironment: (id: string) => void
    substituteVariables: (text: string) => string
}

// ── Contexts ───────────────────────────────────────────────────────────────

const EnvironmentsStateCtx = React.createContext<EnvironmentsState | null>(null)
const EnvironmentsActionsCtx = React.createContext<EnvironmentsActions | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function EnvironmentsProvider({ children }: { children: React.ReactNode }) {
    const {
        environments,
        activeEnvId,
        setActiveEnvId,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        substituteVariables,
    } = useEnvironments()

    const activeEnvironmentVariables = React.useMemo<Record<string, string>>(() => {
        if (!activeEnvId) return {}
        const activeEnv = environments.find((env) => env.id === activeEnvId)
        if (!activeEnv) return {}
        return activeEnv.variables.reduce((acc, variable) => {
            if (variable.enabled && variable.key) {
                acc[variable.key] = variable.value
            }
            return acc
        }, {} as Record<string, string>)
    }, [environments, activeEnvId])

    const state = React.useMemo<EnvironmentsState>(
        () => ({ environments, activeEnvId, activeEnvironmentVariables }),
        [environments, activeEnvId, activeEnvironmentVariables]
    )

    const actions = React.useMemo<EnvironmentsActions>(
        () => ({
            setActiveEnvId,
            addEnvironment,
            updateEnvironment,
            deleteEnvironment,
            substituteVariables,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setActiveEnvId, addEnvironment, updateEnvironment, deleteEnvironment, substituteVariables]
    )

    return (
        <EnvironmentsStateCtx.Provider value={state}>
            <EnvironmentsActionsCtx.Provider value={actions}>
                {children}
            </EnvironmentsActionsCtx.Provider>
        </EnvironmentsStateCtx.Provider>
    )
}

// ── Consumer hooks ─────────────────────────────────────────────────────────

export function useEnvironmentsState(): EnvironmentsState {
    const v = React.useContext(EnvironmentsStateCtx)
    if (!v) throw new Error("useEnvironmentsState must be used within an EnvironmentsProvider")
    return v
}

export function useEnvironmentsActions(): EnvironmentsActions {
    const v = React.useContext(EnvironmentsActionsCtx)
    if (!v) throw new Error("useEnvironmentsActions must be used within an EnvironmentsProvider")
    return v
}
