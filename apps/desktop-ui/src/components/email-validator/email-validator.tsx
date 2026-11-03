"use client";

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolShell } from "@/components/tools/tool-shell";
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
    IconFileTypeCsv,
    IconMailCheck
} from "@tabler/icons-react";
import { toast } from "sonner";
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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useTranslations } from "next-intl";
import { validateEmail, validateEmails, type EmailValidationResult } from "@/lib/email-validator";
import { downloadFile } from "@/lib/desktop/save-file";
import { downloadWorkbook } from "@/lib/csv-excel-json-utils";

type EmailValidation = EmailValidationResult;
type BulkResult = EmailValidationResult;

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
        const risky = bulkResults.filter(r => r.status === "DISPOSABLE").length;
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
            toast.error(t("toasts.errorTitle"), { description: t("toasts.enterEmail") });
            return;
        }

        if (!isValidFormat) {
            toast.error(t("toasts.invalidFormatTitle"), { description: t("toasts.invalidFormatDescription") });
            return;
        }

        setLoading(true);
        setResult(null);
        setActiveTab("single");

        try {
            const data = await validateEmail(email);
            setResult(data);
        } catch {
            toast.error(t("toasts.errorTitle"), { description: t("toasts.validateFailedDescription") });
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
                    const XLSX = await import("xlsx");
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
                    toast.error(t("toasts.noEmailsTitle"), { description: t("toasts.noEmailsDescription") });
                    setUploadedFileName(null);
                    return;
                }

                if (totalEmails > 4000) {
                    toast.error(t("toasts.fileTooLargeTitle"), { description: t("toasts.fileTooLargeDescription", { total: totalEmails }) });
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

                const results = await validateEmails(emails, new Map(), (done, total) => {
                    setProgress(Math.round((done / total) * 100));
                });
                setBulkResults(results);

                toast.success(t("toasts.successTitle"), { description: t("toasts.successValidated", { count: emails.length }) });
            } catch (error) {
                console.error("Bulk validation error:", error);
                toast.error(t("toasts.batchFailedTitle"), { description: t("toasts.batchFailedDescription") });
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

    const exportToExcel = async (validOnly: boolean = false) => {
        const dataToExport = validOnly
            ? bulkResults.filter(r => r.status === "VALID")
            : bulkResults;

        if (dataToExport.length === 0) {
            toast.error(t("toasts.noExportTitle"), { description: validOnly ? t("toasts.noExportValidOnly") : t("toasts.noExportAll") });
            return;
        }

        const XLSX = await import("xlsx");

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
        await downloadWorkbook(wb, validOnly ? "valid_emails.xlsx" : "email_validation_results.xlsx");

        toast.success(t("toasts.exportSuccessTitle"), {
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
            toast.error(t("toasts.noExportTitle"), { description: validOnly ? t("toasts.noExportValidOnly") : t("toasts.noExportAll") });
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
        downloadFile(blob, validOnly ? "valid_emails.csv" : "email_validation_results.csv");

        toast.success(t("toasts.exportSuccessTitle"), {
            description: validOnly
                ? t("toasts.exportSuccessCsvValid", { count: dataToExport.length })
                : t("toasts.exportSuccessCsvAll", { count: dataToExport.length }),
        });
    };

    const downloadTemplate = async () => {
        const XLSX = await import("xlsx");
        const data = [{ email: "john.doe@example.com" }, { email: "support@mydevtools.tech" }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t("sheets.template"));
        await downloadWorkbook(wb, "email_validation_template.xlsx");
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "VALID": return "bg-success/[0.12] text-success border-transparent";
            case "DISPOSABLE": return "bg-warning/[0.12] text-warning border-transparent";
            case "INVALID": return "bg-destructive/[0.12] text-destructive border-transparent";
            default: return "bg-foreground/[0.06] text-muted-foreground border-transparent";
        }
    };

    const ValidationItem = ({ label, value, isWarning = false, warningCondition = false, tooltip }: {
        label: string;
        value: boolean;
        isWarning?: boolean;
        warningCondition?: boolean;
        tooltip?: string;
    }) => {
        const isActuallyWarning = isWarning && warningCondition;
        const content = (
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-help ${isActuallyWarning
                ? "bg-warning/[0.08] border-warning/25 text-warning"
                : "bg-muted/40 border-border"
                }`}>
                <span className="text-[13px] font-medium">{label}</span>
                {value ? (
                    <IconCircleCheck className={`h-4 w-4 ${isActuallyWarning ? "text-warning" : "text-success"}`} stroke={2} />
                ) : (
                    <IconCircleX className="h-4 w-4 text-destructive" stroke={2} />
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
        <ToolShell
            icon={IconMailCheck}
            title={t("header.title")}
            description={t("header.description")}
            offline={false}
            contentClassName="overflow-y-auto"
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                <div className="flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2 p-1">
                        <TabsTrigger value="single">{t("tabs.single")}</TabsTrigger>
                        <TabsTrigger value="bulk">{t("tabs.bulk")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="single" className="space-y-6 focus-visible:outline-none">
                    <div className={`mx-auto w-full max-w-2xl flex flex-col items-center text-center transition-all ${result ? "pt-2" : "pt-6 md:pt-10"}`}>
                        {!result && (
                            <IconMailCheck className="mb-4 h-8 w-8 text-muted-foreground/60" stroke={1.75} />
                        )}
                        <h2 className={`font-semibold tracking-[-0.01em] ${result ? "text-[15px]" : "text-xl"}`}>{t("single.cardTitle")}</h2>
                        <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">{t("single.cardDescription")}</p>
                        <div className="mt-6 flex w-full gap-3">
                            <div className="relative flex-1">
                                <Input
                                    type="email"
                                    placeholder={t("single.placeholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                                    className={`h-10 pr-10 ${isValidFormat === false ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : isValidFormat === true ? "border-success focus-visible:border-success focus-visible:ring-success/20" : ""}`}
                                    autoFocus
                                />
                                {email && (
                                    <button
                                        onClick={handleClear}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-foreground/[0.05] transition-colors"
                                        aria-label={t("single.clearAria")}
                                    >
                                        <IconX className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                            <Button onClick={handleValidate} disabled={loading || !email || isValidFormat === false} className="h-10 px-5">
                                {loading ? <IconLoader2 className="h-4 w-4 animate-spin mr-2" /> : <IconCheck className="h-4 w-4 mr-2" />}
                                {loading ? t("single.validating") : t("single.validate")}
                            </Button>
                        </div>
                        {isValidFormat === false && (
                            <p className="mt-2 text-[13px] text-destructive">{t("single.formatError")}</p>
                        )}
                        {!result && (
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
                                {[
                                    t("validation.syntaxLabel"),
                                    t("validation.domainLabel"),
                                    t("validation.mxLabel"),
                                    t("validation.mailboxLabel"),
                                    t("validation.disposableLabel"),
                                    t("validation.roleBasedLabel"),
                                ].map((label) => (
                                    <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 py-1 text-xs text-muted-foreground">
                                        <IconCircleCheck className="h-3.5 w-3.5 text-muted-foreground/70" stroke={2} />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {result.validations.is_disposable && (
                                <Alert variant="destructive" className="bg-warning/10 border-warning/25 text-warning">
                                    <IconAlertCircle className="h-4 w-4 !text-warning" />
                                    <AlertTitle className="font-semibold flex items-center gap-2 text-sm">
                                        {t("disposableAlert.title")}
                                    </AlertTitle>
                                    <AlertDescription className="opacity-90">
                                        {t("disposableAlert.description")}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-4 md:grid-cols-12">
                                <div className="col-span-12 md:col-span-4 h-full flex flex-col rounded-xl border border-border bg-card shadow-elev-1">
                                    <div className="p-6 pb-0">
                                        <h3 className="text-[13px] font-semibold text-center text-muted-foreground">{t("score.reliabilityTitle")}</h3>
                                    </div>
                                    <div className="flex flex-col items-center justify-center flex-1 p-6 pt-4 pb-8">
                                        <div className="relative flex items-center justify-center">
                                            {/* Simple SVG Circular Progress */}
                                            <svg className="h-40 w-40 transform -rotate-90">
                                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted" />
                                                <circle
                                                    cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                                                    strokeDasharray={440}
                                                    strokeDashoffset={440 - (440 * result.score) / 100}
                                                    className={`transition-all duration-500 ease-out ${result.score > 80 ? 'text-success' : result.score > 50 ? 'text-warning' : 'text-destructive'}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-semibold tracking-[-0.02em] tabular-nums">{result.score}</span>
                                                <span className="text-xs font-medium text-muted-foreground">{t("score.scoreLabel")}</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex flex-col items-center gap-2">
                                            <Badge variant="outline" className={`px-3 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
                                                {result.status}
                                            </Badge>
                                            <div className="flex items-center gap-2 group">
                                                <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{result.email}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                                onClick={() => copyToClipboard(result.email, t("copy.emailCopied"))}
                                                            >
                                                                <IconCopy className={`h-3.5 w-3.5 ${isCopied ? "text-success" : ""}`} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t("copy.copyTooltip")}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-8 h-full rounded-xl border border-border bg-card shadow-elev-1">
                                    <div className="p-6 pb-0">
                                        <h3 className="text-[13px] font-semibold">{t("details.sectionTitle")}</h3>
                                    </div>
                                    <div className="p-6 pt-4">
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
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </TabsContent>

                <TabsContent value="bulk" className="space-y-4 focus-visible:outline-none">
                    {!bulkLoading && bulkResults.length === 0 && (
                        <div className={`rounded-xl border-2 border-dashed max-w-2xl mx-auto mt-6 md:mt-10 transition-colors ${dragActive ? "border-primary/50 bg-primary/[0.06]" : "border-border bg-muted/40"}`}>
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                onDragLeave={onDragLeave}
                            >
                                <IconUpload className={`mb-4 h-8 w-8 ${dragActive ? "text-primary" : "text-muted-foreground/60"}`} />
                                <h3 className="text-sm font-medium mb-1">
                                    {dragActive ? t("bulk.dropHere") : t("bulk.dragHere")}
                                </h3>
                                <p className="text-muted-foreground text-[13px] max-w-sm mb-6">
                                    {t("bulk.uploadHint")}
                                </p>
                                {uploadedFileName && (
                                    <div className="mb-4 px-3 py-1.5 bg-card border border-border rounded-md text-[13px]">
                                        <span className="text-muted-foreground">{t("bulk.filePrefix")} </span>
                                        <span className="font-medium">{uploadedFileName}</span>
                                    </div>
                                )}
                                <div className="flex gap-3 flex-wrap justify-center">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                                    <Button>
                                        {t("bulk.selectFile")}
                                    </Button>
                                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                                        <IconDownload className="mr-2 h-4 w-4" /> {t("bulk.downloadTemplate")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {bulkLoading && (
                        <div className="rounded-xl border border-border bg-card shadow-elev-1 max-w-2xl mx-auto p-8 text-center">
                            <div className="max-w-md mx-auto space-y-6">
                                <div className="flex flex-col items-center gap-3">
                                    <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <h3 className="text-[15px] font-semibold">{t("bulkLoading.title")}</h3>
                                    <p className="text-muted-foreground text-sm">{t("bulkLoading.batchProgress", { current: Math.ceil((progress / 100) * totalBatches) || 1, total: totalBatches || 1 })}</p>
                                </div>
                                <Progress value={progress} className="h-2 w-full" />
                            </div>
                        </div>
                    )}

                    {bulkResults.length > 0 && !bulkLoading && (
                        <div className="space-y-4">
                            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                                <div className="rounded-xl border border-border bg-card shadow-elev-1 p-4 flex flex-col justify-between gap-1">
                                    <span className="text-[13px] font-medium text-muted-foreground">{t("stats.totalProcessed")}</span>
                                    <span className="text-2xl font-semibold tabular-nums">{bulkStats.total}</span>
                                </div>
                                <div className="rounded-xl border border-border bg-card shadow-elev-1 p-4 flex flex-col justify-between gap-1">
                                    <span className="text-[13px] font-medium text-muted-foreground">{t("stats.valid")}</span>
                                    <span className="text-2xl font-semibold tabular-nums text-success">{bulkStats.valid}</span>
                                </div>
                                <div className="rounded-xl border border-border bg-card shadow-elev-1 p-4 flex flex-col justify-between gap-1">
                                    <span className="text-[13px] font-medium text-muted-foreground">{t("stats.risky")}</span>
                                    <span className="text-2xl font-semibold tabular-nums text-warning">{bulkStats.risky}</span>
                                </div>
                                <div className="rounded-xl border border-border bg-card shadow-elev-1 p-4 flex flex-col justify-between gap-1">
                                    <span className="text-[13px] font-medium text-muted-foreground">{t("stats.invalid")}</span>
                                    <span className="text-2xl font-semibold tabular-nums text-destructive">{bulkStats.invalid}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card shadow-elev-1 overflow-hidden">
                                <div className="px-4 py-3 border-b border-border">
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        <h3 className="text-[13px] font-semibold">{t("results.detailedTitle")}</h3>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:flex-initial sm:w-64">
                                                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder={t("results.searchPlaceholder")}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-8 h-8 text-[13px]"
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
                                                        <IconCircleCheck className="mr-2 h-4 w-4 text-success" /> {t("results.exportValid", { count: bulkStats.valid })}
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
                                        <p className="text-xs text-muted-foreground tabular-nums mt-2">
                                            {t("showingResults", { shown: filteredBulkResults.length, total: bulkResults.length })}
                                        </p>
                                    )}
                                </div>
                                <div className="max-h-[500px] overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted z-10">
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
                                                        <TableCell className="font-mono text-xs">{r.email}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`capitalize ${getStatusColor(r.status)}`}>
                                                                {r.status.toLowerCase().replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`font-medium tabular-nums ${r.score > 80 ? "text-success" : r.score > 50 ? "text-warning" : "text-destructive"}`}>
                                                                {r.score}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex justify-center gap-1.5 cursor-help">
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.syntax ? "bg-success" : "bg-destructive"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.domain_exists ? "bg-success" : "bg-destructive"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.mx_records ? "bg-success" : "bg-destructive"}`} />
                                                                            <div className={`h-2 w-2 rounded-full ${r.validations.mailbox_exists ? "bg-success" : "bg-destructive"}`} />
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
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </ToolShell>
    );
}
