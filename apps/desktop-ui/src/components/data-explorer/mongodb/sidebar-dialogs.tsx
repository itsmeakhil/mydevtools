"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconLoader2 } from "@tabler/icons-react";
import type { SavedConnection } from "./types";

type ConnectionLike = { connection: { id: string; name: string } & SavedConnection };

type Setter<T> = (updater: (prev: T) => T) => void;

export type RenameCollectionState = { open: boolean; connection: SavedConnection | null; dbName: string; collectionName: string; newName: string };
export type RenameDatabaseState = { open: boolean; connection: SavedConnection | null; dbName: string; newName: string };
export type DeleteConnState = { open: boolean; index: number | null };
export type DropDbState = { open: boolean; connIndex: number | null; dbName: string };
export type DropCollState = { open: boolean; connIndex: number | null; dbName: string; collectionName: string };
export type BulkDeleteState = { open: boolean };

export function SidebarDialogs({
    connections,
    renameCollectionDialog, setRenameCollectionDialog, onRenameCollection,
    renameDatabaseDialog, setRenameDatabaseDialog, onRenameDatabase,
    deleteConnDialog, setDeleteConnDialog, onConfirmDeleteConnection,
    dropDbDialog, setDropDbDialog, onConfirmDropDatabase,
    dropCollDialog, setDropCollDialog, onConfirmDropCollection,
    bulkDeleteDialog, setBulkDeleteDialog, selectedCollections, isBulkDeleting, onConfirmBulkDelete,
}: {
    connections: ConnectionLike[];
    renameCollectionDialog: RenameCollectionState;
    setRenameCollectionDialog: Setter<RenameCollectionState>;
    onRenameCollection: () => void;
    renameDatabaseDialog: RenameDatabaseState;
    setRenameDatabaseDialog: Setter<RenameDatabaseState>;
    onRenameDatabase: () => void;
    deleteConnDialog: DeleteConnState;
    setDeleteConnDialog: Setter<DeleteConnState>;
    onConfirmDeleteConnection: () => void;
    dropDbDialog: DropDbState;
    setDropDbDialog: Setter<DropDbState>;
    onConfirmDropDatabase: () => void;
    dropCollDialog: DropCollState;
    setDropCollDialog: Setter<DropCollState>;
    onConfirmDropCollection: () => void;
    bulkDeleteDialog: BulkDeleteState;
    setBulkDeleteDialog: (s: BulkDeleteState) => void;
    selectedCollections: Set<string>;
    isBulkDeleting: boolean;
    onConfirmBulkDelete: () => void;
}) {
    const t = useTranslations("NoSqlExplorer.sidebar");
    return (
        <>
            <Dialog open={renameCollectionDialog.open} onOpenChange={(open) => setRenameCollectionDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("renameCollectionTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Input
                            value={renameCollectionDialog.newName}
                            onChange={(e) => setRenameCollectionDialog(prev => ({ ...prev, newName: e.target.value }))}
                            placeholder={t("placeholderNewCollection")}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameCollectionDialog(prev => ({ ...prev, open: false }))}>{t("cancel")}</Button>
                        <Button onClick={onRenameCollection}>{t("rename")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={renameDatabaseDialog.open} onOpenChange={(open) => setRenameDatabaseDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("renameDatabaseTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Input
                            value={renameDatabaseDialog.newName}
                            onChange={(e) => setRenameDatabaseDialog(prev => ({ ...prev, newName: e.target.value }))}
                            placeholder={t("placeholderNewDatabase")}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDatabaseDialog(prev => ({ ...prev, open: false }))}>{t("cancel")}</Button>
                        <Button onClick={onRenameDatabase}>{t("rename")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConnDialog.open} onOpenChange={(open) => setDeleteConnDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteConnection", { name: deleteConnDialog.index !== null ? connections[deleteConnDialog.index]?.connection.name : "" })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDeleteConnectionDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmDeleteConnection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("menuDeleteConnection")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={dropDbDialog.open} onOpenChange={(open) => setDropDbDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDropDb", { name: dropDbDialog.dbName })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDropDbDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmDropDatabase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("dropDatabase")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={dropCollDialog.open} onOpenChange={(open) => setDropCollDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDropCollection", { name: dropCollDialog.collectionName })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmDropCollectionDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmDropCollection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("dropCollection")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteDialog.open} onOpenChange={(open) => setBulkDeleteDialog({ open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCollections.size} Collection{selectedCollections.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p className="mb-2">The following collections will be permanently deleted:</p>
                                <ul className="max-h-48 overflow-y-auto space-y-1">
                                    {Array.from(selectedCollections).map(key => {
                                        const [connId, dbName, collName] = key.split("|");
                                        const connNode = connections.find(c => c.connection.id === connId);
                                        return (
                                            <li key={key} className="text-xs font-mono bg-muted rounded px-2 py-1">
                                                <span className="text-muted-foreground">{connNode?.connection.name ?? connId} / {dbName} / </span>
                                                <span className="font-semibold text-foreground">{collName}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className="mt-2 text-destructive font-medium">This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isBulkDeleting ? (
                                <><IconLoader2 className="h-3 w-3 mr-1.5 animate-spin" />Deleting...</>
                            ) : (
                                <>Delete {selectedCollections.size} Collection{selectedCollections.size !== 1 ? "s" : ""}</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
