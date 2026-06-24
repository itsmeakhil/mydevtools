"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IconMaximize } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { JsonTree } from "./json-tree";

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.\-Z+]+)?$/;
export const OBJECTID_RE = /^[0-9a-fA-F]{24}$/;

export function getRelativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const abs = Math.abs(diffMs);
    const sec = Math.floor(abs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const mo = Math.floor(day / 30);
    const yr = Math.floor(day / 365);
    const suffix = diffMs < 0 ? ' from now' : ' ago';
    if (sec < 60) return 'just now';
    if (min < 60) return `${min}m${suffix}`;
    if (hr < 24) return `${hr}h${suffix}`;
    if (day < 30) return `${day}d${suffix}`;
    if (mo < 12) return `${mo}mo${suffix}`;
    return `${yr}y${suffix}`;
}

export function DateCell({ date }: { date: Date }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center font-mono text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded cursor-default">
                        {getRelativeTime(date)}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono text-xs">{date.toLocaleString()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function ObjectIdCell({ value }: { value: string }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded cursor-default">
                        <span className="opacity-60 text-[9px]">ObjId</span>
                        <span className="truncate max-w-[110px]">{value}</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono text-xs">{value}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CellValue({ value, onViewClick }: { value: any; onViewClick: (v: any) => void }) {
    const t = useTranslations("NoSqlExplorer.document");
    if (value === undefined) return null;

    if (value === null) {
        return <span className="text-muted-foreground italic text-xs">null</span>;
    }

    if (typeof value === 'boolean') {
        return (
            <span className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium font-mono",
                value
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
                {value.toString()}
            </span>
        );
    }

    if (typeof value === 'number') {
        return <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{value.toLocaleString()}</span>;
    }

    if (typeof value === 'object') {
        if (value.$oid) return <ObjectIdCell value={value.$oid} />;
        if (value.$date) {
            const ts = typeof value.$date === 'object' ? value.$date.$numberLong : value.$date;
            return <DateCell date={new Date(ts)} />;
        }

        return (
            <Popover>
                <PopoverTrigger className="text-blue-500 hover:underline focus:outline-none outline-none text-xs font-mono cursor-pointer">
                    {Array.isArray(value) ? t("cellArray", { length: value.length }) : "{...}"}
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 shadow-lg" align="start" side="bottom">
                    <div className="max-h-[300px] overflow-auto bg-card rounded-md">
                        <div className="p-2 border-b bg-muted/50 text-xs font-semibold flex justify-between items-center sticky top-0 z-10">
                            <span className="truncate pr-2 font-mono text-muted-foreground">
                                {Array.isArray(value) ? t("cellArrayBracket", { length: value.length }) : t("cellObject")}
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 bg-background shadow-sm" onClick={(e) => { e.stopPropagation(); onViewClick(value); }} title={t("openFullEditor")}>
                                <IconMaximize className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="p-2">
                            <JsonTree data={value} label="Root" defaultExpanded={true} />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    const str = String(value);

    if (OBJECTID_RE.test(str)) return <ObjectIdCell value={str} />;

    if (ISO_DATE_RE.test(str)) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return <DateCell date={d} />;
    }

    if (str.length > 120) {
        return (
            <span className="font-mono text-xs">
                {str.slice(0, 80)}
                <button
                    className="ml-1 text-blue-500 hover:underline text-[10px]"
                    onClick={() => onViewClick(str)}
                >
                    +{str.length - 80} chars
                </button>
            </span>
        );
    }

    return <span className="font-mono text-xs">{str}</span>;
}

export function SkeletonRow({ colCount }: { colCount: number }) {
    return (
        <tr className="border-b animate-pulse">
            <td className="px-3 py-3"><div className="h-3.5 w-3.5 bg-muted rounded" /></td>
            <td className="px-4 py-3"><div className="h-3 w-6 bg-muted rounded" /></td>
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3 rounded bg-muted" style={{ width: `${40 + (i * 17) % 50}%` }} />
                </td>
            ))}
            <td className="px-4 py-3">
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map(j => <div key={j} className="h-6 w-6 rounded bg-muted" />)}
                </div>
            </td>
        </tr>
    );
}
