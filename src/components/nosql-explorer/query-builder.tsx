"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { db, auth } from "@/database/firebase";
import { collection, query as firestoreQuery, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs, QuerySnapshot, DocumentData } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import Editor from "@monaco-editor/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconSearch, IconHistory, IconX, IconPlus, IconTrash, IconCheck, IconFilter, IconMaximize, IconBraces, IconPlayerPlay } from "@tabler/icons-react";
import { useTheme } from "next-themes";

interface QueryBuilderProps {
    query: string;
    onSearch: (query: string) => void;
    fields: string[];
    connectionName: string;
    dbName: string;
    collectionName: string;
}

type FilterOperator = "$eq" | "$gt" | "$lt" | "$gte" | "$lte" | "$ne" | "$in" | "$regex" | "$exists";

interface FilterRule {
    id: string;
    field: string;
    operator: FilterOperator;
    value: string;
}

export function QueryBuilder({
    query,
    onSearch,
    fields,
    connectionName,
    dbName,
    collectionName,
}: QueryBuilderProps) {
    const [textQuery, setTextQuery] = useState(query);
    const [rules, setRules] = useState<FilterRule[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [queryHistory, setQueryHistory] = useState<string[]>([]);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [user] = useAuthState(auth);
    const { theme } = useTheme();
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Sync internal state with props
    useEffect(() => {
        setTextQuery(query);
    }, [query]);

    // Load history from Firestore
    useEffect(() => {
        if (!user) {
            setQueryHistory([]);
            return;
        }

        const q = firestoreQuery(
            collection(db, "nosql_query_history"),
            where("userId", "==", user.uid),
            where("connectionName", "==", connectionName),
            where("dbName", "==", dbName),
            where("collectionName", "==", collectionName)
        );

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                setQueryHistory((docData.queries as string[]) || []);
                setHistoryDocId(snapshot.docs[0].id);
            } else {
                setQueryHistory([]);
                setHistoryDocId(null);
            }
        });

        return () => unsubscribe();
    }, [user, connectionName, dbName, collectionName]);

    // Migration logic
    useEffect(() => {
        const migrate = async () => {
            if (!user) return;

            const key = `nosql_query_history_${connectionName}_${dbName}_${collectionName}`;
            const saved = localStorage.getItem(key);

            if (saved) {
                try {
                    const localHistory = JSON.parse(saved);
                    if (localHistory.length > 0) {
                        // Check if doc exists
                        const q = firestoreQuery(
                            collection(db, "nosql_query_history"),
                            where("userId", "==", user.uid),
                            where("connectionName", "==", connectionName),
                            where("dbName", "==", dbName),
                            where("collectionName", "==", collectionName)
                        );
                        const snapshot = await getDocs(q);

                        if (snapshot.empty) {
                            await addDoc(collection(db, "nosql_query_history"), {
                                userId: user.uid,
                                connectionName,
                                dbName,
                                collectionName,
                                queries: localHistory,
                                updatedAt: serverTimestamp()
                            });
                        } else {
                            // Merge? Or just ignore if cloud has data?
                            // Let's merge unique queries
                            const docRef = snapshot.docs[0].ref;
                            const currentQueries = (snapshot.docs[0].data().queries as string[]) || [];
                            const merged = [...new Set([...localHistory, ...currentQueries])].slice(0, 10);
                            await updateDoc(docRef, {
                                queries: merged,
                                updatedAt: serverTimestamp()
                            });
                        }
                        // Clear local storage
                        localStorage.removeItem(key);
                        toast.success("Migrated query history to cloud");
                    }
                } catch (e) {
                    console.error("Migration failed", e);
                }
            }
        };
        migrate();
    }, [user, connectionName, dbName, collectionName]);

    const saveQueryToHistory = async (q: string) => {
        if (!q || q === "{}" || !user) return;

        const newHistory = [q, ...queryHistory.filter(h => h !== q)].slice(0, 10);

        try {
            if (historyDocId) {
                await updateDoc(doc(db, "nosql_query_history", historyDocId), {
                    queries: newHistory,
                    updatedAt: serverTimestamp()
                });
            } else {
                const docRef = await addDoc(collection(db, "nosql_query_history"), {
                    userId: user.uid,
                    connectionName,
                    dbName,
                    collectionName,
                    queries: newHistory,
                    updatedAt: serverTimestamp()
                });
                setHistoryDocId(docRef.id);
            }
        } catch (e) {
            console.error("Failed to save history", e);
            toast.error("Failed to save query history");
        }
    };

    const deleteFromHistory = async (e: React.MouseEvent, q: string) => {
        e.stopPropagation();
        if (!user || !historyDocId) return;

        const newHistory = queryHistory.filter(h => h !== q);

        try {
            await updateDoc(doc(db, "nosql_query_history", historyDocId), {
                queries: newHistory,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Failed to delete from history", err);
            toast.error("Failed to delete query");
        }
    };

    const handleTextSearch = () => {
        try {
            JSON.parse(textQuery); // Validate JSON
            saveQueryToHistory(textQuery);
            onSearch(textQuery);
        } catch (e) {
            toast.error("Invalid JSON query");
        }
    };

    const handleBuilderSearch = () => {
        const builtQuery: any = {};
        rules.forEach(rule => {
            if (!rule.field) return;

            let value: any = rule.value;
            // Try to parse number or boolean
            if (!isNaN(Number(value)) && value.trim() !== "") {
                value = Number(value);
            } else if (value === "true") {
                value = true;
            } else if (value === "false") {
                value = false;
            }

            if (rule.operator === "$eq") {
                builtQuery[rule.field] = value;
            } else if (rule.operator === "$regex") {
                builtQuery[rule.field] = { $regex: rule.value, $options: "i" };
            } else if (rule.operator === "$exists") {
                builtQuery[rule.field] = { $exists: value === true || value === "true" };
            } else {
                builtQuery[rule.field] = { [rule.operator]: value };
            }
        });

        const jsonQuery = JSON.stringify(builtQuery, null, 2);
        setTextQuery(jsonQuery); // Sync text mode
        saveQueryToHistory(jsonQuery);
        onSearch(jsonQuery);
        setBuilderOpen(false);
    };

    const addRule = () => {
        setRules([...rules, { id: Math.random().toString(36).substr(2, 9), field: "", operator: "$eq", value: "" }]);
    };

    const removeRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const updateRule = (id: string, updates: Partial<FilterRule>) => {
        setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    // Attempt to parse text query into builder rules when switching to builder mode
    const openBuilder = () => {
        try {
            const parsed = JSON.parse(textQuery);
            const newRules: FilterRule[] = [];

            Object.entries(parsed).forEach(([key, value]: [string, any]) => {
                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                    // Handle operators like {$gt: 10}
                    Object.entries(value).forEach(([op, val]: [string, any]) => {
                        if (["$gt", "$lt", "$gte", "$lte", "$ne", "$in", "$regex", "$exists"].includes(op)) {
                            newRules.push({
                                id: Math.random().toString(36).substr(2, 9),
                                field: key,
                                operator: op as FilterOperator,
                                value: String(val)
                            });
                        }
                    });
                } else {
                    // Simple equality
                    newRules.push({
                        id: Math.random().toString(36).substr(2, 9),
                        field: key,
                        operator: "$eq",
                        value: String(value)
                    });
                }
            });

            if (newRules.length > 0) {
                setRules(newRules);
            } else if (rules.length === 0) {
                addRule();
            }
            setBuilderOpen(true);
        } catch (e) {
            // If parse fails, just open builder with existing or empty rules
            if (rules.length === 0) {
                addRule();
            }
            setBuilderOpen(true);
        }
    };

    return (
        <div className="flex items-center w-full">
            <div className="relative flex-1 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <IconSearch className="h-4 w-4" />
                </div>
                <Input
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder='Query (e.g. { "status": "active" })'
                    className="pl-9 pr-[150px] font-mono text-xs h-9 bg-background"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleTextSearch();
                    }}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setAdvancedOpen(true)}
                        title="Open Advanced Editor"
                    >
                        <IconMaximize className="h-4 w-4" />
                    </Button>
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <Popover open={builderOpen} onOpenChange={setBuilderOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", rules.length > 0 && "text-primary")}
                                onClick={openBuilder}
                                title="Visual Query Builder"
                            >
                                <IconFilter className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[600px] p-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="font-medium text-sm">Filter Rules</h4>
                                    <Button variant="ghost" size="sm" onClick={addRule} className="h-7 text-xs">
                                        <IconPlus className="h-3 w-3 mr-1" />
                                        Add Rule
                                    </Button>
                                </div>
                                <ScrollArea className="max-h-[300px]">
                                    <div className="space-y-2">
                                        {rules.length === 0 && (
                                            <div className="text-center text-xs text-muted-foreground py-4">
                                                No filters applied. Add a rule to filter documents.
                                            </div>
                                        )}
                                        {rules.map((rule, index) => (
                                            <div key={rule.id} className="flex items-center gap-2 p-2 border rounded-md bg-card/50">
                                                <div className="w-12 text-[10px] font-mono text-muted-foreground uppercase text-center">
                                                    {index === 0 ? "WHERE" : "AND"}
                                                </div>

                                                <Select value={rule.field} onValueChange={(val) => updateRule(rule.id, { field: val })}>
                                                    <SelectTrigger className="h-8 text-xs w-[140px]">
                                                        <SelectValue placeholder="Field" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fields.map(f => (
                                                            <SelectItem key={f} value={f}>{f}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select value={rule.operator} onValueChange={(val) => updateRule(rule.id, { operator: val as FilterOperator })}>
                                                    <SelectTrigger className="h-8 text-xs w-[110px]">
                                                        <SelectValue placeholder="Op" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="$eq">=</SelectItem>
                                                        <SelectItem value="$ne">!=</SelectItem>
                                                        <SelectItem value="$gt">&gt;</SelectItem>
                                                        <SelectItem value="$gte">&gt;=</SelectItem>
                                                        <SelectItem value="$lt">&lt;</SelectItem>
                                                        <SelectItem value="$lte">&lt;=</SelectItem>
                                                        <SelectItem value="$regex">Regex</SelectItem>
                                                        <SelectItem value="$in">In</SelectItem>
                                                        <SelectItem value="$exists">Exists</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {rule.operator === "$exists" ? (
                                                    <Select
                                                        value={rule.value === "true" || rule.value === "false" ? rule.value : "true"}
                                                        onValueChange={(val) => updateRule(rule.id, { value: val })}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="true">True</SelectItem>
                                                            <SelectItem value="false">False</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input
                                                        value={rule.value}
                                                        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                                        placeholder="Value"
                                                        className="h-8 text-xs flex-1"
                                                    />
                                                )}

                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRule(rule.id)}>
                                                    <IconTrash className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="flex justify-end pt-2 border-t">
                                    <Button size="sm" onClick={handleBuilderSearch}>
                                        <IconCheck className="h-3 w-3 mr-1" />
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Query History">
                                <IconHistory className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[400px] p-0">
                            <div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                                Query History
                            </div>
                            <ScrollArea className="h-[300px]">
                                {queryHistory.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No saved queries yet
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {queryHistory.map((q, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 hover:bg-muted rounded-sm cursor-pointer group text-xs font-mono"
                                                onClick={() => {
                                                    setTextQuery(q);
                                                    setHistoryOpen(false);
                                                    onSearch(q);
                                                }}
                                            >
                                                <div className="truncate flex-1 mr-2" title={q}>
                                                    {q}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    onClick={(e) => deleteFromHistory(e, q)}
                                                >
                                                    <IconX className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0 [&>button]:hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b">
                        <DialogTitle className="text-sm font-medium">Advanced Query Editor</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Select
                                onValueChange={(val) => {
                                    if (val === "lookup") {
                                        setTextQuery(`[
  {
    "$lookup": {
      "from": "other_collection",
      "localField": "local_field",
      "foreignField": "foreign_field",
      "as": "joined_data"
    }
  }
]`);
                                    } else if (val === "group") {
                                        setTextQuery(`[
  {
    "$group": {
      "_id": "$field_to_group_by",
      "count": { "$sum": 1 }
    }
  }
]`);
                                    } else if (val === "match") {
                                        setTextQuery(`[
  {
    "$match": {
      "status": "active"
    }
  }
]`);
                                    } else if (val === "empty_agg") {
                                        setTextQuery(`[]`);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-7 text-xs w-[130px]">
                                    <SelectValue placeholder="Templates" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="empty_agg">Empty Aggregation</SelectItem>
                                    <SelectItem value="match">$match (Filter)</SelectItem>
                                    <SelectItem value="lookup">$lookup (Join)</SelectItem>
                                    <SelectItem value="group">$group (Count/Sum)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    try {
                                        const formatted = JSON.stringify(JSON.parse(textQuery), null, 2);
                                        setTextQuery(formatted);
                                        toast.success("Formatted JSON");
                                    } catch (e) {
                                        toast.error("Invalid JSON");
                                    }
                                }}
                            >
                                <IconBraces className="h-3 w-3 mr-1" />
                                Format
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    handleTextSearch();
                                    setAdvancedOpen(false);
                                }}
                            >
                                <IconPlayerPlay className="h-3 w-3 mr-1" />
                                Run Query
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setAdvancedOpen(false)}
                            >
                                <IconX className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className={cn("flex-1 min-h-0", theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white')}>
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            value={textQuery}
                            onChange={(value) => setTextQuery(value || "")}
                            onMount={(editor) => {
                                // Cmd/Ctrl+Enter to run query
                                editor.addCommand(
                                    // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
                                    2048 | 3, // CtrlCmd = 2048, Enter = 3
                                    () => {
                                        handleTextSearch();
                                        setAdvancedOpen(false);
                                    }
                                );
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
