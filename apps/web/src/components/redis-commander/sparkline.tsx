"use client";

/** Tiny inline-SVG sparkline. ponytail: no chart lib needed for 20-point ticks. */
export function Sparkline({
    points,
    width = 120,
    height = 32,
    color = "currentColor",
}: {
    points: number[];
    width?: number;
    height?: number;
    color?: string;
}) {
    if (points.length === 0) {
        return <svg width={width} height={height} className="text-muted-foreground/30" />;
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const step = width / Math.max(points.length - 1, 1);
    const d = points
        .map((p, i) => {
            const x = i * step;
            const y = height - ((p - min) / range) * height;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
