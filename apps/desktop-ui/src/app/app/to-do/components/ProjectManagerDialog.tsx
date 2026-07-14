"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { Plus, Trash2, Edit2, Check, X, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLORS = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
];

export function ProjectManagerDialog() {
    const { projects, addProject, updateProject, deleteProject } = useProjectContext();
    const [isOpen, setIsOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    const handleAddProject = async () => {
        if (!newProjectName.trim()) return;
        await addProject(newProjectName.trim(), newProjectColor);
        setNewProjectName("");
        setNewProjectColor(COLORS[0]);
    };

    const startEditing = (project: any) => {
        setEditingId(project.id);
        setEditName(project.name);
        setEditColor(project.color);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName("");
        setEditColor("");
    };

    const saveEditing = async (id: string) => {
        if (!editName.trim()) return;
        await updateProject(id, { name: editName.trim(), color: editColor });
        setEditingId(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal h-8 px-2">
                    <FolderKanban className="mr-2 h-3.5 w-3.5" />
                    Manage Projects
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Projects</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Add New Project */}
                    <div className="flex items-end gap-2">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="name" className="text-xs">New Project Name</Label>
                            <Input
                                id="name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="e.g., Work, Personal"
                                className="h-8 text-sm"
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("w-8 h-8 p-0 rounded-full shrink-0", newProjectColor)}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="grid grid-cols-5 gap-1">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            className={cn(
                                                "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                                color,
                                                newProjectColor === color && "ring-2 ring-offset-2 ring-primary"
                                            )}
                                            onClick={() => setNewProjectColor(color)}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button onClick={handleAddProject} size="sm" className="h-8 w-8 p-0 shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="border-t my-4" />

                    {/* Project List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {projects.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No projects yet.</p>
                        )}
                        {projects.map((project) => (
                            <div key={project.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20 group">
                                {editingId === project.id ? (
                                    <>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn("w-6 h-6 p-0 rounded-full shrink-0", editColor)}
                                                />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-48 p-2">
                                                <div className="grid grid-cols-5 gap-1">
                                                    {COLORS.map((color) => (
                                                        <button
                                                            key={color}
                                                            className={cn(
                                                                "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                                                color,
                                                                editColor === color && "ring-2 ring-offset-2 ring-primary"
                                                            )}
                                                            onClick={() => setEditColor(color)}
                                                        />
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-7 text-sm flex-1"
                                        />
                                        <Button onClick={() => saveEditing(project.id)} size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-500 hover:text-green-600">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={cancelEditing} size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", project.color)} />
                                        <span className="text-sm font-medium flex-1 truncate">{project.name}</span>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button onClick={() => startEditing(project)} size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button onClick={() => deleteProject(project.id)} size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
