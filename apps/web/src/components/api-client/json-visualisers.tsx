"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

/* ── Tree view ───────────────────────────────────────────────────────────── */

interface TreeNodeProps {
    name: string | number
    value: unknown
    depth: number
}

function TreeNode({ name, value, depth }: TreeNodeProps) {
    const [open, setOpen] = React.useState(depth < 2)
    if (value === null || value === undefined) {
        return <Leaf name={name} text="null" tone="text-muted-foreground" depth={depth} />
    }
    if (typeof value === "boolean") {
        return <Leaf name={name} text={String(value)} tone="text-amber-600" depth={depth} />
    }
    if (typeof value === "number") {
        return <Leaf name={name} text={String(value)} tone="text-sky-500" depth={depth} />
    }
    if (typeof value === "string") {
        return <Leaf name={name} text={JSON.stringify(value)} tone="text-emerald-600" depth={depth} />
    }
    const isArr = Array.isArray(value)
    const entries = isArr ? value.map((v, i) => [i, v] as const) : Object.entries(value as Record<string, unknown>)
    return (
        <div className="text-xs font-mono" style={{ paddingLeft: depth * 12 }}>
            <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 hover:bg-muted/40 rounded px-1">
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="font-bold">{name}</span>
                <span className="text-muted-foreground">: {isArr ? "[" : "{"}{entries.length}{isArr ? "]" : "}"}</span>
            </button>
            {open && entries.map(([k, v]) => (
                <TreeNode key={String(k)} name={k} value={v} depth={depth + 1} />
            ))}
        </div>
    )
}

function Leaf({ name, text, tone, depth }: { name: string | number; text: string; tone: string; depth: number }) {
    return (
        <div className="text-xs font-mono" style={{ paddingLeft: depth * 12 + 16 }}>
            <span className="font-bold">{name}</span>
            <span className="text-muted-foreground">: </span>
            <span className={tone}>{text}</span>
        </div>
    )
}

export function JsonTreeView({ data }: { data: unknown }) {
    if (data === undefined || data === null) {
        return <div className="text-xs text-muted-foreground p-2">No data</div>
    }
    return (
        <div className="p-2 overflow-auto">
            <TreeNode name="$" value={data} depth={0} />
        </div>
    )
}

/* ── Table view ─────────────────────────────────────────────────────────── */

export function JsonTableView({ rows }: { rows: unknown }) {
    const cols = React.useMemo(() => {
        if (!Array.isArray(rows) || rows.length === 0) return []
        const colSet = new Set<string>()
        for (const r of rows) {
            if (r && typeof r === "object" && !Array.isArray(r)) {
                for (const k of Object.keys(r as Record<string, unknown>)) colSet.add(k)
            }
        }
        return Array.from(colSet)
    }, [rows])
    if (!Array.isArray(rows) || rows.length === 0) {
        return <div className="text-xs text-muted-foreground p-2">Array of objects required.</div>
    }
    if (cols.length === 0) {
        return <div className="text-xs text-muted-foreground p-2">Not a tabular shape.</div>
    }
    return (
        <div className="overflow-auto text-xs font-mono">
            <table className="border-collapse w-full">
                <thead>
                    <tr>
                        {cols.map((c) => (
                            <th key={c} className="text-left border-b sticky top-0 bg-card px-2 py-1 font-bold uppercase tracking-wider text-[10px]">
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className={cn(i % 2 === 0 ? "" : "bg-muted/20")}>
                            {cols.map((c) => {
                                const v = (r && typeof r === "object" ? (r as Record<string, unknown>)[c] : undefined)
                                return (
                                    <td key={c} className="border-b border-border/30 px-2 py-1 align-top">
                                        {v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/* ── Geo view ───────────────────────────────────────────────────────────── */

interface Point { lat: number; lng: number; label?: string }

function extractPoints(value: unknown): Point[] {
    const out: Point[] = []
    const walk = (v: unknown): void => {
        if (!v || typeof v !== "object") return
        if (Array.isArray(v)) { for (const x of v) walk(x); return }
        const obj = v as Record<string, unknown>
        const lat = pickNum(obj, ["lat", "latitude", "y"])
        const lng = pickNum(obj, ["lng", "lon", "longitude", "x"])
        if (lat !== null && lng !== null) {
            const label = typeof obj.name === "string" ? obj.name : typeof obj.label === "string" ? obj.label : undefined
            out.push({ lat, lng, label })
        }
        for (const val of Object.values(obj)) walk(val)
    }
    walk(value)
    return out
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
    for (const k of keys) {
        const v = obj[k]
        if (typeof v === "number") return v
    }
    return null
}

export function JsonGeoView({ data }: { data: unknown }) {
    const points = React.useMemo(() => extractPoints(data), [data])
    if (points.length === 0) {
        return <div className="text-xs text-muted-foreground p-2">No lat/lng pairs detected.</div>
    }
    const w = 720, h = 360
    const padding = 16
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    const latMin = Math.min(...lats), latMax = Math.max(...lats)
    const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs)
    const x = (lng: number) => padding + ((lng - lngMin) / Math.max(0.0001, lngMax - lngMin)) * (w - padding * 2)
    const y = (lat: number) => h - padding - ((lat - latMin) / Math.max(0.0001, latMax - latMin)) * (h - padding * 2)
    return (
        <div className="p-2">
            <div className="text-[10px] text-muted-foreground mb-1">
                {points.length} point{points.length === 1 ? "" : "s"} · lat {latMin.toFixed(3)}…{latMax.toFixed(3)} · lng {lngMin.toFixed(3)}…{lngMax.toFixed(3)}
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-[360px] border rounded bg-muted/20">
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={x(p.lng)} cy={y(p.lat)} r={3} fill="hsl(var(--primary))" />
                        {p.label && (
                            <text x={x(p.lng) + 5} y={y(p.lat) - 4} fontSize="9" className="fill-foreground">
                                {p.label}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    )
}
