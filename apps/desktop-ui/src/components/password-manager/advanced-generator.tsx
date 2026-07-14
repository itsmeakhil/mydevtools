"use client"

import { useState, useEffect, useCallback } from "react"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, RefreshCw, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { calculatePasswordStrength, getStrengthColor } from "@/lib/password-utils"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WORDLIST } from "@/lib/wordlists"
import { useTranslations } from "next-intl"

interface AdvancedGeneratorProps {
    onPasswordChange?: (password: string) => void
    initialLength?: number
    className?: string
    showInput?: boolean
}

export function AdvancedGenerator({ onPasswordChange, initialLength = 16, className, showInput = true }: AdvancedGeneratorProps) {
    const t = useTranslations("PasswordManager.generator")
    const tForm = useTranslations("PasswordManager.form")
    const [mode, setMode] = useState<"password" | "passphrase">("password")
    const [length, setLength] = useState(initialLength)
    const [password, setPassword] = useState("")
    const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

    // Password Options
    const [options, setOptions] = useState({
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false,
    })

    // Passphrase Options
    const [passphraseOptions, setPassphraseOptions] = useState({
        wordCount: 4,
        separator: "-",
        capitalize: "first", // none, first, all
        includeNumber: false
    })

    const generatePassword = useCallback(() => {
        if (mode === "password") {
            const chars = {
                lowercase: "abcdefghijklmnopqrstuvwxyz",
                uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                numbers: "0123456789",
                symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
                similar: "il1Lo0O",
                ambiguous: "{}[]()/\\'\"~,;.<>",
            }

            let availableChars = ""

            if (options.lowercase) availableChars += chars.lowercase
            if (options.uppercase) availableChars += chars.uppercase
            if (options.numbers) availableChars += chars.numbers
            if (options.symbols) availableChars += chars.symbols

            if (options.excludeSimilar) {
                availableChars = availableChars.split("").filter((c) => !chars.similar.includes(c)).join("")
            }
            if (options.excludeAmbiguous) {
                availableChars = availableChars.split("").filter((c) => !chars.ambiguous.includes(c)).join("")
            }

            if (!availableChars) {
                setPassword("")
                onPasswordChange?.("")
                return
            }

            let newPassword = ""
            const array = new Uint8Array(length)
            crypto.getRandomValues(array)

            for (let i = 0; i < length; i++) {
                newPassword += availableChars[array[i] % availableChars.length]
            }

            setPassword(newPassword)
            onPasswordChange?.(newPassword)
        } else {
            // Passphrase Generation
            const words: string[] = []
            const array = new Uint32Array(passphraseOptions.wordCount)
            crypto.getRandomValues(array)

            for (let i = 0; i < passphraseOptions.wordCount; i++) {
                words.push(WORDLIST[array[i] % WORDLIST.length])
            }

            let finalWords = words.map(word => {
                if (passphraseOptions.capitalize === "first") {
                    return word.charAt(0).toUpperCase() + word.slice(1)
                } else if (passphraseOptions.capitalize === "all") {
                    return word.toUpperCase()
                }
                return word
            })

            if (passphraseOptions.includeNumber) {
                const randomNum = Math.floor(Math.random() * 1000)
                finalWords.push(randomNum.toString())
            }

            const newPassphrase = finalWords.join(passphraseOptions.separator)
            setPassword(newPassphrase)
            onPasswordChange?.(newPassphrase)
        }
    }, [length, options, mode, passphraseOptions, onPasswordChange])

    useEffect(() => {
        generatePassword()
    }, [generatePassword])

    const handleCopy = () => {
        void copyToClipboard(password, { silent: true })
    }

    const strengthScore = calculatePasswordStrength(password)

    const strengthLabel =
        strengthScore === 0
            ? ""
            : strengthScore <= 2
              ? tForm("strengthWeak")
              : strengthScore <= 3
                ? tForm("strengthMedium")
                : tForm("strengthStrong")

    return (
        <div className={cn("space-y-4", className)}>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "password" | "passphrase")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="password">{t("tabPassword")}</TabsTrigger>
                    <TabsTrigger value="passphrase">{t("tabPassphrase")}</TabsTrigger>
                </TabsList>

                {showInput && (
                    <div className="space-y-2 mb-4">
                        <div className="flex gap-2">
                            <Input
                                value={password}
                                readOnly
                                className="text-center text-sm font-mono font-semibold h-9"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button size="icon" onClick={handleCopy} variant="outline" className="h-9 w-9 shrink-0">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" onClick={generatePassword} variant="outline" className="h-9 w-9 shrink-0">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{t("strength")}</span>
                                <Badge variant={strengthScore < 3 ? "destructive" : strengthScore < 4 ? "secondary" : "default"} className="text-xs h-5">
                                    {strengthLabel}
                                </Badge>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className={cn("h-1.5 rounded-full transition-all duration-300", getStrengthColor(strengthScore))}
                                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <TabsContent value="password" className="space-y-4 mt-0">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="length" className="text-xs">
                                {t("lengthLabel", { length })}
                            </Label>
                            <Badge variant="secondary" className="text-xs h-5">
                                {t("lengthBadge", { length })}
                            </Badge>
                        </div>
                        <Slider id="length" min={4} max={64} step={1} value={[length]} onValueChange={(value) => setLength(value[0])} />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">{t("characterSets")}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                                { id: "uppercase", labelKey: "uppercase" as const, sample: "ABC" },
                                { id: "lowercase", labelKey: "lowercase" as const, sample: "abc" },
                                { id: "numbers", labelKey: "numbers" as const, sample: "123" },
                                { id: "symbols", labelKey: "symbols" as const, sample: "!@#" },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-primary/10 rounded-md">
                                            <span className="text-xs font-bold">{item.sample}</span>
                                        </div>
                                        <Label htmlFor={item.id} className="cursor-pointer text-xs">
                                            {t(item.labelKey)}
                                        </Label>
                                    </div>
                                    <Switch
                                        id={item.id}
                                        checked={options[item.id as keyof typeof options]}
                                        onCheckedChange={(checked) => setOptions({ ...options, [item.id]: checked })}
                                        className="scale-75 origin-right"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="passphrase" className="space-y-4 mt-0">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="wordCount" className="text-xs">
                                {t("wordCountLabel", { count: passphraseOptions.wordCount })}
                            </Label>
                            <Badge variant="secondary" className="text-xs h-5">
                                {t("wordCountBadge", { count: passphraseOptions.wordCount })}
                            </Badge>
                        </div>
                        <Slider
                            id="wordCount"
                            min={3}
                            max={10}
                            step={1}
                            value={[passphraseOptions.wordCount]}
                            onValueChange={(value) => setPassphraseOptions({ ...passphraseOptions, wordCount: value[0] })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">{t("separator")}</Label>
                            <div className="flex flex-wrap gap-2">
                                {["-", "_", ".", " "].map((sep) => (
                                    <Button
                                        key={sep === " " ? "space" : sep}
                                        variant={passphraseOptions.separator === sep ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setPassphraseOptions({ ...passphraseOptions, separator: sep })}
                                    >
                                        {sep === " " ? "␣" : sep}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">{t("capitalization")}</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={passphraseOptions.capitalize === "none" ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setPassphraseOptions({ ...passphraseOptions, capitalize: "none" })}
                                >
                                    abc
                                </Button>
                                <Button
                                    variant={passphraseOptions.capitalize === "first" ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setPassphraseOptions({ ...passphraseOptions, capitalize: "first" })}
                                >
                                    Abc
                                </Button>
                                <Button
                                    variant={passphraseOptions.capitalize === "all" ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setPassphraseOptions({ ...passphraseOptions, capitalize: "all" })}
                                >
                                    ABC
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border">
                        <Label htmlFor="includeNumber" className="cursor-pointer text-xs">
                            {t("includeNumber")}
                        </Label>
                        <Switch
                            id="includeNumber"
                            checked={passphraseOptions.includeNumber}
                            onCheckedChange={(checked) => setPassphraseOptions({ ...passphraseOptions, includeNumber: checked })}
                            className="scale-75 origin-right"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
