"use client";

import React from "react";
import { SearchMode } from "./types";

interface HighlightedKeyTextProps {
    text: string;
    indices: number[];
    mode: SearchMode;
}

export function HighlightedKeyText({ text, indices, mode }: HighlightedKeyTextProps) {
    if (indices.length === 0) return <span>{text}</span>;

    if (mode === "fuzzy") {
        const indexSet = new Set(indices);
        const chars = text.split("");
        const elements: React.ReactNode[] = [];

        chars.forEach((char, i) => {
            if (indexSet.has(i)) {
                elements.push(
                    <span key={i} className="bg-yellow-200/50 dark:bg-yellow-900/50">
                        {char}
                    </span>
                );
            } else {
                elements.push(char);
            }
        });

        return <span>{elements}</span>;
    } else {
        const start = indices[0] ?? 0;
        const end = indices[1] ?? text.length;

        return (
            <span>
                {text.slice(0, start)}
                <span className="bg-blue-200/50 dark:bg-blue-900/50">
                    {text.slice(start, end)}
                </span>
                {text.slice(end)}
            </span>
        );
    }
}
