"use client"
import * as React from "react"
import { TabsProvider } from "./tabs-context"
import { CollectionsProvider } from "./collections-context"
import { EnvironmentsProvider } from "./environments-context"
import { HistoryProvider } from "./history-context"
import { WorkspacesProvider } from "./workspaces-context"

export function ApiClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <WorkspacesProvider>
            <EnvironmentsProvider>
                <HistoryProvider>
                    <CollectionsProvider>
                        <TabsProvider>{children}</TabsProvider>
                    </CollectionsProvider>
                </HistoryProvider>
            </EnvironmentsProvider>
        </WorkspacesProvider>
    )
}
