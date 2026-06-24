import { cn } from "@/lib/utils"
import {
    IconFile,
    IconFileTypePdf,
    IconFileTypeZip,
    IconFileTypeCsv,
    IconFileTypeDoc,
    IconFileCode,
    IconPhoto,
    IconVideo,
    IconMusic,
} from "@tabler/icons-react"
import { TYPE_ICON_COLOR } from "./file-types"

export function FileIconComp({ type, className }: { type: string; className?: string }) {
    const c = cn(TYPE_ICON_COLOR[type] ?? "text-slate-400", className)
    switch (type) {
        case "image":   return <IconPhoto className={c} />
        case "video":   return <IconVideo className={c} />
        case "audio":   return <IconMusic className={c} />
        case "pdf":     return <IconFileTypePdf className={c} />
        case "archive": return <IconFileTypeZip className={c} />
        case "code":    return <IconFileCode className={c} />
        case "doc":     return <IconFileTypeDoc className={c} />
        case "sheet":   return <IconFileTypeCsv className={c} />
        default:        return <IconFile className={c} />
    }
}
