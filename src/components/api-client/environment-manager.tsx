"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlus, IconTrash, IconSettings, IconEye, IconEyeOff } from "@tabler/icons-react"
import { Environment, EnvironmentVariable } from "./use-environments"

interface EnvironmentManagerProps {
    environments: Environment[]
    activeEnvId: string | null
    setActiveEnvId: (id: string | null) => void
    addEnvironment: (name: string) => Promise<string>
    updateEnvironment: (id: string, updates: Partial<Environment>) => void
    deleteEnvironment: (id: string) => void
}

export function EnvironmentManager({
    environments,
    activeEnvId,
    setActiveEnvId,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment
}: EnvironmentManagerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(null)
    const [newEnvName, setNewEnvName] = React.useState("")

    // Select the first environment by default when dialog opens
    React.useEffect(() => {
        if (isOpen && !selectedEnvId && environments.length > 0) {
            setSelectedEnvId(environments[0].id)
        }
    }, [isOpen, environments, selectedEnvId])

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
        <div className="flex items-center gap-2">
            <Select
                value={activeEnvId || "none"}
                onValueChange={(val) => setActiveEnvId(val === "none" ? null : val)}
            >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue placeholder="No Environment" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No Environment</SelectItem>
                    {environments.map(env => (
                        <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <IconSettings className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Environments</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-1 gap-4 min-h-0 pt-4">
                        {/* Sidebar */}
                        <div className="w-48 flex flex-col gap-2 border-r pr-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="New Environment"
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
                                            <span className="truncate">{env.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteEnvironment(env.id)
                                                }}
                                            >
                                                <IconTrash className="h-3 w-3" />
                                            </Button>
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
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={selectedEnv.name}
                                                onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
                                                className="h-8 font-medium w-[200px] border-transparent hover:border-input focus:border-input focus:bg-background -ml-2 px-2"
                                            />
                                            <span className="text-sm text-muted-foreground font-medium hidden sm:inline-block">Variables</span>
                                        </div>
                                        <Button size="sm" onClick={handleAddVariable}>
                                            <IconPlus className="h-4 w-4 mr-2" />
                                            Add Variable
                                        </Button>
                                    </div>
                                    <div className="flex-1 border rounded-md">
                                        <div className="grid grid-cols-[1fr_1fr_40px] gap-2 p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                                            <div>VARIABLE</div>
                                            <div>VALUE</div>
                                            <div></div>
                                        </div>
                                        <ScrollArea className="h-[400px]">
                                            <div className="p-2 space-y-2">
                                                {selectedEnv.variables.map(variable => (
                                                    <div key={variable.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center group">
                                                        <Input
                                                            value={variable.key}
                                                            onChange={(e) => updateVariable(variable.id, { key: e.target.value })}
                                                            placeholder="Key"
                                                            className="h-8 font-mono text-xs"
                                                        />
                                                        <Input
                                                            value={variable.value}
                                                            onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                                                            placeholder="Value"
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
                                    Select an environment to edit
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
