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

export function JsonTree({ data, label, isLast = true, level = 0, defaultExpanded = false }: JsonTreeProps) {
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
                content = <span className="text-green-600 dark:text-green-400">"{value}"</span>;
                break;
            case 'number':
                content = <span className="text-blue-600 dark:text-blue-400">{value}</span>;
                break;
            case 'boolean':
                content = <span className="text-purple-600 dark:text-purple-400">{value.toString()}</span>;
                break;
            case 'null':
                content = <span className="text-gray-500 italic">null</span>;
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
            <div className="font-mono text-sm leading-6 hover:bg-muted/30 px-1 rounded flex items-start">
                <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center whitespace-pre">
                    {label && <span className="text-purple-700 dark:text-purple-300 mr-1">{label}:</span>}
                    {renderValue(data, type)}
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </div>
            </div>
        );
    }

    const keys = Object.keys(data);
    const itemCount = Array.isArray(data) ? data.length : keys.length;

    return (
        <div className="font-mono text-sm">
            <div
                className={cn(
                    "flex items-center hover:bg-muted/30 px-1 rounded cursor-pointer select-none",
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

                    {label && <span className="text-purple-700 dark:text-purple-300 mr-1">{label}:</span>}

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
                        className="hover:bg-muted/30 px-1 rounded"
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
}
