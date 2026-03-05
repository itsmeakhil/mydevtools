"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CodeEditor from "@/components/ui/code-editor"
import { ApiResponse } from "./types"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResponsePanelProps {
    response: ApiResponse | null
}

export function ResponsePanel({ response }: ResponsePanelProps) {
    if (!response) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground border rounded-md min-h-0 bg-muted/10">
                Enter a URL and click Send to get a response
            </div>
        )
    }

    const isSuccess = response.status >= 200 && response.status < 300
    const isError = response.status >= 400

    const contentType = Object.entries(response.headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] || ""

    const getLanguage = () => {
        if (contentType.includes("json")) return "json"
        if (contentType.includes("html")) return "html"
        if (contentType.includes("xml")) return "xml"
        return "text"
    }

    const renderPreview = () => {
        if (response.isBase64) {
            if (contentType.includes("image/")) {
                return (
                    <div className="flex items-center justify-center p-8 bg-muted/20 absolute inset-0 overflow-auto">
                        <img src={`data:${contentType};base64,${response.body}`} alt="Response preview" className="max-w-full shadow-sm border" />
                    </div>
                )
            }
            if (contentType.includes("application/pdf")) {
                return (
                    <iframe src={`data:application/pdf;base64,${response.body}`} className="w-full h-full border-0 absolute inset-0" />
                )
            }
        } else if (contentType.includes("text/html")) {
            return (
                <iframe srcDoc={response.body} className="w-full h-full border-0 absolute inset-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
            )
        }

        return (
            <div className="flex items-center justify-center p-8 absolute inset-0 text-muted-foreground">
                Preview not available for this content type
            </div>
        )
    }

    const hasPreview = response.isBase64 || contentType.includes("text/html")

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="flex items-center gap-4 p-4 border rounded-md bg-card shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    <Badge variant={isSuccess ? "default" : isError ? "destructive" : "secondary"}>
                        {response.status} {response.statusText}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Time:</span>
                    <span className="text-sm font-mono">{response.time}ms</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Size:</span>
                    <span className="text-sm font-mono">{(response.size / 1024).toFixed(2)} KB</span>
                </div>
            </div>

            <Tabs defaultValue={hasPreview ? "preview" : "body"} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start shrink-0">
                    <TabsTrigger value="body">Body</TabsTrigger>
                    {hasPreview && <TabsTrigger value="preview">Preview</TabsTrigger>}
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                </TabsList>
                <div className="mt-4 border rounded-md overflow-hidden flex-1 min-h-0 relative">
                    <TabsContent value="body" className="mt-0 h-full absolute inset-0">
                        <CodeEditor
                            value={response.isBase64 ? "Binary data cannot be displayed in raw view." : response.body}
                            language={getLanguage()}
                            readOnly
                        />
                    </TabsContent>
                    {hasPreview && (
                        <TabsContent value="preview" className="mt-0 h-full absolute inset-0">
                            {renderPreview()}
                        </TabsContent>
                    )}
                    <TabsContent value="headers" className="mt-0 h-full absolute inset-0">
                        <ScrollArea className="h-full p-4">
                            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                                {Object.entries(response.headers).map(([key, value]) => (
                                    <React.Fragment key={key}>
                                        <div className="font-medium text-muted-foreground">{key}:</div>
                                        <div className="font-mono break-all">{value}</div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
