"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaData = { fields: any[]; sampleSize: number };

export function SchemaView({
    onLoad,
}: {
    onLoad: () => Promise<SchemaData>;
}) {
    const t = useTranslations("NoSqlExplorer.schemaView");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SchemaData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await onLoad();
            setData(result);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            setError(e.message || t("loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [onLoad]);

    useEffect(() => { load(); }, [load]);

    const typeColor: Record<string, string> = {
        string: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        number: 'bg-green-500/10 text-green-600 dark:text-green-400',
        boolean: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        ObjectId: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        Date: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        Array: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
        Object: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        null: 'bg-muted text-muted-foreground',
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground animate-pulse">{t("analyzing")}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={load}>
                    <IconRefresh className="h-3.5 w-3.5 mr-1.5" />
                    {t("retry")}
                </Button>
            </div>
        );
    }

    if (!data || data.fields.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("noDocs")}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b bg-muted/10 text-xs text-muted-foreground shrink-0 flex items-center justify-between">
                <span>{t("sampled", { docs: data.sampleSize, fields: data.fields.length })}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={load}>
                    <IconRefresh className="h-3 w-3" />
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <table className="min-w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">{t("colField")}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t("colTypes")}</th>
                            <th className="px-4 py-2.5 text-right font-medium w-24">{t("colCoverage")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.fields.map((field, i) => (
                            <tr key={field.name} className={cn("border-b", i % 2 === 0 ? "" : "bg-muted/20")}>
                                <td className="px-4 py-2.5 font-mono text-xs font-medium">{field.name}</td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                        {Object.entries(field.types as Record<string, number>).map(([type, count]) => (
                                            <span
                                                key={type}
                                                className={cn(
                                                    "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded",
                                                    typeColor[type] || 'bg-muted text-muted-foreground'
                                                )}
                                            >
                                                {type}
                                                <span className="opacity-70">×{count}</span>
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${field.coverage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground w-9 text-right">{field.coverage}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    );
}
