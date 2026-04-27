"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { encryptData } from "@/lib/encryption"
import { createConnection, updateConnection } from "@/lib/s3-drive-api"
import { useS3DriveStore, type DecryptedConnection } from "@/store/s3-drive-store"
import type { ConnectionFormValues, S3Provider } from "./types"

const PROVIDER_DEFAULTS: Record<S3Provider, { region: string; endpoint: string; regionLabel: string }> = {
    aws: { region: "us-east-1", endpoint: "", regionLabel: "us-east-1" },
    digitalocean: { region: "nyc3", endpoint: "https://{region}.digitaloceanspaces.com", regionLabel: "nyc3" },
    custom: { region: "us-east-1", endpoint: "", regionLabel: "" },
}

const EMPTY_FORM: ConnectionFormValues = {
    name: "",
    provider: "aws",
    accessKey: "",
    secretKey: "",
    region: "us-east-1",
    bucket: "",
    endpoint: "",
}

type Props = {
    open: boolean
    onClose: () => void
    encryptionKey: CryptoKey
    editing?: DecryptedConnection | null
}

export function AddBucketDialog({ open, onClose, encryptionKey, editing }: Props) {
    const { addConnection, updateConnection: updateStore } = useS3DriveStore()
    const [form, setForm] = useState<ConnectionFormValues>(() =>
        editing
            ? {
                  name: editing.name,
                  provider: editing.provider as S3Provider,
                  accessKey: editing.credentials.accessKey,
                  secretKey: editing.credentials.secretKey,
                  region: editing.credentials.region,
                  bucket: editing.credentials.bucket,
                  endpoint: editing.credentials.endpoint ?? "",
              }
            : EMPTY_FORM,
    )
    const [saving, setSaving] = useState(false)
    const [showSecret, setShowSecret] = useState(false)

    useEffect(() => {
        if (!open) { setShowSecret(false); return }
        setForm(
            editing
                ? {
                      name: editing.name,
                      provider: editing.provider as S3Provider,
                      accessKey: editing.credentials.accessKey,
                      secretKey: editing.credentials.secretKey,
                      region: editing.credentials.region,
                      bucket: editing.credentials.bucket,
                      endpoint: editing.credentials.endpoint ?? "",
                  }
                : EMPTY_FORM,
        )
    }, [open, editing])

    function set(field: keyof ConnectionFormValues, value: string) {
        setForm((f) => ({ ...f, [field]: value }))
    }

    function onProviderChange(provider: S3Provider) {
        const defaults = PROVIDER_DEFAULTS[provider]
        setForm((f) => ({
            ...f,
            provider,
            region: defaults.region,
            endpoint: defaults.endpoint.replace("{region}", defaults.region),
        }))
    }

    async function onSave() {
        if (!form.name.trim()) { toast.error("Name is required"); return }
        if (!form.accessKey.trim()) { toast.error("Access key is required"); return }
        if (!form.secretKey.trim()) { toast.error("Secret key is required"); return }
        if (!form.bucket.trim()) { toast.error("Bucket name is required"); return }

        setSaving(true)
        try {
            const credentialsJson = JSON.stringify({
                accessKey: form.accessKey.trim(),
                secretKey: form.secretKey.trim(),
                region: form.region.trim() || "us-east-1",
                bucket: form.bucket.trim(),
                endpoint: form.endpoint.trim() || undefined,
            })
            const { encrypted, iv } = await encryptData(encryptionKey, credentialsJson)

            if (editing) {
                const updated = await updateConnection(editing.id, {
                    name: form.name.trim(),
                    provider: form.provider,
                    encryptedData: encrypted,
                    iv,
                    updatedAt: Date.now(),
                })
                updateStore(editing.id, {
                    ...updated,
                    credentials: JSON.parse(credentialsJson),
                })
                toast.success("Connection updated")
            } else {
                const created = await createConnection({
                    name: form.name.trim(),
                    provider: form.provider,
                    encryptedData: encrypted,
                    iv,
                    createdAt: Date.now(),
                })
                addConnection({
                    ...created,
                    credentials: JSON.parse(credentialsJson),
                })
                toast.success("Bucket added")
            }
            onClose()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save connection")
        } finally {
            setSaving(false)
        }
    }

    const showEndpoint = form.provider === "custom" || form.provider === "digitalocean"

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit connection" : "Add bucket"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input
                            placeholder="My production bucket"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Provider</Label>
                        <Select value={form.provider} onValueChange={(v) => onProviderChange(v as S3Provider)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aws">AWS S3</SelectItem>
                                <SelectItem value="digitalocean">DigitalOcean Spaces</SelectItem>
                                <SelectItem value="custom">Custom / Self-hosted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Access Key</Label>
                            <Input
                                placeholder="AKIAIOSFODNN7EXAMPLE"
                                value={form.accessKey}
                                onChange={(e) => set("accessKey", e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Secret Key</Label>
                            <div className="relative">
                                <Input
                                    type={showSecret ? "text" : "password"}
                                    placeholder="••••••••••••••••"
                                    value={form.secretKey}
                                    onChange={(e) => set("secretKey", e.target.value)}
                                    autoComplete="off"
                                    className="pr-9"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret((v) => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showSecret ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Bucket</Label>
                            <Input
                                placeholder="my-bucket"
                                value={form.bucket}
                                onChange={(e) => set("bucket", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Region</Label>
                            <Input
                                placeholder="us-east-1"
                                value={form.region}
                                onChange={(e) => set("region", e.target.value)}
                            />
                        </div>
                    </div>
                    {showEndpoint && (
                        <div className="space-y-1.5">
                            <Label>Endpoint URL</Label>
                            <Input
                                placeholder="https://nyc3.digitaloceanspaces.com"
                                value={form.endpoint}
                                onChange={(e) => set("endpoint", e.target.value)}
                            />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Credentials are encrypted locally before being stored — the server never sees your keys.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={onSave} disabled={saving}>
                        {saving ? "Saving…" : editing ? "Update" : "Add bucket"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
