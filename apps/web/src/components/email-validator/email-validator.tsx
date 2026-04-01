"use client";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolWrapper } from "@/components/tools/tool-wrapper";
import {
    IconCheck,
    IconX,
    IconAlertCircle,
    IconLoader2,
    IconUpload,
    IconDownload,
    IconCircleCheck,
    IconCircleX,
    IconCopy,
    IconSearch,
    IconChevronDown,
    IconFileSpreadsheet,
    IconFileTypeCsv
} from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useTranslations } from "next-intl";

interface EmailValidation {
    email: string;
    validations: {
        syntax: boolean;
        domain_exists: boolean;
        mx_records: boolean;
        mailbox_exists: boolean;
        is_disposable: boolean;
        is_role_based: boolean;
    };
    score: number;
    status: string;
}

interface BulkResult {
    email: string;
    status: string;
    score: number;
    validations: {
        syntax: boolean;
        domain_exists: boolean;
        mx_records: boolean;
        mailbox_exists: boolean;
        is_disposable: boolean;
        is_role_based: boolean;
    };
}

export function EmailValidator() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<EmailValidation | null>(null);
    const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalBatches, setTotalBatches] = useState(0);
    const [activeTab, setActiveTab] = useState("single");
    const [searchQuery, setSearchQuery] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { copyToClipboard, isCopied } = useCopyToClipboard();
    const t = useTranslations("EmailValidator");

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = useMemo(() => {
        if (!email) return null;
        return emailRegex.test(email);
    }, [email]);

    // Stats for Bulk Validation
    const bulkStats = useMemo(() => {
        const valid = bulkResults.filter(r => r.status === "VALID").length;
        const risky = bulkResults.filter(r => r.status === "DISPOSABLE" || r.status === "CATCH_ALL").length;
        return {
            total: bulkResults.length,
            valid,
            risky,
            invalid: bulkResults.length - valid - risky,
        };
    }, [bulkResults]);

    // Filter bulk results based on search query
    const filteredBulkResults = useMemo(() => {
        if (!searchQuery) return bulkResults;
        const query = searchQuery.toLowerCase();
        return bulkResults.filter(r =>
            r.email.toLowerCase().includes(query) ||
            r.status.toLowerCase().includes(query)
        );
    }, [bulkResults, searchQuery]);

    const handleClear = () => {
        setEmail("");
        setResult(null);
        setSearchQuery("");
    };

    const handleValidate = async () => {
        if (!email) {
            toast({
                title: t("toasts.errorTitle"),
                description: t("toasts.enterEmail"),
                variant: "destructive",
            });
            return;
        }

        if (!isValidFormat) {
            toast({
                title: t("toasts.invalidFormatTitle"),
                description: t("toasts.invalidFormatDescription"),
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        setResult(null);
        setActiveTab("single");

        try {
            const response = await fetch(
                `/api/validate-email?email=${encodeURIComponent(email)}`,
                { headers: { accept: "application/json" } }
            );

            if (!response.ok) throw new Error("Failed to validate email");

            const data = await response.json();
            setResult(data);
        } catch (error) {
            toast({
                title: t("toasts.errorTitle"),
                description: t("toasts.validateFailedDescription"),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const processFile = (file: File) => {
        setUploadedFileName(file.name);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const content = evt.target?.result;
                let data: any[] = [];

                const fileExtension = file.name.split('.').pop()?.toLowerCase();

                if (fileExtension === 'csv') {
                    // Parse CSV file
                    const csvText = content as string;
                    const lines = csvText.split(/\r?\n/).filter(line => line.trim());

                    if (lines.length === 0) {
                        throw new Error('Empty CSV file');
                    }

                    // Get headers from first line
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
                    const emailColumnIndex = headers.findIndex(h =>
                        h.toLowerCase() === 'email' || h.toLowerCase() === 'emails'
                    );

                    if (emailColumnIndex === -1) {
                        // If no email header, treat each line as an email (single column CSV or plain list)
                        data = lines.slice(headers.some(h => h.includes('@')) ? 0 : 1).map(line => {
                            const value = line.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
                            return { email: value };
                        });
                    } else {
                        // Parse rows using the email column
                        data = lines.slice(1).map(line => {
                            const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
                            return { email: values[emailColumnIndex] };
                        });
                    }
                } else {
                    // Parse Excel file (xlsx, xls)
                    const wb = XLSX.read(content, { type: "binary" });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    data = XLSX.utils.sheet_to_json(ws) as any[];
                }

                const allEmails = data
                    .map((row) => row.email || row.Email || row.EMAIL)
                    .filter((email) => email && typeof email === "string" && email.includes('@'));

                const totalEmails = allEmails.length;
                const emails = allEmails.slice(0, 4000);

                if (emails.length === 0) {
                    toast({
                        title: t("toasts.noEmailsTitle"),
                        description: t("toasts.noEmailsDescription"),
                        variant: "destructive",
                    });
                    setUploadedFileName(null);
                    return;
                }

                if (totalEmails > 4000) {
                    toast({
                        title: t("toasts.fileTooLargeTitle"),
                        description: t("toasts.fileTooLargeDescription", { total: totalEmails }),
                        variant: "destructive",
                    });
                }

                setBulkLoading(true);
                setBulkResults([]);
                setActiveTab("bulk");
                setResult(null);
                setProgress(0);
                setTotalBatches(0);
                setSearchQuery("");

                const batchSize = 500;
                const batches = Math.ceil(emails.length / batchSize);
                setTotalBatches(batches);
                let allResults: BulkResult[] = [];

                for (let i = 0; i < batches; i++) {
                    const batch = emails.slice(i * batchSize, (i + 1) * batchSize);
                    const response = await fetch("/api/validate-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emails: batch }),
                    });

                    if (!response.ok) throw new Error(`Failed to validate batch ${i + 1}`);

                    const data = await response.json();
                    allResults = [...allResults, ...data.results];
                    setBulkResults([...allResults]);
                    setProgress(Math.round(((i + 1) / batches) * 100));
                }

                toast({
                    title: t("toasts.successTitle"),
                    description: t("toasts.successValidated", { count: emails.length }),
                });
            } catch (error) {
                console.error("Bulk validation error:", error);
                toast({
                    title: t("toasts.batchFailedTitle"),
                    description: t("toasts.batchFailedDescription"),
                    variant: "destructive",
                });
            } finally {
                setBulkLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const exportToExcel = (validOnly: boolean = false) => {
        const dataToExport = validOnly
            ? bulkResults.filter(r => r.status === "VALID")
            : bulkResults;

        if (dataToExport.length === 0) {
            toast({
                title: t("toasts.noExportTitle"),
                description: validOnly ? t("toasts.noExportValidOnly") : t("toasts.noExportAll"),
                variant: "destructive",
            });
            return;
        }

        const col = (key: "email" | "status" | "score" | "syntax" | "domain" | "mx" | "mailbox" | "disposable" | "roleBased") =>
            t(`exportColumns.${key}`);

        const sheetData = validOnly
            ? dataToExport.map((r) => ({ [col("email")]: r.email }))
            : dataToExport.map((r) => ({
                [col("email")]: r.email,
                [col("status")]: r.status,
                [col("score")]: r.score,
                [col("syntax")]: r.validations.syntax ? t("exportColumns.valid") : t("exportColumns.invalid"),
                [col("domain")]: r.validations.domain_exists ? t("exportColumns.yes") : t("exportColumns.no"),
                [col("mx")]: r.validations.mx_records ? t("exportColumns.yes") : t("exportColumns.no"),
                [col("mailbox")]: r.validations.mailbox_exists ? t("exportColumns.yes") : t("exportColumns.no"),
                [col("disposable")]: r.validations.is_disposable ? t("exportColumns.yes") : t("exportColumns.no"),
                [col("roleBased")]: r.validations.is_role_based ? t("exportColumns.yes") : t("exportColumns.no"),
            }));

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, validOnly ? t("sheets.validEmails") : t("sheets.results"));
        XLSX.writeFile(wb, validOnly ? "valid_emails.xlsx" : "email_validation_results.xlsx");

        toast({
            title: t("toasts.exportSuccessTitle"),
            description: validOnly
                ? t("toasts.exportSuccessExcelValid", { count: dataToExport.length })
                : t("toasts.exportSuccessExcelAll", { count: dataToExport.length }),
        });
    };

    const exportToCsv = (validOnly: boolean = false) => {
        const dataToExport = validOnly
            ? bulkResults.filter(r => r.status === "VALID")
            : bulkResults;

        if (dataToExport.length === 0) {
            toast({
                title: t("toasts.noExportTitle"),
                description: validOnly ? t("toasts.noExportValidOnly") : t("toasts.noExportAll"),
                variant: "destructive",
            });
            return;
        }

        // Create CSV content
        let csvRows: string[];
        if (validOnly) {
            csvRows = [
                t("exportColumns.email"),
                ...dataToExport.map(r => `"${r.email}"`)
            ];
        } else {
            const headers = [
                t("exportColumns.email"),
                t("exportColumns.status"),
                t("exportColumns.score"),
                t("exportColumns.syntax"),
                t("exportColumns.domain"),
                t("exportColumns.mx"),
                t("exportColumns.mailbox"),
                t("exportColumns.disposable"),
                t("exportColumns.roleBased"),
            ];
            csvRows = [
                headers.join(","),
                ...dataToExport.map(r => [
                    `"${r.email}"`,
                    r.status,
                    r.score,
                    r.validations.syntax ? t("exportColumns.valid") : t("exportColumns.invalid"),
                    r.validations.domain_exists ? t("exportColumns.yes") : t("exportColumns.no"),
                    r.validations.mx_records ? t("exportColumns.yes") : t("exportColumns.no"),
                    r.validations.mailbox_exists ? t("exportColumns.yes") : t("exportColumns.no"),
                    r.validations.is_disposable ? t("exportColumns.yes") : t("exportColumns.no"),
                    r.validations.is_role_based ? t("exportColumns.yes") : t("exportColumns.no"),
                ].join(","))
            ];
        }

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = validOnly ? "valid_emails.csv" : "email_validation_results.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: t("toasts.exportSuccessTitle"),
            description: validOnly
                ? t("toasts.exportSuccessCsvValid", { count: dataToExport.length })
                : t("toasts.exportSuccessCsvAll", { count: dataToExport.length }),
        });
    };

    const downloadTemplate = () => {
        const data = [{ email: "john.doe@example.com" }, { email: "support@mydevtools.tech" }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t("sheets.template"));
        XLSX.writeFile(wb, "email_validation_template.xlsx");
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "VALID": return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
            case "DISPOSABLE": return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
            case "INVALID": return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
            default: return "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20";
        }
    };

    const ValidationItem = ({ label, value, isWarning = false, warningCondition = false, tooltip }: any) => {
        const isActuallyWarning = isWarning && warningCondition;
        const content = (
            <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${isActuallyWarning
                ? "bg-yellow-500/5 border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
                : "bg-card border-border/50 hover:border-border"
                }`}>
                <span className="text-sm font-medium opacity-90">{label}</span>
                {value ? (
                    <IconCircleCheck className={`h-5 w-5 ${isActuallyWarning ? "text-yellow-500" : "text-green-500"}`} stroke={2} />
                ) : (
                    <IconCircleX className="h-5 w-5 text-red-500" stroke={2} />
                )}
            </div>
        );

        if (tooltip) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {content}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-xs">{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return content;
    };

    return (
        <ToolWrapper toolId="email-validator" maxWidth="5xl">
            <ToolHeader
                title={t("header.title")}
                description={t("header.description")}
                toolId="email-validator"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2 p-1">
                        <TabsTrigger value="single">{t("tabs.single")}</TabsTrigger>
                        <TabsTrigger value="bulk">{t("tabs.bulk")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="single" className="space-y-6 focus-visible:outline-none">
                    <Card className="border-border/40 bg-background/50 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-center">{t("single.cardTitle")}</CardTitle>
                            <CardDescription className="text-center">{t("single.cardDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 max-w-xl mx-auto">
                                <div className="relative flex-1">
                                    <Input
                                        type="email"
                                        placeholder={t("single.placeholder")}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                                        className={`h-11 pr-10 ${isValidFormat === false ? "border-red-500 focus-visible:ring-red-500" : isValidFormat === true ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                                        autoFocus
                                    />
                                    {email && (
                                        <button
                                            onClick={handleClear}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
                                            aria-label={t("single.clearAria")}
                                        >
                                            <IconX className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                                <Button onClick={handleValidate} disabled={loading || !email || isValidFormat === false} className="h-11 px-6">
                                    {loading ? <IconLoader2 className="h-4 w-4 animate-spin mr-2" /> : <IconCheck className="h-4 w-4 mr-2" />}
                                    {loading ? t("single.validating") : t("single.validate")}
                                </Button>
                            </div>
                            {isValidFormat === false && (
                                <p className="text-sm text-red-500 mt-2 text-center">{t("single.formatError")}</p>
                            )}
                        </CardContent>
                    </Card>

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {result.validations.is_disposable && (
                                <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                                    <IconAlertCircle className="h-5 w-5 !text-yellow-600 dark:!text-yellow-400" />
                                    <AlertTitle className="font-semibold flex items-center gap-2 text-base">
                                        {t("disposableAlert.title")}
                                    </AlertTitle>
                                    <AlertDescription className="opacity-90">
                                        {t("disposableAlert.description")}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-6 md:grid-cols-12">
                                <Card className="col-span-12 md:col-span-4 border-border/40 bg-background/50 backdrop-blur-sm h-full shadow-sm flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-base font-medium text-center text-muted-foreground">{t("score.reliabilityTitle")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center flex-1 pb-8">
                                        <div className="relative flex items-center justify-center">
                                            {/* Simple SVG Circular Progress */}
                                            <svg className="h-40 w-40 transform -rotate-90">
                                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted/20" />
                                                <circle
                                                    cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                                                    strokeDasharray={440}
                                                    strokeDashoffset={440 - (440 * result.score) / 100}
                                                    className={`transition-all duration-1000 ease-out ${result.score > 80 ? 'text-green-500' : result.score > 50 ? 'text-yellow-500' : 'text-red-500'}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-bold tracking-tighter">{result.score}</span>
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">{t("score.scoreLabel")}</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex flex-col items-center gap-2">
                                            <Badge variant="outline" className={`px-4 py-1 text-sm font-medium ${getStatusColor(result.status)}`}>
                                                {result.status}
                                            </Badge>
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">{result.email}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => copyToClipboard(result.email, t("copy.emailCopied"))}
                                                            >
                                                                <IconCopy className={`h-3.5 w-3.5 ${isCopied ? "text-green-500" : ""}`} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t("copy.copyTooltip")}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="col-span-12 md:col-span-8 border-border/40 bg-background/50 backdrop-blur-sm shadow-sm h-full">
                                    <CardHeader>
                                        <CardTitle className="text-base font-medium">{t("details.sectionTitle")}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <ValidationItem
                                                label={t("validation.syntaxLabel")}
                                                value={result.validations.syntax}
                                                tooltip={t("validation.syntaxTooltip")}
                                            />
                                            <ValidationItem
                                                label={t("validation.domainLabel")}
                                                value={result.validations.domain_exists}
                                                tooltip={t("validation.domainTooltip")}
                                            />
                                            <ValidationItem
                                                label={t("validation.mxLabel")}
                                                value={result.validations.mx_records}
                                                tooltip={t("validation.mxTooltip")}
                                            />
                                            <ValidationItem
                                                label={t("validation.mailboxLabel")}
                                                value={result.validations.mailbox_exists}
                                                tooltip={t("validation.mailboxTooltip")}
                                            />
                                            <ValidationItem
                                                label={t("validation.disposableLabel")}
                                                value={result.validations.is_disposable}
                                                isWarning
                                                warningCondition={result.validations.is_disposable}
                                                tooltip={t("validation.disposableTooltip")}
                                            />
                                            <ValidationItem
                                                label={t("validation.roleBasedLabel")}
                                                value={result.validations.is_role_based}
                                                isWarning
                                                warningCondition={result.validations.is_role_based}
                                                tooltip={t("validation.roleBasedTooltip")}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </TabsContent>

                <TabsContent value="bulk" className="space-y-6 focus-visible:outline-none">
                    {!bulkLoading && bulkResults.length === 0 && (
                        <Card className={`border-dashed border-2 transition-all ${dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "bg-muted/20 hover:bg-muted/40"}`}>
                            <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center cursor-pointer"
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                onDragLeave={onDragLeave}
                            >
                                <div className={`bg-background p-4 rounded-full shadow-sm mb-4 transition-transform ${dragActive ? "scale-110" : ""}`}>
                                    <IconUpload className={`h-8 w-8 text-primary transition-transform ${dragActive ? "animate-bounce" : ""}`} />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">
                                    {dragActive ? t("bulk.dropHere") : t("bulk.dragHere")}
                                </h3>
                                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                                    {t("bulk.uploadHint")}
                                </p>
                                {uploadedFileName && (
                                    <div className="mb-4 px-4 py-2 bg-muted rounded-md text-sm">
                                        <span className="text-muted-foreground">{t("bulk.filePrefix")} </span>
                                        <span className="font-medium">{uploadedFileName}</span>
                                    </div>
                                )}
                                <div className="flex gap-3 flex-wrap justify-center">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        {t("bulk.selectFile")}
                                    </Button>
                                    <Button variant="outline" onClick={downloadTemplate}>
                                        <IconDownload className="mr-2 h-4 w-4" /> {t("bulk.downloadTemplate")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {bulkLoading && (
                        <Card className="border-border/40 bg-background/50 backdrop-blur-sm p-8 text-center">
                            <div className="max-w-md mx-auto space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                                        <IconLoader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{t("bulkLoading.title")}</h3>
                                    <p className="text-muted-foreground text-sm">{t("bulkLoading.batchProgress", { current: Math.ceil((progress / 100) * totalBatches) || 1, total: totalBatches || 1 })}</p>
                                </div>
                                <Progress value={progress} className="h-2 w-full" />
                            </div>
                        </Card>
                    )}

                    {bulkResults.length > 0 && !bulkLoading && (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card className="bg-background/50 border-border/40 p-4 flex flex-col justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">{t("stats.totalProcessed")}</span>
                                    <span className="text-2xl font-bold">{bulkStats.total}</span>
                                </Card>
                                <Card className="bg-green-500/10 border-green-500/20 p-4 flex flex-col justify-between">
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{t("stats.valid")}</span>
                                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">{bulkStats.valid}</span>
                                </Card>
                                <Card className="bg-yellow-500/10 border-yellow-500/20 p-4 flex flex-col justify-between">
                                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{t("stats.risky")}</span>
                                    <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{bulkStats.risky}</span>
                                </Card>
                                <Card className="bg-red-500/10 border-red-500/20 p-4 flex flex-col justify-between">
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">{t("stats.invalid")}</span>
                                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">{bulkStats.invalid}</span>
                                </Card>
                            </div>

                            <Card className="border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
                                <div className="p-4 border-b border-border/40 bg-muted/20">
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        <h3 className="font-medium">{t("results.detailedTitle")}</h3>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:flex-initial sm:w-64">
                                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder={t("results.searchPlaceholder")}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9 h-9"
                                                />
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setBulkResults([]);
                                                setSearchQuery("");
                                                setUploadedFileName(null);
                                                setActiveTab("single");
                                            }}>
                                                {t("results.newVerification")}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm">
                                                        <IconDownload className="mr-2 h-4 w-4" /> {t("results.exportAll")}
                                                        <IconChevronDown className="ml-2 h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => exportToExcel(false)}>
                                                        <IconFileSpreadsheet className="mr-2 h-4 w-4" /> {t("results.exportExcel")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => exportToCsv(false)}>
                                                        <IconFileTypeCsv className="mr-2 h-4 w-4" /> {t("results.exportCsv")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline" disabled={bulkStats.valid === 0}>
                                                        <IconCircleCheck className="mr-2 h-4 w-4 text-green-500" /> {t("results.exportValid", { count: bulkStats.valid })}
                                                        <IconChevronDown className="ml-2 h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => exportToExcel(true)}>
                                                        <IconFileSpreadsheet className="mr-2 h-4 w-4" /> {t("results.exportExcel")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => exportToCsv(true)}>
                                                        <IconFileTypeCsv className="mr-2 h-4 w-4" /> {t("results.exportCsv")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    {searchQuery && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {t("showingResults", { shown: filteredBulkResults.length, total: bulkResults.length })}
                                        </p>
                                    )}
                                </div>
                                <div className="max-h-[500px] overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>{t("table.email")}</TableHead>
                                                <TableHead>{t("table.status")}</TableHead>
                                                <TableHead className="text-center">{t("table.score")}</TableHead>
                                                <TableHead className="text-center">{t("table.checks")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBulkResults.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                        {t("noSearchResults", { query: searchQuery })}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredBulkResults.map((r, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">{r.email}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`capitalize ${getStatusColor(r.status)}`}>
                                                                {r.status.toLowerCase().replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`font-mono font-bold ${r.score > 80 ? "text-green-500" : r.score > 50 ? "text-yellow-500" : "text-red-500"}`}>
                                                                {r.score}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex justify-center gap-1.5 cursor-help">
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.syntax ? "bg-green-500" : "bg-red-500"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.domain_exists ? "bg-green-500" : "bg-red-500"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.mx_records ? "bg-green-500" : "bg-red-500"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.mailbox_exists ? "bg-green-500" : "bg-red-500"}`} />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="text-xs space-y-1">
                                                                            <div>{t("checksTooltip.syntax")}: {r.validations.syntax ? "✓" : "✗"}</div>
                                                                            <div>{t("checksTooltip.domain")}: {r.validations.domain_exists ? "✓" : "✗"}</div>
                                                                            <div>{t("checksTooltip.mx")}: {r.validations.mx_records ? "✓" : "✗"}</div>
                                                                            <div>{t("checksTooltip.mailbox")}: {r.validations.mailbox_exists ? "✓" : "✗"}</div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </ToolWrapper>
    );
}
