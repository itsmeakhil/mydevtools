"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlus, IconTrash, IconEdit, IconDownload } from "@tabler/icons-react"
import { EnvironmentVariable } from "./use-environments"
import { downloadEnvironmentAsPostman } from "@/lib/export/postman-env"
import { useTranslations } from "next-intl"
import { useEnvironmentsState, useEnvironmentsActions } from "./context/environments-context"

interface EnvironmentManagerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EnvironmentManager({ open, onOpenChange }: EnvironmentManagerProps) {
    const { environments } = useEnvironmentsState()
    const { addEnvironment, updateEnvironment, deleteEnvironment } = useEnvironmentsActions()
    const t = useTranslations("ApiClient.environmentManager")
    const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(null)
    const [newEnvName, setNewEnvName] = React.useState("")
    const [editingEnvId, setEditingEnvId] = React.useState<string | null>(null)
    const [editingName, setEditingName] = React.useState("")

    // Select the first environment by default when dialog opens
    React.useEffect(() => {
        if (open && !selectedEnvId && environments.length > 0) {
            setSelectedEnvId(environments[0].id)
        }
    }, [open, environments, selectedEnvId])

    const selectedEnv = environments.find(e => e.id === selectedEnvId)

    const handleAddVariable = () => {
        if (!selectedEnv) return
        const newVar: EnvironmentVariable = {
            id: crypto.randomUUID(),
            key: "",
            value: "",
            enabled: true
        }
        updateEnvironment(selectedEnv.id, {
            variables: [...selectedEnv.variables, newVar]
        })
    }

    const updateVariable = (varId: string, updates: Partial<EnvironmentVariable>) => {
        if (!selectedEnv) return
        const newVariables = selectedEnv.variables.map(v =>
            v.id === varId ? { ...v, ...updates } : v
        )
        updateEnvironment(selectedEnv.id, { variables: newVariables })
    }

    const deleteVariable = (varId: string) => {
        if (!selectedEnv) return
        const newVariables = selectedEnv.variables.filter(v => v.id !== varId)
        updateEnvironment(selectedEnv.id, { variables: newVariables })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("manageDialogTitle")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-1 gap-4 min-h-0 pt-4">
                        {/* Sidebar */}
                        <div className="w-48 flex flex-col gap-2 border-r pr-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder={t("placeholderNewEnv")}
                                    value={newEnvName}
                                    onChange={(e) => setNewEnvName(e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <Button
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    disabled={!newEnvName}
                                    onClick={async () => {
                                        const id = await addEnvironment(newEnvName)
                                        setNewEnvName("")
                                        setSelectedEnvId(id)
                                    }}
                                >
                                    <IconPlus className="h-4 w-4" />
                                </Button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="space-y-1">
                                    {environments.map(env => (
                                        <div
                                            key={env.id}
                                            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${selectedEnvId === env.id ? "bg-secondary" : "hover:bg-muted"}`}
                                            onClick={() => setSelectedEnvId(env.id)}
                                        >
                                            {editingEnvId === env.id ? (
                                                <Input
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onBlur={() => {
                                                        if (editingName.trim() && editingName !== env.name) {
                                                            updateEnvironment(env.id, { name: editingName.trim() });
                                                        }
                                                        setEditingEnvId(null);
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        } else if (e.key === 'Escape') {
                                                            setEditingEnvId(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="h-6 text-xs w-full mr-2"
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="truncate pr-2">{env.name}</span>
                                            )}
                                            {editingEnvId !== env.id && (
                                                <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingEnvId(env.id)
                                                            setEditingName(env.name)
                                                        }}
                                                    >
                                                        <IconEdit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        title={t("exportPostman")}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            downloadEnvironmentAsPostman(env)
                                                        }}
                                                    >
                                                        <IconDownload className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteEnvironment(env.id)
                                                        }}
                                                    >
                                                        <IconTrash className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col gap-4">
                            {selectedEnv ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium">{t("variablesHeading", { name: selectedEnv.name })}</h3>
                                        <Button size="sm" onClick={handleAddVariable}>
                                            <IconPlus className="h-4 w-4 mr-2" />
                                            {t("addVariable")}
                                        </Button>
                                    </div>
                                    <div className="flex-1 border rounded-md">
                                        <div className="grid grid-cols-[1fr_1fr_40px] gap-2 p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                                            <div>{t("columnVariable")}</div>
                                            <div>{t("columnValue")}</div>
                                            <div></div>
                                        </div>
                                        <ScrollArea className="h-[400px]">
                                            <div className="p-2 space-y-2">
                                                {selectedEnv.variables.map(variable => (
                                                    <div key={variable.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center group">
                                                        <Input
                                                            value={variable.key}
                                                            onChange={(e) => updateVariable(variable.id, { key: e.target.value })}
                                                            placeholder={t("placeholderKey")}
                                                            className="h-8 font-mono text-xs"
                                                        />
                                                        <Input
                                                            value={variable.value}
                                                            onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                                                            placeholder={t("placeholderValue")}
                                                            className="h-8 font-mono text-xs"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                                            onClick={() => deleteVariable(variable.id)}
                                                        >
                                                            <IconTrash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                    {t("selectEnvToEdit")}
                                </div>
                            )}
                        </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
