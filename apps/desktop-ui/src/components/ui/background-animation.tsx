"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BackgroundAnimationProps {
    className?: string;
}

export function BackgroundAnimation({ className }: BackgroundAnimationProps) {
    return (
        <div className={cn("absolute inset-0 -z-10 h-full w-full bg-background overflow-hidden", className)}>
            {/* Fine Dot Grid Pattern */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.15) 1px, transparent 1px)`,
                    backgroundSize: '32px 32px'
                }}
            />

            {/* Large Animated Gradient Blurs - Optimized for mobile */}
            <div className="absolute top-0 left-1/4 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full bg-primary/40 opacity-40 blur-[100px] md:blur-[120px] animate-float" />
            <div className="absolute top-1/4 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-blue-500/30 opacity-40 blur-[80px] md:blur-[100px] animate-float-delayed" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[450px] md:w-[700px] h-[450px] md:h-[700px] rounded-full bg-purple-500/25 opacity-50 blur-[90px] md:blur-[110px] animate-pulse-glow" />
        </div>
    );
}
