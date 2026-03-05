"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyValueEditor } from "./key-value-editor"
import { KeyValueItem, RequestBody, RequestAuth } from "./types"
import CodeEditor from "@/components/ui/code-editor"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface RequestTabsProps {
    params: KeyValueItem[]
    setParams: (params: KeyValueItem[]) => void
    headers: KeyValueItem[]
    setHeaders: (headers: KeyValueItem[]) => void
    body: RequestBody
    setBody: (body: RequestBody) => void
    auth: RequestAuth
    setAuth: (auth: RequestAuth) => void
}

export function RequestTabs({
    params,
    setParams,
    headers,
    setHeaders,
    body,
    setBody,
    auth,
    setAuth,
}: RequestTabsProps) {
    return (
        <Tabs defaultValue="params" className="w-full">
            <TabsList className="w-full justify-start">
                <TabsTrigger value="params">Params</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="auth">Auth</TabsTrigger>
            </TabsList>
            <div className="mt-4 border rounded-md p-4 min-h-[300px]">
                <TabsContent value="params" className="mt-0">
                    <KeyValueEditor items={params} onChange={setParams} />
                </TabsContent>
                <TabsContent value="headers" className="mt-0">
                    <KeyValueEditor items={headers} onChange={setHeaders} />
                </TabsContent>
                <TabsContent value="body" className="mt-0 h-[300px] flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Label>Body Type</Label>
                        <Select
                            value={body.type}
                            onValueChange={(v) => setBody({ ...body, type: v as any })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select body type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {body.type !== "none" && (
                        <div className="flex-1 border rounded-md overflow-hidden">
                            <CodeEditor
                                value={body.content}
                                onChange={(v) => setBody({ ...body, content: v })}
                                language={body.type === "json" ? "json" : "plaintext"}
                            />
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="auth" className="mt-0 space-y-4">
                    <div className="flex items-center gap-4">
                        <Label>Auth Type</Label>
                        <Select
                            value={auth.type}
                            onValueChange={(v) => setAuth({ ...auth, type: v as any })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select auth type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="basic">Basic Auth</SelectItem>
                                <SelectItem value="api-key">API Key</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {auth.type === "bearer" && (
                        <div className="space-y-2 max-w-md">
                            <Label>Token</Label>
                            <Input
                                type="password"
                                value={auth.token || ""}
                                onChange={(e) => setAuth({ ...auth, token: e.target.value })}
                                placeholder="Bearer Token"
                            />
                        </div>
                    )}

                    {auth.type === "basic" && (
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    value={auth.username || ""}
                                    onChange={(e) => setAuth({ ...auth, username: e.target.value })}
                                    placeholder="Username"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={auth.password || ""}
                                    onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                                    placeholder="Password"
                                />
                            </div>
                        </div>
                    )}
                    {auth.type === "api-key" && (
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    value={auth.apiKeyKey || ""}
                                    onChange={(e) => setAuth({ ...auth, apiKeyKey: e.target.value })}
                                    placeholder="Key Name (e.g. X-Api-Key)"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                    type="password"
                                    value={auth.apiKeyValue || ""}
                                    onChange={(e) => setAuth({ ...auth, apiKeyValue: e.target.value })}
                                    placeholder="Value"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Add to</Label>
                                <Select
                                    value={auth.apiKeyLocation || "header"}
                                    onValueChange={(v) => setAuth({ ...auth, apiKeyLocation: v as any })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Add to" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="header">Header</SelectItem>
                                        <SelectItem value="query">Query Params</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </div>
        </Tabs>
    )
}
