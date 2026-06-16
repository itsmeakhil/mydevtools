"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconCode, IconCopy, IconCheck } from "@tabler/icons-react"
import { ApiRequestState } from "./types"
import { generateCode, CodeLanguage } from "./generate-code"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface CodeGeneratorProps {
    request: ApiRequestState
}

export function CodeGenerator({ request }: CodeGeneratorProps) {
    const t = useTranslations("ApiClient.codeGenerator")
    const tApi = useTranslations("ApiClient")
    const [language, setLanguage] = React.useState<CodeLanguage>("curl")
    const [code, setCode] = React.useState("")
    const [copied, setCopied] = React.useState(false)

    React.useEffect(() => {
        try {
            const generated = generateCode(request, language)
            setCode(generated)
        } catch (e) {
            console.error("Failed to generate code", e)
            setCode(t("errorGenerating"))
        }
    }, [request, language, t])

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        toast.success(tApi("toasts.codeCopied"))
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title={t("triggerTitle")}>
                    <IconCode className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t("dialogTitle")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Select value={language} onValueChange={(val) => setLanguage(val as CodeLanguage)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="curl">{t("languageCurl")}</SelectItem>
                                <SelectItem value="javascript">{t("languageJavaScript")}</SelectItem>
                                <SelectItem value="typescript">TypeScript</SelectItem>
                                <SelectItem value="python">{t("languagePython")}</SelectItem>
                                <SelectItem value="go">{t("languageGo")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={handleCopy}>
                            {copied ? <IconCheck className="h-4 w-4 mr-2" /> : <IconCopy className="h-4 w-4 mr-2" />}
                            {t("copy")}
                        </Button>
                    </div>
                    <div className="relative border rounded-md bg-muted/50 font-mono text-xs">
                        <ScrollArea className="h-[300px] w-full p-4">
                            <pre className="whitespace-pre-wrap break-all">
                                {code}
                            </pre>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
