import {
    Clock,
    TrendingUp,
    CheckCircle2,
    Flame,
    AlertCircle,
    Zap,
    LucideIcon
} from "lucide-react";
import { TaskStatus, TaskPriority } from "../types/Task";

export interface StatusConfig {
    id: TaskStatus;
    label: string;
    icon: LucideIcon;
    color: string; // Main color for text/icons
    bgColor: string; // Background color for badges/cards
    borderColor: string; // Border color
    iconBg: string; // Background for icon containers
    description: string;
}

export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
    "not-started": {
        id: "not-started",
        label: "Not Started",
        icon: Clock,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50/50 dark:bg-blue-950/30",
        borderColor: "border-blue-200/50 dark:border-blue-800/50",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
        description: "Tasks that haven't been started yet"
    },
    "ongoing": {
        id: "ongoing",
        label: "Ongoing",
        icon: TrendingUp,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50/50 dark:bg-orange-950/30",
        borderColor: "border-orange-200/50 dark:border-orange-800/50",
        iconBg: "bg-orange-100 dark:bg-orange-900/50",
        description: "Tasks currently in progress"
    },
    "completed": {
        id: "completed",
        label: "Completed",
        icon: CheckCircle2,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50/50 dark:bg-green-950/30",
        borderColor: "border-green-200/50 dark:border-green-800/50",
        iconBg: "bg-green-100 dark:bg-green-900/50",
        description: "Tasks that are finished"
    }
};

export interface PriorityConfig {
    id: TaskPriority;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
    high: {
        id: "high",
        label: "High",
        icon: Flame,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200/50 dark:border-red-800/50"
    },
    medium: {
        id: "medium",
        label: "Medium",
        icon: AlertCircle,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200/50 dark:border-orange-800/50"
    },
    low: {
        id: "low",
        label: "Low",
        icon: Zap,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200/50 dark:border-blue-800/50"
    }
};
