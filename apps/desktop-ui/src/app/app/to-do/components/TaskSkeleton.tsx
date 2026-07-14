export default function TaskSkeleton() {
  return (
    <li
      className="relative mb-3 p-3 md:p-4 rounded-2xl border border-muted-foreground/10 bg-card animate-pulse"
      aria-hidden
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="h-11 w-11 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-[60%] rounded bg-muted" />
          <div className="h-3 w-[85%] rounded bg-muted/80" />
          <div className="flex items-center gap-1.5 pt-1">
            <div className="h-5 w-14 rounded-md bg-muted/70" />
            <div className="h-5 w-12 rounded-md bg-muted/70" />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="h-8 w-[130px] rounded-md bg-muted/70" />
        </div>
      </div>
    </li>
  );
}

export function TaskSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-3" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </ul>
  );
}
