"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, MessageSquare } from "lucide-react"
import type { RequestComment } from "./types"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/database/firebase"

/** Pulled out so the lint rule for impure render-time calls doesn't flag the inline use. */
const nowMs = (): number => Date.now()

interface CommentsPanelProps {
    comments?: RequestComment[]
    onChange: (next: RequestComment[]) => void
}

export function CommentsPanel({ comments, onChange }: CommentsPanelProps) {
    const [user] = useAuthState(auth)
    const [draft, setDraft] = React.useState("")
    const list = comments ?? []

    const myName = user?.displayName ?? user?.email ?? "Anonymous"

    const handlePost = () => {
        const text = draft.trim()
        if (!text) return
        const next: RequestComment = {
            id: crypto.randomUUID(),
            author: myName,
            createdAt: nowMs(),
            text,
        }
        onChange([...list, next])
        setDraft("")
    }

    const handleDelete = (id: string) => {
        onChange(list.filter((c) => c.id !== id))
    }

    return (
        <div className="h-full flex flex-col min-h-0 gap-2">
            <ScrollArea className="flex-1 min-h-0">
                {list.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground py-12 gap-2">
                        <MessageSquare className="h-6 w-6 opacity-40" />
                        No comments yet. Leave context for teammates loading this request later.
                    </div>
                ) : (
                    <div className="p-1 space-y-2">
                        {list
                            .slice()
                            .sort((a, b) => a.createdAt - b.createdAt)
                            .map((c) => (
                                <div key={c.id} className="border rounded-lg p-3 bg-card space-y-1">
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="font-bold text-foreground">{c.author}</span>
                                        <span>·</span>
                                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 ml-auto"
                                            onClick={() => handleDelete(c.id)}
                                            title="Delete comment"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap break-words">{c.text}</div>
                                </div>
                            ))}
                    </div>
                )}
            </ScrollArea>
            <div className="border rounded-lg p-2 space-y-2 bg-card">
                <Textarea
                    placeholder={`Write as ${myName}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault()
                            handlePost()
                        }
                    }}
                    className="text-sm min-h-[60px]"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>⌘/Ctrl + Enter to post</span>
                    <Button size="sm" onClick={handlePost} disabled={!draft.trim()}>
                        Post
                    </Button>
                </div>
            </div>
        </div>
    )
}
