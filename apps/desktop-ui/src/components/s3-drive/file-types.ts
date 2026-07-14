const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif", "bmp", "ico"]
const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"]
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "aac", "m4a"]
const ARCHIVE_EXTS = ["zip", "tar", "gz", "bz2", "7z", "rar", "xz"]
const CODE_EXTS = ["js", "ts", "tsx", "jsx", "py", "go", "rs", "rb", "java", "c", "cpp", "h", "cs", "php", "sh", "yaml", "yml", "toml", "json", "xml", "html", "css", "scss", "sql"]
const DOC_EXTS = ["doc", "docx", "txt", "md", "rtf", "odt"]
const SHEET_EXTS = ["xls", "xlsx", "csv", "ods"]

export function getFileType(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    if (IMAGE_EXTS.includes(ext)) return "image"
    if (VIDEO_EXTS.includes(ext)) return "video"
    if (AUDIO_EXTS.includes(ext)) return "audio"
    if (ext === "pdf") return "pdf"
    if (ARCHIVE_EXTS.includes(ext)) return "archive"
    if (CODE_EXTS.includes(ext)) return "code"
    if (DOC_EXTS.includes(ext)) return "doc"
    if (SHEET_EXTS.includes(ext)) return "sheet"
    return "file"
}

export function isPreviewable(type: string): boolean {
    return ["image", "pdf", "code", "doc", "video", "audio"].includes(type)
}

export const TYPE_ICON_COLOR: Record<string, string> = {
    image: "text-emerald-500", video: "text-purple-500", audio: "text-blue-500",
    pdf: "text-red-500", archive: "text-orange-500", code: "text-sky-500",
    doc: "text-indigo-400", sheet: "text-green-600", file: "text-slate-400",
}
export const TYPE_BG_CLASS: Record<string, string> = {
    image:   "bg-emerald-500/10",
    video:   "bg-purple-500/10",
    audio:   "bg-blue-500/10",
    pdf:     "bg-red-500/10",
    archive: "bg-orange-500/10",
    code:    "bg-sky-500/10",
    doc:     "bg-indigo-400/10",
    sheet:   "bg-green-600/10",
    file:    "bg-slate-100 dark:bg-slate-800",
}
export const TYPE_LABEL: Record<string, string> = {
    image: "Image", video: "Video", audio: "Audio", pdf: "PDF",
    archive: "Archive", code: "Code", doc: "Document", sheet: "Spreadsheet", file: "File",
}
