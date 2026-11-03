"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconX, IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAdapter } from "./sources";
import type { UnifiedConnection, UnifiedTab } from "./types";

interface UnifiedTabBarProps {
    tabs: UnifiedTab[];
    /** Live connections — the lock glyph reads read-only from these, never
     *  from a snapshot on the tab, so toggling it updates every open tab. */
    connections: UnifiedConnection[];
    activeTabId: string | null;
    onTabChange: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCloseAll: () => void;
}

export function UnifiedTabBar({
    tabs,
    connections,
    activeTabId,
    onTabChange,
    onTabClose,
    onCloseAll,
}: UnifiedTabBarProps) {
    const t = useTranslations("DataExplorer");
    const readOnlyIds = useMemo(
        () => new Set(connections.filter((c) => c.readOnly).map((c) => c.id)),
        [connections]
    );

    // Defensive: a malformed entry would crash the whole strip on `tab.id`.
    const safeTabs = tabs.filter((tab): tab is UnifiedTab => !!tab && typeof tab.id === "string");

    if (safeTabs.length === 0) return <div className="h-9 border-b border-border bg-muted/40" />;

    return (
        <div className="flex h-9 items-center border-b border-border bg-muted/40">
            <ScrollArea className="flex-1 w-full whitespace-nowrap">
                <div className="flex items-center px-1">
                    {safeTabs.map((tab) => {
                        const adapter = getAdapter(tab.sourceId);
                        const Icon = adapter?.icon ?? IconAlertTriangle;
                        const isActive = activeTabId === tab.id;
                        return (
                            <TooltipProvider key={tab.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "group relative flex h-9 min-w-[100px] max-w-[180px] cursor-default items-center gap-1.5 border-r border-border px-3 transition-colors",
                                                isActive
                                                    ? "bg-card font-medium text-foreground"
                                                    : "text-muted-foreground hover:bg-foreground/[0.05]"
                                            )}
                                            onClick={() => onTabChange(tab.id)}
                                            style={
                                                tab.connectionColor
                                                    ? { boxShadow: `inset 0 2px 0 0 ${tab.connectionColor}` }
                                                    : undefined
                                            }
                                        >
                                            <Icon className={cn("h-3.5 w-3.5 shrink-0", adapter?.accent)} />
                                            {readOnlyIds.has(tab.connectionId) && (
                                                <IconLock className="h-3 w-3 text-warning shrink-0" />
                                            )}
                                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[13px]">
                                                {tab.title}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-4 w-4 shrink-0 rounded-full transition-opacity hover:bg-foreground/[0.08]",
                                                    isActive
                                                        ? "opacity-60 hover:opacity-100"
                                                        : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTabClose(tab.id);
                                                }}
                                            >
                                                <IconX className="h-2.5 w-2.5" />
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                        <div className="font-medium">{tab.title}</div>
                                        {tab.subtitle && (
                                            <div className="text-muted-foreground">{tab.subtitle}</div>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="shrink-0 border-l border-border px-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[13px] text-muted-foreground hover:text-destructive"
                    onClick={onCloseAll}
                >
                    {t("closeAll")}
                </Button>
            </div>
        </div>
    );
}
