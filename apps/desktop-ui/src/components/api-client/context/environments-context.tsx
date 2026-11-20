"use client"

import * as React from "react"
import { useEnvironments } from "../use-environments"
import type { Environment, EnvironmentVariable } from "../use-environments"
import { variablesToRecord } from "@/lib/api-client/variables"

// ── Types ──────────────────────────────────────────────────────────────────

type EnvironmentsState = {
    environments: Environment[]
    activeEnvId: string | null
    activeEnvironmentVariables: Record<string, string>
    globals: EnvironmentVariable[]
    globalVariables: Record<string, string>
    /** Values of secret-flagged globals + active-environment variables, by key — for masking and redaction. */
    secretVariables: Record<string, string>
}

type EnvironmentsActions = {
    setActiveEnvId: (id: string | null) => void
    addEnvironment: (name: string) => Promise<string>
    updateEnvironment: (id: string, updates: Partial<Environment>) => void
    deleteEnvironment: (id: string) => void
    updateGlobals: (next: EnvironmentVariable[]) => Promise<void>
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
        globals,
        updateGlobals,
    } = useEnvironments()

    const activeVariables = React.useMemo(
        () => environments.find((env) => env.id === activeEnvId)?.variables ?? [],
        [environments, activeEnvId],
    )
    const activeEnvironmentVariables = React.useMemo(() => variablesToRecord(activeVariables), [activeVariables])
    const globalVariables = React.useMemo(() => variablesToRecord(globals), [globals])
    const secretVariables = React.useMemo(
        () => variablesToRecord([...globals, ...activeVariables].filter((v) => v.secret)),
        [globals, activeVariables],
    )

    const state = React.useMemo<EnvironmentsState>(
        () => ({ environments, activeEnvId, activeEnvironmentVariables, globals, globalVariables, secretVariables }),
        [environments, activeEnvId, activeEnvironmentVariables, globals, globalVariables, secretVariables]
    )

    const actions = React.useMemo<EnvironmentsActions>(
        () => ({
            setActiveEnvId,
            addEnvironment,
            updateEnvironment,
            deleteEnvironment,
            updateGlobals,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setActiveEnvId, addEnvironment, updateEnvironment, deleteEnvironment, updateGlobals]
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
