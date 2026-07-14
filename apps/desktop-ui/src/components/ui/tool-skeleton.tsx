import { Skeleton } from "./skeleton"

export function ToolSkeleton() {
  return (
    <div className="w-full space-y-6 py-6">
      <div className="space-y-8">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
  )
}
