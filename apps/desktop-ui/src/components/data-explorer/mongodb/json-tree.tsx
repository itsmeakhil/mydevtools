"use client";

import React, { useState } from 'react';
import { useTranslations } from "next-intl";
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JsonTreeProps {
    data: any;
    label?: string;
    isLast?: boolean;
    level?: number;
    defaultExpanded?: boolean;
}

export const JsonTree = React.memo(function JsonTree({ data, label, isLast = true, level = 0, defaultExpanded = false }: JsonTreeProps) {
    const t = useTranslations("NoSqlExplorer.jsonTree");
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 1);

    const getType = (value: any) => {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    };

    const type = getType(data);
    const isObject = type === 'object' || type === 'array';
    const isEmpty = isObject && Object.keys(data).length === 0;

    const renderValue = (value: any, type: string) => {
        let content;
        switch (type) {
            case 'string':
                content = <span className="text-success">"{value}"</span>;
                break;
            case 'number':
                content = <span className="text-primary tabular-nums">{value}</span>;
                break;
            case 'boolean':
                content = <span className="text-purple-500">{value.toString()}</span>;
                break;
            case 'null':
                content = <span className="text-muted-foreground italic">null</span>;
                break;
            default:
                content = <span className="text-foreground">{String(value)}</span>;
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-default">{content}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="capitalize">{t("typeLabel", { type })}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    if (!isObject) {
        return (
            <div className="font-mono text-[13px] leading-6 hover:bg-foreground/[0.03] px-1 rounded-sm flex items-start">
                <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center whitespace-pre">
                    {label && <span className="text-purple-500 mr-1">{label}:</span>}
                    {renderValue(data, type)}
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </div>
            </div>
        );
    }

    const keys = Object.keys(data);
    const itemCount = Array.isArray(data) ? data.length : keys.length;

    return (
        <div className="font-mono text-[13px]">
            <div
                className={cn(
                    "flex items-center hover:bg-foreground/[0.03] px-1 rounded-sm cursor-default select-none",
                    isEmpty && "cursor-default"
                )}
                onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
            >
                <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center">
                    {!isEmpty && (
                        <div className="mr-1 text-muted-foreground">
                            {isExpanded ? <IconChevronDown className="h-3 w-3" /> : <IconChevronRight className="h-3 w-3" />}
                        </div>
                    )}
                    {isEmpty && <div className="w-4 mr-1" />}

                    {label && <span className="text-purple-500 mr-1">{label}:</span>}

                    <span className="text-muted-foreground">
                        {Array.isArray(data) ? '[' : '{'}
                    </span>

                    {!isExpanded && !isEmpty && (
                        <span className="text-muted-foreground mx-1 italic text-xs">
                            ... {t("itemSummary", { count: itemCount })} ...
                        </span>
                    )}

                    {(!isExpanded || isEmpty) && (
                        <span className="text-muted-foreground">
                            {Array.isArray(data) ? ']' : '}'}
                            {!isLast && ','}
                        </span>
                    )}
                </div>
            </div>

            {isExpanded && !isEmpty && (
                <div>
                    {keys.map((key, index) => (
                        <JsonTree
                            key={key}
                            data={data[key]}
                            label={Array.isArray(data) ? undefined : key}
                            isLast={index === keys.length - 1}
                            level={level + 1}
                        />
                    ))}
                    <div
                        className="hover:bg-foreground/[0.03] px-1 rounded-sm"
                        style={{ paddingLeft: `${level * 16 + 20}px` }}
                    >
                        <span className="text-muted-foreground">
                            {Array.isArray(data) ? ']' : '}'}
                            {!isLast && ','}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});
