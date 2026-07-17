"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconX, IconFolder, IconLock } from "@tabler/icons-react";
import { ExplorerTab } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TabBarProps {
    tabs: ExplorerTab[];
    activeTabId: string | null;
    onTabChange: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCloseAll?: () => void;
}

export function TabBar({ tabs, activeTabId, onTabChange, onTabClose, onCloseAll }: TabBarProps) {
    const t = useTranslations("NoSqlExplorer.tabs");
    const hasActiveQuery = (tab: ExplorerTab) => {
        try {
            const q = tab.query?.trim();
            if (!q || q === "{}") return false;
            const parsed = JSON.parse(q);
            return Object.keys(parsed).length > 0;
        } catch {
            return false;
        }
    };

    if (tabs.length === 0) {
        return <div className="border-b h-[37px] bg-muted/10" />;
    }

    // Defensive: filter out malformed entries — a single undefined/missing-id tab
    // would crash the whole component (`tab.id` read on undefined inside .map).
    const safeTabs = tabs.filter((t): t is ExplorerTab => !!t && typeof t.id === "string");

    return (
        <div className="flex items-center border-b bg-muted/10">
            <ScrollArea className="flex-1 w-full whitespace-nowrap">
                <div className="flex items-center px-1">
                    {safeTabs.map((tab) => {
                        const isActive = activeTabId === tab.id;
                        const isFiltered = hasActiveQuery(tab);
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
                                            style={tab.connectionColor ? { boxShadow: `inset 0 2px 0 0 ${tab.connectionColor}` } : undefined}
                                        >
                                            <IconFolder className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-yellow-500" : "text-yellow-500/60")} />
                                            {tab.readOnly && <IconLock className="h-3 w-3 text-amber-500 shrink-0" />}
                                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
                                                {tab.collectionName}
                                            </span>
                                            {isFiltered && (
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                                                    title={t("filterActive")}
                                                />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-4 w-4 hover:bg-muted rounded-full shrink-0 transition-opacity",
                                                    isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
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
                                        <div className="font-medium">{tab.collectionName}</div>
                                        <div className="text-muted-foreground">{tab.connectionName} › {tab.dbName}</div>
                                        {isFiltered && <div className="text-primary mt-0.5">{t("filterActiveTooltip")}</div>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {tabs.length > 0 && onCloseAll && (
                <div className="border-l px-2 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={onCloseAll}>
                        {t("closeAll")}
                    </Button>
                </div>
            )}
        </div>
    );
}
