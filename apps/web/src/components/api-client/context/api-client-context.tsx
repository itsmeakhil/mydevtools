"use client"
import * as React from "react"
import { TabsProvider } from "./tabs-context"
import { CollectionsProvider } from "./collections-context"
import { EnvironmentsProvider } from "./environments-context"
import { HistoryProvider } from "./history-context"

export function ApiClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <EnvironmentsProvider>
            <HistoryProvider>
                <CollectionsProvider>
                    <TabsProvider>{children}</TabsProvider>
                </CollectionsProvider>
            </HistoryProvider>
        </EnvironmentsProvider>
    )
}
