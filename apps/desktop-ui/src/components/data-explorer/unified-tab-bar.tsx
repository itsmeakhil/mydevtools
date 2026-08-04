"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconX, IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAdapter } from "./sources";
import type { UnifiedTab } from "./types";

interface UnifiedTabBarProps {
    tabs: UnifiedTab[];
    activeTabId: string | null;
    onTabChange: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCloseAll: () => void;
}

export function UnifiedTabBar({
    tabs,
    activeTabId,
    onTabChange,
    onTabClose,
    onCloseAll,
}: UnifiedTabBarProps) {
    const t = useTranslations("DataExplorer");

    // Defensive: a malformed entry would crash the whole strip on `tab.id`.
    const safeTabs = tabs.filter((tab): tab is UnifiedTab => !!tab && typeof tab.id === "string");

    if (safeTabs.length === 0) return <div className="border-b h-[37px] bg-muted/10" />;

    return (
        <div className="flex items-center border-b bg-muted/10">
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
                                                "group flex items-center gap-1.5 px-3 py-2 text-sm border-r cursor-pointer hover:bg-background/50 transition-colors min-w-[100px] max-w-[180px] relative",
                                                isActive
                                                    ? "bg-background font-medium border-b-2 border-b-primary"
                                                    : "text-muted-foreground"
                                            )}
                                            onClick={() => onTabChange(tab.id)}
                                            style={
                                                tab.connectionColor
                                                    ? { boxShadow: `inset 0 2px 0 0 ${tab.connectionColor}` }
                                                    : undefined
                                            }
                                        >
                                            <Icon className={cn("h-3.5 w-3.5 shrink-0", adapter?.accent)} />
                                            {tab.readOnly && (
                                                <IconLock className="h-3 w-3 text-amber-500 shrink-0" />
                                            )}
                                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
                                                {tab.title}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-4 w-4 hover:bg-muted rounded-full shrink-0 transition-opacity",
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
            <div className="border-l px-2 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onCloseAll}
                >
                    {t("closeAll")}
                </Button>
            </div>
        </div>
    );
}
