"use client";

import { DbType } from "./types";
import { cn } from "@/lib/utils";

// Simple coloured SVG badges for each DB type
const PgIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#336791" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">PG</text>
    </svg>
);

const MySQLIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#00758F" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">SQL</text>
    </svg>
);

const MariaIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#C0765A" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">MDB</text>
    </svg>
);

export function DbIcon({ type, className }: { type: DbType; className?: string }) {
    if (type === "postgresql") return <PgIcon className={cn("rounded", className)} />;
    if (type === "mysql") return <MySQLIcon className={cn("rounded", className)} />;
    return <MariaIcon className={cn("rounded", className)} />;
}

export function dbTypeLabel(type: DbType): string {
    const labels: Record<DbType, string> = {
        postgresql: "PostgreSQL",
        mysql: "MySQL",
        mariadb: "MariaDB",
    };
    return labels[type] ?? type;
}
